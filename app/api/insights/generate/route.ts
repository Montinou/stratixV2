import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { OKRAnalyzer } from '@/lib/ai/okr-analyzer';
import { withRLSContext } from '@/lib/database/rls-client';
import { profiles } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';
import { isFeatureEnabled } from '@/lib/config/feature-flags';

/**
 * POST /api/insights/generate
 *
 * Genera insights manualmente bajo demanda
 * Ejecuta el análisis de OKRs para la empresa del usuario
 */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que la feature esté habilitada
    if (!isFeatureEnabled('AI_DAILY_OKR_ANALYSIS') && !isFeatureEnabled('AI_AUTO_INSIGHTS')) {
      return NextResponse.json(
        {
          error: 'AI Insights generation is disabled',
          message:
            'Enable with FEATURE_AI_DAILY_OKR_ANALYSIS=true or FEATURE_AI_AUTO_INSIGHTS=true',
        },
        { status: 403 }
      );
    }

    // Obtener perfil del usuario para conocer su empresa
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
        with: {
          company: true,
        },
      });
    });

    if (!userProfile || !userProfile.company) {
      return NextResponse.json({ error: 'Perfil o empresa no encontrados' }, { status: 404 });
    }

    console.log(
      `[API: Generate Insights] Manual generation requested by ${userProfile.fullName} for company ${userProfile.company.name}`
    );

    const startTime = Date.now();

    // Ejecutar análisis para la empresa
    const result = await OKRAnalyzer.analyzeCompany(userProfile.companyId);

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Insights generados exitosamente',
      result: {
        companyId: result.companyId,
        companyName: result.companyName,
        analysis: result.analysis,
        insightsGenerated: result.analysis.insightsGenerated,
        executionTimeMs: executionTime,
      },
      insights: result.insights,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API: Generate Insights] Error:', error);

    return NextResponse.json(
      {
        error: 'Error al generar insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
