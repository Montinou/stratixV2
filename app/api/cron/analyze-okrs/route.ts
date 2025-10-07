import { NextRequest, NextResponse } from 'next/server';
import { analyzeAllCompanies } from '@/lib/ai/okr-analyzer';
import { isFeatureEnabled, logEnabledFeatures } from '@/lib/config/feature-flags';

/**
 * GET /api/cron/analyze-okrs
 *
 * Análisis automático diario de OKRs con IA
 * Detecta objetivos en riesgo, iniciativas bloqueadas y high performers
 * Genera insights automáticos y los almacena en la base de datos
 *
 * Feature flag: FEATURE_AI_DAILY_OKR_ANALYSIS
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/analyze-okrs",
 *     "schedule": "0 8 * * *"  // Diario a las 8am
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Log de features habilitadas
    logEnabledFeatures();

    // Verificar feature flag
    if (!isFeatureEnabled('AI_DAILY_OKR_ANALYSIS')) {
      return NextResponse.json({
        skipped: true,
        reason: 'AI Daily OKR Analysis feature is disabled',
        message: 'Enable with environment variable: FEATURE_AI_DAILY_OKR_ANALYSIS=true',
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

    console.log('[Cron: Analyze OKRs] Starting daily OKR analysis...');

    const startTime = Date.now();

    // Analizar todas las empresas
    const results = await analyzeAllCompanies();

    const executionTime = Date.now() - startTime;

    // Calcular estadísticas agregadas
    const totalStats = results.reduce(
      (acc, result) => ({
        objectivesAtRisk: acc.objectivesAtRisk + result.analysis.objectivesAtRisk,
        blockedInitiatives: acc.blockedInitiatives + result.analysis.blockedInitiatives,
        highPerformers: acc.highPerformers + result.analysis.highPerformers,
        insightsGenerated: acc.insightsGenerated + result.analysis.insightsGenerated,
      }),
      { objectivesAtRisk: 0, blockedInitiatives: 0, highPerformers: 0, insightsGenerated: 0 }
    );

    console.log('[Cron: Analyze OKRs] Analysis complete:', {
      companiesAnalyzed: results.length,
      executionTimeMs: executionTime,
      totalStats,
    });

    return NextResponse.json({
      success: true,
      message: 'Daily OKR analysis completed successfully',
      summary: {
        companiesAnalyzed: results.length,
        executionTimeMs: executionTime,
        totalObjectivesAtRisk: totalStats.objectivesAtRisk,
        totalBlockedInitiatives: totalStats.blockedInitiatives,
        totalHighPerformers: totalStats.highPerformers,
        totalInsightsGenerated: totalStats.insightsGenerated,
      },
      companies: results.map((r) => ({
        companyId: r.companyId,
        companyName: r.companyName,
        analysis: r.analysis,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron: Analyze OKRs] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze OKRs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
