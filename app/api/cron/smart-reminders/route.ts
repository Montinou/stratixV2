import { NextRequest, NextResponse } from 'next/server';
import { processAllCompanies } from '@/lib/ai/smart-reminders';
import { isFeatureEnabled, logEnabledFeatures } from '@/lib/config/feature-flags';

/**
 * GET /api/cron/smart-reminders
 *
 * Recordatorios inteligentes de OKRs
 * Envía recordatorios basados en el comportamiento y estado de los objetivos
 *
 * Feature flag: FEATURE_AI_SMART_REMINDERS
 *
 * Tipos de recordatorios:
 * - Objetivos sin updates en 7+ días
 * - Deadlines próximos (3 días antes)
 * - Celebraciones de completitud
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/smart-reminders",
 *     "schedule": "0 9 * * *"  // Diario a las 9am
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Log de features habilitadas
    logEnabledFeatures();

    // Verificar feature flag
    if (!isFeatureEnabled('AI_SMART_REMINDERS')) {
      return NextResponse.json({
        skipped: true,
        reason: 'AI Smart Reminders feature is disabled',
        message: 'Enable with environment variable: FEATURE_AI_SMART_REMINDERS=true',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar autorización (Vercel Cron secret)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron: Smart Reminders] Starting smart reminders processing...');

    const startTime = Date.now();

    // Procesar recordatorios para todas las empresas
    const results = await processAllCompanies();

    const executionTime = Date.now() - startTime;

    // Calcular estadísticas agregadas
    const totalStats = results.reduce(
      (acc, result) => ({
        staleObjectives: acc.staleObjectives + result.reminders.staleObjectives,
        upcomingDeadlines: acc.upcomingDeadlines + result.reminders.upcomingDeadlines,
        completionCelebrations:
          acc.completionCelebrations + result.reminders.completionCelebrations,
      }),
      { staleObjectives: 0, upcomingDeadlines: 0, completionCelebrations: 0 }
    );

    console.log('[Cron: Smart Reminders] Processing complete:', {
      companiesProcessed: results.length,
      executionTimeMs: executionTime,
      totalStats,
    });

    return NextResponse.json({
      success: true,
      message: 'Smart reminders processed successfully',
      summary: {
        companiesProcessed: results.length,
        executionTimeMs: executionTime,
        totalStaleReminders: totalStats.staleObjectives,
        totalDeadlineReminders: totalStats.upcomingDeadlines,
        totalCelebrations: totalStats.completionCelebrations,
        totalRemindersSent:
          totalStats.staleObjectives +
          totalStats.upcomingDeadlines +
          totalStats.completionCelebrations,
      },
      companies: results.map((r) => ({
        companyId: r.companyId,
        reminders: r.reminders,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron: Smart Reminders] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process smart reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
