/**
 * Onboarding Status Detection API
 *
 * Provides comprehensive status information about a user's onboarding state
 * including session details, completion percentage, next steps, and recommendations.
 *
 * Features:
 * - Real-time onboarding status detection
 * - Integration with session management
 * - AI-powered insights and recommendations
 * - Multi-tenant organization context
 * - Performance monitoring and caching
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic';
import { stackServerApp } from '@/stack';
import {
  getOnboardingSessionByUserId,
  getOnboardingSessionWithProgress,
  getUserActiveOrganizations,
  getOrganizationById
} from '@/lib/database/onboarding-queries';
import { onboardingCache } from '@/lib/cache/redis';
import { trackEvent } from '@/lib/monitoring/analytics';
import { OnboardingAIService } from '@/lib/ai/service-connection';
// SessionManager removed - not needed with native Neon Auth
import type { OnboardingSession, Organization } from '@/lib/database/onboarding-types';

// Enhanced status response interface
export interface OnboardingStatusResponse {
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'expired' | 'paused';
  session?: {
    id: string;
    currentStep: number;
    totalSteps: number;
    completionPercentage: number;
    lastActivity: string;
    expiresAt: string;
    estimatedTimeRemaining?: number;
  };
  progress: {
    completedSteps: number[];
    currentStepData?: Record<string, any>;
    nextStep?: {
      number: number;
      name: string;
      description: string;
      estimatedTime: number;
    };
  };
  organization?: {
    id: string;
    name: string;
    industry?: string;
    size: string;
    memberCount: number;
    isOwner: boolean;
    role: string;
  };
  ai?: {
    hasInsights: boolean;
    suggestions: string[];
    recommendedActions: string[];
    personalizedTips: string[];
  };
  flags: {
    canResume: boolean;
    needsValidation: boolean;
    hasExpired: boolean;
    requiresReauth: boolean;
    shouldRedirect: boolean;
  };
  metadata: {
    lastChecked: string;
    fromCache: boolean;
    checkDuration: number;
  };
}

// Step definitions for status calculation
const ONBOARDING_STEPS = {
  1: { name: 'Bienvenida y Configuración Inicial', description: 'Configuración básica del perfil', estimatedTime: 2 },
  2: { name: 'Información Organizacional', description: 'Datos de la empresa y equipo', estimatedTime: 5 },
  3: { name: 'Objetivos y Estrategia', description: 'Definición de objetivos empresariales', estimatedTime: 8 },
  4: { name: 'Configuración OKR', description: 'Configuración del sistema OKR', estimatedTime: 10 },
  5: { name: 'Finalización y Revisión', description: 'Revisión final y activación', estimatedTime: 3 }
};

/**
 * GET /api/onboarding/status
 *
 * Returns comprehensive onboarding status for the authenticated user
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('refresh') === 'true';
    const includeAI = searchParams.get('ai') !== 'false';

    // Check cache first (unless force refresh)
    const cacheKey = `onboarding_status:${userId}`;
    let cachedStatus: OnboardingStatusResponse | null = null;

    if (!forceRefresh) {
      cachedStatus = await onboardingCache.getOnboardingStatus(userId);
    }

    if (cachedStatus && !forceRefresh) {
      // Update metadata for cached response
      cachedStatus.metadata = {
        lastChecked: new Date().toISOString(),
        fromCache: true,
        checkDuration: Date.now() - startTime
      };

      // Track cache hit
      await trackEvent('onboarding_status_check', {
        userId,
        fromCache: true,
        status: cachedStatus.status,
        duration: Date.now() - startTime
      });

      return NextResponse.json(cachedStatus);
    }

    // Get fresh data from database
    const [session, organizations] = await Promise.all([
      getOnboardingSessionByUserId(userId),
      getUserActiveOrganizations(userId)
    ]);

    // Calculate status
    const status = await calculateOnboardingStatus(session, userId);

    // Get detailed session info if exists
    let sessionData = null;
    let progressData = null;

    if (session) {
      const sessionWithProgress = await getOnboardingSessionWithProgress(session.id);
      sessionData = {
        id: session.id,
        currentStep: session.current_step,
        totalSteps: session.total_steps,
        completionPercentage: session.completion_percentage,
        lastActivity: session.updated_at,
        expiresAt: session.expires_at,
        estimatedTimeRemaining: calculateEstimatedTime(session)
      };

      progressData = {
        completedSteps: extractCompletedSteps(sessionWithProgress),
        currentStepData: session.form_data[session.current_step] || {},
        nextStep: getNextStepInfo(session.current_step, session.total_steps)
      };
    } else {
      progressData = {
        completedSteps: [],
        nextStep: getNextStepInfo(0, 5)
      };
    }

    // Get organization context
    let organizationData = null;
    if (organizations.length > 0) {
      const primaryOrg = organizations[0]; // User's primary organization
      const orgDetails = await getOrganizationById(primaryOrg.organization_id);

      if (orgDetails) {
        organizationData = {
          id: orgDetails.id,
          name: orgDetails.name,
          industry: orgDetails.industry_id ? await getIndustryName(orgDetails.industry_id) : undefined,
          size: orgDetails.size,
          memberCount: organizations.length,
          isOwner: primaryOrg.role === 'org_owner',
          role: primaryOrg.role
        };
      }
    }

    // Get AI insights if enabled and session exists
    let aiData = null;
    if (includeAI && session) {
      try {
        const aiService = OnboardingAIService.getInstance();
        const hasInsights = session.ai_analysis && Object.keys(session.ai_analysis).length > 0;

        if (hasInsights) {
          const suggestions = await generateCurrentSuggestions(session, organizationData);
          aiData = {
            hasInsights: true,
            suggestions: suggestions.slice(0, 3), // Top 3 suggestions
            recommendedActions: await generateRecommendedActions(session, organizationData),
            personalizedTips: await generatePersonalizedTips(session, user)
          };
        } else {
          aiData = {
            hasInsights: false,
            suggestions: [],
            recommendedActions: [],
            personalizedTips: []
          };
        }
      } catch (error) {
        console.error('Error getting AI insights:', error);
        aiData = {
          hasInsights: false,
          suggestions: [],
          recommendedActions: [],
          personalizedTips: []
        };
      }
    }

    // Calculate flags
    const flags = {
      canResume: status === 'in_progress' || status === 'paused',
      needsValidation: session ? hasValidationErrors(session) : false,
      hasExpired: status === 'expired',
      requiresReauth: false, // Could be enhanced with auth check
      shouldRedirect: status === 'not_started' && !session
    };

    // Build response
    const response: OnboardingStatusResponse = {
      status,
      session: sessionData,
      progress: progressData,
      organization: organizationData,
      ai: aiData,
      flags,
      metadata: {
        lastChecked: new Date().toISOString(),
        fromCache: false,
        checkDuration: Date.now() - startTime
      }
    };

    // Cache the response (5 minute TTL)
    await onboardingCache.setOnboardingStatus(userId, response, 300);

    // Track the status check
    await trackEvent('onboarding_status_check', {
      userId,
      fromCache: false,
      status: response.status,
      duration: Date.now() - startTime,
      hasSession: !!session,
      hasOrganization: !!organizationData,
      hasAI: !!aiData?.hasInsights
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching onboarding status:', error);

    // Track error
    await trackEvent('onboarding_status_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }).catch(() => {}); // Don't fail on tracking errors

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/status
 *
 * Updates onboarding status or triggers status recalculation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, sessionId, stepData } = body;

    switch (action) {
      case 'refresh_status':
        // Force refresh status from database
        await onboardingCache.invalidateOnboardingStatus(user.id);
        return NextResponse.json({ success: true, message: 'Status refreshed' });

      case 'update_activity':
        // With native Neon Auth, activity is automatically tracked via Stack Auth
        // Just invalidate cache to ensure fresh status
        await onboardingCache.invalidateOnboardingStatus(user.id);
        return NextResponse.json({ success: true, message: 'Activity updated' });

      case 'validate_step':
        // Trigger step validation
        if (sessionId && stepData) {
          const isValid = await validateStepData(stepData, body.stepNumber);
          return NextResponse.json({ success: true, isValid });
        }
        return NextResponse.json({ error: 'Missing required data' }, { status: 400 });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in onboarding status POST:', error);

    await trackEvent('onboarding_status_post_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }).catch(() => {});

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function calculateOnboardingStatus(
  session: OnboardingSession | null,
  userId: string
): Promise<OnboardingStatusResponse['status']> {
  if (!session) {
    return 'not_started';
  }

  // Check if expired
  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    return 'expired';
  }

  // Return current status
  return session.status as OnboardingStatusResponse['status'];
}

function calculateEstimatedTime(session: OnboardingSession): number {
  const remainingSteps = session.total_steps - session.current_step;
  let totalTime = 0;

  for (let step = session.current_step + 1; step <= session.total_steps; step++) {
    totalTime += ONBOARDING_STEPS[step as keyof typeof ONBOARDING_STEPS]?.estimatedTime || 5;
  }

  return totalTime;
}

function extractCompletedSteps(sessionWithProgress: any): number[] {
  if (!sessionWithProgress?.progress) return [];

  return sessionWithProgress.progress
    .filter((p: any) => p.completed_at)
    .map((p: any) => p.step_number)
    .sort((a: number, b: number) => a - b);
}

function getNextStepInfo(currentStep: number, totalSteps: number) {
  const nextStepNumber = currentStep + 1;

  if (nextStepNumber > totalSteps) {
    return null;
  }

  const stepInfo = ONBOARDING_STEPS[nextStepNumber as keyof typeof ONBOARDING_STEPS];

  return {
    number: nextStepNumber,
    name: stepInfo?.name || `Paso ${nextStepNumber}`,
    description: stepInfo?.description || 'Siguiente paso del proceso',
    estimatedTime: stepInfo?.estimatedTime || 5
  };
}

async function generateCurrentSuggestions(
  session: OnboardingSession,
  organization: any
): Promise<string[]> {
  const suggestions: string[] = [];

  // Basic suggestions based on current step
  const currentStep = session.current_step;

  switch (currentStep) {
    case 1:
      suggestions.push('Completa tu información de perfil para personalizar la experiencia');
      break;
    case 2:
      if (organization) {
        suggestions.push(`Agrega más detalles sobre ${organization.name} para mejores recomendaciones`);
      }
      suggestions.push('Define el tamaño de tu equipo para configurar estructuras apropiadas');
      break;
    case 3:
      suggestions.push('Establece objetivos SMART para tu organización');
      suggestions.push('Considera objetivos a corto, medio y largo plazo');
      break;
    case 4:
      suggestions.push('Configura métricas claras y medibles para tus KRs');
      suggestions.push('Establece responsables para cada objetivo');
      break;
    case 5:
      suggestions.push('Revisa toda la configuración antes de finalizar');
      suggestions.push('Invita a tu equipo para comenzar a usar el sistema');
      break;
    default:
      suggestions.push('Continúa con el siguiente paso del proceso');
  }

  return suggestions;
}

async function generateRecommendedActions(
  session: OnboardingSession,
  organization: any
): Promise<string[]> {
  const actions: string[] = [];

  // Generate actions based on completion percentage
  if (session.completion_percentage < 25) {
    actions.push('Dedica 10-15 minutos para completar la configuración inicial');
  } else if (session.completion_percentage < 50) {
    actions.push('Continúa definiendo la información de tu organización');
  } else if (session.completion_percentage < 75) {
    actions.push('Establece tus primeros objetivos estratégicos');
  } else {
    actions.push('Finaliza la configuración e invita a tu equipo');
  }

  return actions;
}

async function generatePersonalizedTips(
  session: OnboardingSession,
  user: any
): Promise<string[]> {
  const tips: string[] = [];

  // Personalized tips based on user context
  tips.push('Tip: Puedes pausar y retomar el proceso en cualquier momento');
  tips.push('Tip: Usa el asistente AI para obtener sugerencias personalizadas');

  if (session.completion_percentage > 0) {
    tips.push('Tip: Tu progreso se guarda automáticamente');
  }

  return tips;
}

function hasValidationErrors(session: OnboardingSession): boolean {
  // Check if there are validation errors in the session data
  if (session.form_data) {
    return Object.values(session.form_data).some(stepData =>
      stepData && typeof stepData === 'object' && 'hasErrors' in stepData
    );
  }
  return false;
}

async function validateStepData(stepData: any, stepNumber: number): Promise<boolean> {
  // Basic validation logic - can be enhanced
  if (!stepData || typeof stepData !== 'object') {
    return false;
  }

  // Step-specific validation
  switch (stepNumber) {
    case 1:
      return stepData.name && stepData.email;
    case 2:
      return stepData.organizationName && stepData.industry;
    case 3:
      return stepData.objectives && Array.isArray(stepData.objectives) && stepData.objectives.length > 0;
    case 4:
      return stepData.okrConfig && stepData.responsibilities;
    case 5:
      return stepData.finalReview === true;
    default:
      return true;
  }
}

async function getIndustryName(industryId: number): Promise<string | undefined> {
  try {
    // This would query the industries table - simplified for now
    const industries: Record<number, string> = {
      1: 'Tecnología',
      2: 'Finanzas',
      3: 'Salud',
      4: 'Educación',
      5: 'Retail',
      6: 'Manufactura'
    };

    return industries[industryId];
  } catch (error) {
    console.error('Error getting industry name:', error);
    return undefined;
  }
}