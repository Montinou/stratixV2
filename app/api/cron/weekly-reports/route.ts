import { NextRequest, NextResponse } from 'next/server';
import { WeeklyReportGenerator } from '@/lib/ai/report-generator';
import { isFeatureEnabled, logEnabledFeatures } from '@/lib/config/feature-flags';

/**
 * GET /api/cron/weekly-reports
 *
 * Generación automática de reportes semanales
 * Analiza el progreso de la semana y envía reportes por email a stakeholders
 *
 * Feature flag: FEATURE_AI_WEEKLY_REPORTS
 *
 * Contenido del reporte:
 * - Resumen ejecutivo generado por IA
 * - Métricas de objetivos, iniciativas y actividades
 * - Top performers de la semana
 * - Performance por área
 * - Objetivos en riesgo
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/weekly-reports",
 *     "schedule": "0 8 * * 1"  // Lunes a las 8am
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Log de features habilitadas
    logEnabledFeatures();

    // Verificar feature flag
    if (!isFeatureEnabled('AI_WEEKLY_REPORTS')) {
      return NextResponse.json({
        skipped: true,
        reason: 'AI Weekly Reports feature is disabled',
        message: 'Enable with environment variable: FEATURE_AI_WEEKLY_REPORTS=true',
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

    console.log('[Cron: Weekly Reports] Starting weekly report generation...');

    const startTime = Date.now();

    // Generar reportes para todas las empresas
    const results = await WeeklyReportGenerator.generateAllCompanyReports();

    const executionTime = Date.now() - startTime;

    // Calcular estadísticas agregadas
    const totalStats = results.reduce(
      (acc, result) => ({
        totalObjectives: acc.totalObjectives + result.reportData.objectives.total,
        totalInitiatives: acc.totalInitiatives + result.reportData.initiatives.total,
        totalActivitiesCompleted:
          acc.totalActivitiesCompleted + result.reportData.activities.completedThisWeek,
        reportsSent: acc.reportsSent + result.reportSent,
      }),
      { totalObjectives: 0, totalInitiatives: 0, totalActivitiesCompleted: 0, reportsSent: 0 }
    );

    console.log('[Cron: Weekly Reports] Report generation complete:', {
      companiesProcessed: results.length,
      executionTimeMs: executionTime,
      totalStats,
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly reports generated successfully',
      summary: {
        companiesProcessed: results.length,
        executionTimeMs: executionTime,
        totalReportsSent: totalStats.reportsSent,
        totalObjectivesTracked: totalStats.totalObjectives,
        totalInitiativesTracked: totalStats.totalInitiatives,
        totalActivitiesCompletedThisWeek: totalStats.totalActivitiesCompleted,
      },
      companies: results.map((r) => ({
        companyId: r.companyId,
        companyName: r.companyName,
        reportsSent: r.reportSent,
        objectives: r.reportData.objectives,
        initiatives: r.reportData.initiatives,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron: Weekly Reports] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate weekly reports',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
