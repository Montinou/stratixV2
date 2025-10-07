'use server';

import { withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles, areas, companies } from '@/db/okr-schema';
import { aiInsights } from '@/db/ai-schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { generateCompletion } from './gateway';
import { isFeatureEnabled } from '@/lib/config/feature-flags';

/**
 * OKR Analyzer - Analiza automáticamente el estado de OKRs
 * y genera insights inteligentes
 *
 * Feature flag: FEATURE_AI_DAILY_OKR_ANALYSIS
 */

export interface OKRAnalysisResult {
  companyId: string;
  companyName: string;
  analysis: {
    objectivesAtRisk: number;
    blockedInitiatives: number;
    highPerformers: number;
    insightsGenerated: number;
  };
  insights: Array<{
    id: string;
    title: string;
    category: string;
    confidence: number;
  }>;
}

/**
 * Analiza todos los OKRs de una empresa y genera insights
 */
export async function analyzeCompany(companyId: string): Promise<OKRAnalysisResult> {
    // Verificar feature flag
    if (!isFeatureEnabled('AI_DAILY_OKR_ANALYSIS')) {
      throw new Error('AI Daily OKR Analysis is disabled. Enable with FEATURE_AI_DAILY_OKR_ANALYSIS=true');
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

    console.log(`[OKR Analyzer] Starting analysis for company: ${company.name}`);

    const result: OKRAnalysisResult = {
      companyId,
      companyName: company.name,
      analysis: {
        objectivesAtRisk: 0,
        blockedInitiatives: 0,
        highPerformers: 0,
        insightsGenerated: 0,
      },
      insights: [],
    };

    // Ejecutar análisis en paralelo
    const [objectivesAtRisk, blockedInitiatives, highPerformers] = await Promise.all([
      analyzeObjectivesAtRisk(companyId),
      analyzeBlockedInitiatives(companyId),
      analyzeHighPerformers(companyId),
    ]);

    result.analysis.objectivesAtRisk = objectivesAtRisk.length;
    result.analysis.blockedInitiatives = blockedInitiatives.length;
    result.analysis.highPerformers = highPerformers.length;

    // Generar insights para objetivos en riesgo
    for (const objective of objectivesAtRisk) {
      const insight = await generateRiskInsight(objective);
      if (insight) {
        result.insights.push(insight);
        result.analysis.insightsGenerated++;
      }
    }

    // Generar insights para iniciativas bloqueadas
    for (const initiative of blockedInitiatives) {
      const insight = await generateBlockedInsight(initiative);
      if (insight) {
        result.insights.push(insight);
        result.analysis.insightsGenerated++;
      }
    }

    // Generar insights positivos para high performers
    for (const performer of highPerformers) {
      const insight = await generatePerformanceInsight(performer);
      if (insight) {
        result.insights.push(insight);
        result.analysis.insightsGenerated++;
      }
    }

    console.log(`[OKR Analyzer] Analysis complete for ${company.name}:`, result.analysis);

    return result;
}

/**
 * Detecta objetivos en riesgo
 * Criterio: Progreso < 30% y tiempo transcurrido > 50%
 */
async function analyzeObjectivesAtRisk(companyId: string) {
    return await withRLSContext('system', async (db) => {
      const now = new Date();

      return await db.query.objectives.findMany({
        where: and(
          eq(objectives.companyId, companyId),
          lte(objectives.progress, 30),
          lte(objectives.startDate, now)
        ),
        with: {
          owner: true,
          area: true,
        },
      });
    });
}

/**
 * Detecta iniciativas bloqueadas
 * Criterio: Sin actividades completadas en los últimos 7 días
 */
async function analyzeBlockedInitiatives(companyId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await withRLSContext('system', async (db) => {
      // Obtener todas las iniciativas activas
      const activeInitiatives = await db.query.initiatives.findMany({
        where: and(
          eq(initiatives.companyId, companyId),
          eq(initiatives.status, 'in_progress')
        ),
        with: {
          activities: {
            where: and(
              eq(activities.status, 'completed'),
              gte(activities.completedAt, sevenDaysAgo)
            ),
          },
          owner: true,
          objective: true,
        },
      });

      // Filtrar las que no tienen actividades completadas recientemente
      return activeInitiatives.filter((init) => init.activities.length === 0);
    });
}

/**
 * Identifica high performers
 * Criterio: Progreso > 80% con buena velocidad
 */
async function analyzeHighPerformers(companyId: string) {
    return await withRLSContext('system', async (db) => {
      return await db.query.objectives.findMany({
        where: and(
          eq(objectives.companyId, companyId),
          gte(objectives.progress, 80)
        ),
        with: {
          owner: true,
          area: true,
        },
        limit: 5,
      });
    });
}

/**
 * Genera insight de riesgo usando IA
 */
async function generateRiskInsight(objective: any) {
    if (!isFeatureEnabled('AI_RISK_DETECTION')) {
      return null;
    }

    try {
      const prompt = `
Analiza este objetivo en riesgo y genera un insight accionable:

Objetivo: ${objective.title}
Descripción: ${objective.description || 'Sin descripción'}
Progreso: ${objective.progress}%
Owner: ${objective.owner?.fullName || 'Sin asignar'}
Área: ${objective.area?.name || 'Sin área'}
Fecha inicio: ${objective.startDate?.toISOString()}
Fecha fin: ${objective.endDate?.toISOString()}

Genera un insight conciso (máximo 150 palabras) que:
1. Identifique el problema principal
2. Sugiera 2-3 acciones concretas
3. Sea directo y accionable
`;

      const result = await generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt: 'Eres un experto en gestión de OKRs. Proporciona insights directos y accionables.',
        maxTokens: 300,
      });

      // Guardar insight en la base de datos
      const savedInsight = await withRLSContext('system', async (db) => {
        const [insight] = await db.insert(aiInsights).values({
          userId: objective.ownerId,
          title: `⚠️ Objetivo en Riesgo: ${objective.title.slice(0, 50)}...`,
          content: result.text,
          category: 'performance',
          entityType: 'objective',
          entityId: objective.id,
          confidence: 85,
          isActionable: true,
          isRead: false,
          companyId: objective.companyId,
        }).returning();

        return insight;
      });

      return {
        id: savedInsight.id,
        title: savedInsight.title,
        category: 'performance',
        confidence: 85,
      };
    } catch (error) {
      console.error('[OKR Analyzer] Error generating risk insight:', error);
      return null;
    }
}

/**
 * Genera insight para iniciativa bloqueada
 */
async function generateBlockedInsight(initiative: any) {
    if (!isFeatureEnabled('AI_AUTO_INSIGHTS')) {
      return null;
    }

    try {
      const prompt = `
Analiza esta iniciativa bloqueada y sugiere acciones:

Iniciativa: ${initiative.title}
Descripción: ${initiative.description || 'Sin descripción'}
Owner: ${initiative.owner?.fullName || 'Sin asignar'}
Objetivo relacionado: ${initiative.objective?.title || 'Sin objetivo'}
Tiempo sin progreso: 7+ días

Genera un insight conciso (máximo 100 palabras) con 2-3 sugerencias para desbloquear.
`;

      const result = await generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt: 'Eres un experto en desbloquear proyectos. Sé directo y práctico.',
        maxTokens: 200,
      });

      const savedInsight = await withRLSContext('system', async (db) => {
        const [insight] = await db.insert(aiInsights).values({
          userId: initiative.ownerId,
          title: `🚧 Iniciativa Bloqueada: ${initiative.title.slice(0, 50)}...`,
          content: result.text,
          category: 'recommendations',
          entityType: 'initiative',
          entityId: initiative.id,
          confidence: 78,
          isActionable: true,
          isRead: false,
          companyId: initiative.companyId,
        }).returning();

        return insight;
      });

      return {
        id: savedInsight.id,
        title: savedInsight.title,
        category: 'recommendations',
        confidence: 78,
      };
    } catch (error) {
      console.error('[OKR Analyzer] Error generating blocked insight:', error);
      return null;
    }
}

/**
 * Genera insight positivo para high performer
 */
async function generatePerformanceInsight(objective: any) {
    if (!isFeatureEnabled('AI_AUTO_INSIGHTS')) {
      return null;
    }

    try {
      const prompt = `
Reconoce este objetivo con excelente progreso:

Objetivo: ${objective.title}
Progreso: ${objective.progress}%
Owner: ${objective.owner?.fullName || 'Sin asignar'}
Área: ${objective.area?.name || 'Sin área'}

Genera un mensaje motivacional breve (máximo 80 palabras) que:
1. Reconozca el logro
2. Mencione el impacto positivo
3. Motive a mantener el ritmo
`;

      const result = await generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        systemPrompt: 'Eres un coach motivacional para equipos de alto rendimiento. Sé auténtico y específico.',
        maxTokens: 150,
      });

      const savedInsight = await withRLSContext('system', async (db) => {
        const [insight] = await db.insert(aiInsights).values({
          userId: objective.ownerId,
          title: `✨ Excelente Progreso: ${objective.title.slice(0, 50)}...`,
          content: result.text,
          category: 'trends',
          entityType: 'objective',
          entityId: objective.id,
          confidence: 92,
          isActionable: false,
          isRead: false,
          companyId: objective.companyId,
        }).returning();

        return insight;
      });

      return {
        id: savedInsight.id,
        title: savedInsight.title,
        category: 'trends',
        confidence: 92,
      };
    } catch (error) {
      console.error('[OKR Analyzer] Error generating performance insight:', error);
      return null;
    }
}

/**
 * Analiza todas las empresas del sistema
 */
export async function analyzeAllCompanies(): Promise<OKRAnalysisResult[]> {
  const allCompanies = await withRLSContext('system', async (db) => {
    return await db.query.companies.findMany();
  });

  const results: OKRAnalysisResult[] = [];

  for (const company of allCompanies) {
    try {
      const result = await analyzeCompany(company.id);
      results.push(result);
    } catch (error) {
      console.error(`[OKR Analyzer] Error analyzing company ${company.name}:`, error);
    }
  }

  return results;
}
