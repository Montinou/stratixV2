'use server';

import { withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles } from '@/db/okr-schema';
import { eq, and, lte, gte, sql, desc } from 'drizzle-orm';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { sendSmartReminderEmail } from '@/lib/services/brevo/okr-templates';

/**
 * Smart Reminders - Recordatorios inteligentes basados en comportamiento de OKRs
 *
 * Feature flag: FEATURE_AI_SMART_REMINDERS
 */

export interface ReminderResult {
  companyId: string;
  reminders: {
    staleObjectives: number;
    upcomingDeadlines: number;
    completionCelebrations: number;
  };
}

export class SmartReminders {
  /**
   * Procesa recordatorios para una empresa
   */
  static async processCompanyReminders(companyId: string): Promise<ReminderResult> {
    if (!isFeatureEnabled('AI_SMART_REMINDERS')) {
      throw new Error('AI Smart Reminders is disabled. Enable with FEATURE_AI_SMART_REMINDERS=true');
    }

    console.log(`[Smart Reminders] Processing reminders for company: ${companyId}`);

    const result: ReminderResult = {
      companyId,
      reminders: {
        staleObjectives: 0,
        upcomingDeadlines: 0,
        completionCelebrations: 0,
      },
    };

    // Procesar en paralelo
    const [staleResults, deadlineResults, celebrationResults] = await Promise.all([
      this.processStaleObjectiveReminders(companyId),
      this.processUpcomingDeadlineReminders(companyId),
      this.processCompletionCelebrations(companyId),
    ]);

    result.reminders.staleObjectives = staleResults;
    result.reminders.upcomingDeadlines = deadlineResults;
    result.reminders.completionCelebrations = celebrationResults;

    console.log(`[Smart Reminders] Results for ${companyId}:`, result.reminders);

    return result;
  }

  /**
   * Recordatorio: Objetivos sin updates en 7 días
   */
  private static async processStaleObjectiveReminders(companyId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleObjectives = await withRLSContext('system', async (db) => {
      return await db.query.objectives.findMany({
        where: and(
          eq(objectives.companyId, companyId),
          eq(objectives.status, 'in_progress'),
          lte(objectives.updatedAt, sevenDaysAgo)
        ),
        with: {
          owner: true,
        },
        limit: 10, // Límite para evitar spam
      });
    });

    let sent = 0;

    for (const objective of staleObjectives) {
      if (!objective.owner?.email) continue;

      try {
        await sendSmartReminderEmail({
          to: objective.owner.email,
          ownerName: objective.owner.fullName || 'Usuario',
          objectiveTitle: objective.title,
          objectiveProgress: objective.progress || 0,
          reminderType: 'stale_objective',
          daysSinceUpdate: 7,
          objectiveId: objective.id,
          companyId,
        });

        sent++;
      } catch (error) {
        console.error(`[Smart Reminders] Error sending stale reminder:`, error);
      }
    }

    return sent;
  }

  /**
   * Recordatorio: Deadlines próximos (3 días antes)
   */
  private static async processUpcomingDeadlineReminders(companyId: string): Promise<number> {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingDeadlines = await withRLSContext('system', async (db) => {
      return await db.query.objectives.findMany({
        where: and(
          eq(objectives.companyId, companyId),
          eq(objectives.status, 'in_progress'),
          lte(objectives.endDate, threeDaysFromNow),
          gte(objectives.endDate, today)
        ),
        with: {
          owner: true,
        },
        limit: 10,
      });
    });

    let sent = 0;

    for (const objective of upcomingDeadlines) {
      if (!objective.owner?.email) continue;

      const daysRemaining = Math.ceil(
        (objective.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        await sendSmartReminderEmail({
          to: objective.owner.email,
          ownerName: objective.owner.fullName || 'Usuario',
          objectiveTitle: objective.title,
          objectiveProgress: objective.progress || 0,
          reminderType: 'upcoming_deadline',
          daysRemaining,
          objectiveId: objective.id,
          companyId,
        });

        sent++;
      } catch (error) {
        console.error(`[Smart Reminders] Error sending deadline reminder:`, error);
      }
    }

    return sent;
  }

  /**
   * Celebración: Objetivos completados recientemente
   */
  private static async processCompletionCelebrations(companyId: string): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const completedObjectives = await withRLSContext('system', async (db) => {
      return await db.query.objectives.findMany({
        where: and(
          eq(objectives.companyId, companyId),
          eq(objectives.status, 'completed'),
          gte(objectives.updatedAt, yesterday),
          lte(objectives.updatedAt, today)
        ),
        with: {
          owner: true,
        },
        limit: 5,
      });
    });

    let sent = 0;

    for (const objective of completedObjectives) {
      if (!objective.owner?.email) continue;

      try {
        await sendSmartReminderEmail({
          to: objective.owner.email,
          ownerName: objective.owner.fullName || 'Usuario',
          objectiveTitle: objective.title,
          objectiveProgress: 100,
          reminderType: 'completion_celebration',
          objectiveId: objective.id,
          companyId,
        });

        sent++;
      } catch (error) {
        console.error(`[Smart Reminders] Error sending celebration email:`, error);
      }
    }

    return sent;
  }

  /**
   * Procesa recordatorios para todas las empresas
   */
  static async processAllCompanies(): Promise<ReminderResult[]> {
    const allCompanies = await withRLSContext('system', async (db) => {
      return await db.query.companies.findMany();
    });

    const results: ReminderResult[] = [];

    for (const company of allCompanies) {
      try {
        const result = await this.processCompanyReminders(company.id);
        results.push(result);
      } catch (error) {
        console.error(`[Smart Reminders] Error processing company ${company.name}:`, error);
      }
    }

    return results;
  }
}
