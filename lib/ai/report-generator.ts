'use server';

import { withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles, areas, companies } from '@/db/okr-schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { AIGatewayService } from './gateway';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { sendWeeklyReportEmail } from '@/lib/services/brevo/okr-templates';

/**
 * Weekly Report Generator - Genera reportes semanales automáticos con IA
 *
 * Feature flag: FEATURE_AI_WEEKLY_REPORTS
 */

export interface WeeklyReportData {
  period: {
    start: Date;
    end: Date;
  };
  objectives: {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
  };
  initiatives: {
    total: number;
    completed: number;
    inProgress: number;
  };
  activities: {
    total: number;
    completed: number;
    completedThisWeek: number;
  };
  topPerformers: Array<{
    name: string;
    role: string;
    area: string;
    completedActivities: number;
  }>;
  areaPerformance: Array<{
    areaName: string;
    objectivesCount: number;
    avgProgress: number;
  }>;
}

export interface WeeklyReportResult {
  companyId: string;
  companyName: string;
  reportData: WeeklyReportData;
  aiSummary: string;
  reportSent: number;
}

export class WeeklyReportGenerator {
  /**
   * Genera reporte semanal para una empresa
   */
  static async generateCompanyReport(companyId: string): Promise<WeeklyReportResult> {
    if (!isFeatureEnabled('AI_WEEKLY_REPORTS')) {
      throw new Error('AI Weekly Reports is disabled. Enable with FEATURE_AI_WEEKLY_REPORTS=true');
    }

    // Obtener información de la empresa
    const company = await withRLSContext('system', async (db) => {
      return await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
      });
    });

    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    console.log(`[Weekly Report] Generating report for company: ${company.name}`);

    // Calcular periodo (última semana)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Recopilar datos en paralelo
    const [
      objectivesData,
      initiativesData,
      activitiesData,
      topPerformers,
      areaPerformance,
    ] = await Promise.all([
      this.getObjectivesData(companyId),
      this.getInitiativesData(companyId),
      this.getActivitiesData(companyId, startDate),
      this.getTopPerformers(companyId, startDate),
      this.getAreaPerformance(companyId),
    ]);

    const reportData: WeeklyReportData = {
      period: { start: startDate, end: endDate },
      objectives: objectivesData,
      initiatives: initiativesData,
      activities: activitiesData,
      topPerformers,
      areaPerformance,
    };

    // Generar resumen con IA
    const aiSummary = await this.generateAISummary(company.name, reportData);

    // Enviar reportes a stakeholders (corporativos y gerentes)
    const recipients = await this.getReportRecipients(companyId);
    let reportsSent = 0;

    for (const recipient of recipients) {
      try {
        await sendWeeklyReportEmail({
          to: recipient.email,
          recipientName: recipient.fullName || 'Usuario',
          companyName: company.name,
          reportData,
          aiSummary,
        });
        reportsSent++;
      } catch (error) {
        console.error(`[Weekly Report] Error sending report to ${recipient.email}:`, error);
      }
    }

    return {
      companyId,
      companyName: company.name,
      reportData,
      aiSummary,
      reportSent: reportsSent,
    };
  }

  /**
   * Obtiene estadísticas de objetivos
   */
  private static async getObjectivesData(companyId: string) {
    const allObjectives = await withRLSContext('system', async (db) => {
      return await db.query.objectives.findMany({
        where: eq(objectives.companyId, companyId),
      });
    });

    return {
      total: allObjectives.length,
      completed: allObjectives.filter((o) => o.status === 'completed').length,
      inProgress: allObjectives.filter((o) => o.status === 'in_progress').length,
      atRisk: allObjectives.filter((o) => o.progress < 30 && o.status === 'in_progress').length,
    };
  }

  /**
   * Obtiene estadísticas de iniciativas
   */
  private static async getInitiativesData(companyId: string) {
    const allInitiatives = await withRLSContext('system', async (db) => {
      return await db.query.initiatives.findMany({
        where: eq(initiatives.companyId, companyId),
      });
    });

    return {
      total: allInitiatives.length,
      completed: allInitiatives.filter((i) => i.status === 'completed').length,
      inProgress: allInitiatives.filter((i) => i.status === 'in_progress').length,
    };
  }

  /**
   * Obtiene estadísticas de actividades
   */
  private static async getActivitiesData(companyId: string, startDate: Date) {
    const allActivities = await withRLSContext('system', async (db) => {
      return await db.query.activities.findMany({
        where: eq(activities.companyId, companyId),
      });
    });

    const completedThisWeek = allActivities.filter(
      (a) => a.status === 'completed' && a.completedAt && a.completedAt >= startDate
    );

    return {
      total: allActivities.length,
      completed: allActivities.filter((a) => a.status === 'completed').length,
      completedThisWeek: completedThisWeek.length,
    };
  }

  /**
   * Identifica top performers de la semana
   */
  private static async getTopPerformers(companyId: string, startDate: Date) {
    const completedActivities = await withRLSContext('system', async (db) => {
      return await db.query.activities.findMany({
        where: and(
          eq(activities.companyId, companyId),
          eq(activities.status, 'completed'),
          gte(activities.completedAt, startDate)
        ),
        with: {
          owner: {
            with: {
              area: true,
            },
          },
        },
      });
    });

    // Agrupar por usuario
    const userStats = new Map<
      string,
      { name: string; role: string; area: string; count: number }
    >();

    for (const activity of completedActivities) {
      if (!activity.owner) continue;

      const userId = activity.ownerId;
      const existing = userStats.get(userId);

      if (existing) {
        existing.count++;
      } else {
        userStats.set(userId, {
          name: activity.owner.fullName || 'Unknown',
          role: activity.owner.role || 'empleado',
          area: activity.owner.area?.name || 'Sin área',
          count: 1,
        });
      }
    }

    // Ordenar y tomar top 5
    return Array.from(userStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((user) => ({
        name: user.name,
        role: user.role,
        area: user.area,
        completedActivities: user.count,
      }));
  }

  /**
   * Calcula performance por área
   */
  private static async getAreaPerformance(companyId: string) {
    const allAreas = await withRLSContext('system', async (db) => {
      return await db.query.areas.findMany({
        where: eq(areas.companyId, companyId),
        with: {
          objectives: true,
        },
      });
    });

    return allAreas
      .map((area) => {
        const avgProgress =
          area.objectives.length > 0
            ? area.objectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) /
              area.objectives.length
            : 0;

        return {
          areaName: area.name,
          objectivesCount: area.objectives.length,
          avgProgress: Math.round(avgProgress),
        };
      })
      .sort((a, b) => b.avgProgress - a.avgProgress);
  }

  /**
   * Genera resumen con IA
   */
  private static async generateAISummary(
    companyName: string,
    data: WeeklyReportData
  ): Promise<string> {
    const prompt = `
Genera un resumen ejecutivo semanal para ${companyName} basado en estos datos:

OBJETIVOS:
- Total: ${data.objectives.total}
- Completados: ${data.objectives.completed}
- En progreso: ${data.objectives.inProgress}
- En riesgo: ${data.objectives.atRisk}

INICIATIVAS:
- Total: ${data.initiatives.total}
- Completadas: ${data.initiatives.completed}
- En progreso: ${data.initiatives.inProgress}

ACTIVIDADES:
- Completadas esta semana: ${data.activities.completedThisWeek}
- Total completadas: ${data.activities.completed} de ${data.activities.total}

TOP PERFORMERS:
${data.topPerformers.map((p) => `- ${p.name} (${p.area}): ${p.completedActivities} actividades`).join('\n')}

PERFORMANCE POR ÁREA:
${data.areaPerformance.map((a) => `- ${a.areaName}: ${a.avgProgress}% progreso (${a.objectivesCount} objetivos)`).join('\n')}

Genera un resumen ejecutivo de 3 párrafos:
1. Estado general y highlights de la semana
2. Áreas de preocupación y oportunidades
3. Recomendaciones para la próxima semana

Sé conciso, específico y enfócate en insights accionables.
`;

    try {
      const result = await AIGatewayService.generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt:
          'Eres un analista de OKRs senior. Genera resúmenes ejecutivos claros y accionables.',
        maxTokens: 500,
      });

      return result.text;
    } catch (error) {
      console.error('[Weekly Report] Error generating AI summary:', error);
      return `Resumen no disponible. Los datos están disponibles en el reporte detallado.`;
    }
  }

  /**
   * Obtiene recipientes del reporte (corporativos y gerentes)
   */
  private static async getReportRecipients(companyId: string) {
    return await withRLSContext('system', async (db) => {
      return await db.query.profiles.findMany({
        where: and(eq(profiles.companyId, companyId)),
      });
    });
  }

  /**
   * Genera reportes para todas las empresas
   */
  static async generateAllCompanyReports(): Promise<WeeklyReportResult[]> {
    const allCompanies = await withRLSContext('system', async (db) => {
      return await db.query.companies.findMany();
    });

    const results: WeeklyReportResult[] = [];

    for (const company of allCompanies) {
      try {
        const result = await this.generateCompanyReport(company.id);
        results.push(result);
      } catch (error) {
        console.error(`[Weekly Report] Error generating report for ${company.name}:`, error);
      }
    }

    return results;
  }
}
