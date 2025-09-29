import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  getOnboardingSession,
  updateOnboardingSession,
  updateProgressStep,
  getProgressStep,
  createOnboardingProgress,
  getOnboardingProgress
} from "@/lib/database/onboarding-queries";
import type {
  UpdateProgressRequest,
  UpdateProgressResponse
} from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";
import { stepSchemas } from "@/lib/validations/onboarding-schemas";
import {
  NEXT_STEP_INFO,
  TOTAL_STEPS,
  getStepName,
  getStepInfo,
  calculateCompletionPercentage
} from "@/lib/config/onboarding-config";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Request validation schema
const updateProgressSchema = z.object({
  session_id: z.string().uuid('ID de sesión inválido'),
  step_number: z.number().int().min(1).max(TOTAL_STEPS, 'Número de paso inválido'),
  step_data: z.record(z.any()).default({}),
  completed: z.boolean().default(false),
  skipped: z.boolean().default(false),
  auto_advance: z.boolean().default(true)
});

// Step configurations are now imported from centralized config

function validateStepData(stepNumber: number, stepData: Record<string, any>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const schema = stepSchemas[stepNumber as keyof typeof stepSchemas];

  if (!schema) {
    return {
      isValid: false,
      errors: [`No existe esquema de validación para el paso ${stepNumber}`],
      warnings: []
    };
  }

  const result = schema.safeParse(stepData);

  if (result.success) {
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  // Extract error messages from Zod validation
  const errors = result.error.errors.map(error => {
    if (error.message) {
      return error.message;
    }
    // Fallback for any unmapped errors
    return `Error en el campo ${error.path.join('.')}: ${error.code}`;
  });

  return {
    isValid: false,
    errors,
    warnings: []
  };
}

function generateAIFeedback(
  stepNumber: number,
  stepData: Record<string, any>,
  validation: { isValid: boolean; errors: string[]; warnings: string[] }
): string {
  if (!validation.isValid) {
    return 'Por favor, completa los campos requeridos antes de continuar.';
  }

  // Generate positive, contextual feedback based on step
  switch (stepNumber) {
    case 1:
      const experience = stepData.experience_with_okr;
      if (experience === 'none') {
        return '¡Perfecto! Es genial que estés comenzando con OKRs. Te guiaré paso a paso para que tengas una excelente experiencia.';
      } else if (experience === 'advanced') {
        return 'Excelente, con tu experiencia avanzada podremos configurar características más sofisticadas. ¡Esto será rápido!';
      }
      return '¡Genial! Con tu nivel de experiencia, te ayudaré a aprovechar al máximo StratixV2.';

    case 2:
      const companySize = stepData.company_size;
      if (companySize === 'startup') {
        return 'Las startups necesitan agilidad. Te ayudaré a configurar OKRs que permitan pivotear rápidamente mientras mantienes el enfoque.';
      } else if (companySize === 'corporacion') {
        return 'Las corporaciones requieren alineación a gran escala. Configuraremos un sistema que facilite la coordinación entre múltiples equipos.';
      }
      return 'Perfecto, entiendo tu contexto empresarial. Esto me ayudará a sugerir OKRs específicos para tu industria y tamaño.';

    case 3:
      const challenges = stepData.current_challenges || [];
      if (challenges.includes('alignment')) {
        return 'La alineación es crucial. Priorizaremos características que mejoren la visibilidad y coordinación entre equipos.';
      } else if (challenges.includes('measurement')) {
        return 'Excelente identificación. Te ayudaré a configurar métricas claras y dashboards que faciliten el seguimiento.';
      }
      return 'Con esta información podré personalizar tu experiencia para abordar tus desafíos específicos.';

    case 4:
      const aiLevel = stepData.ai_assistance_level;
      if (aiLevel === 'extensive') {
        return '¡Perfecto! Te proporcionaré sugerencias proactivas y análisis detallados para optimizar tus OKRs continuamente.';
      } else if (aiLevel === 'minimal') {
        return 'Entendido, mantendré las sugerencias de IA al mínimo y solo cuando sea realmente útil.';
      }
      return 'Excelente, he configurado tu experiencia según tus preferencias. ¡Estás casi listo!';

    case 5:
      return '¡Fantástico! Has completado la configuración inicial. Ahora te ayudaré a crear tu primera estructura de OKRs.';

    default:
      return '¡Excelente progreso! Continuemos con el siguiente paso.';
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = updateProgressSchema.parse(body);

    const { session_id, step_number, step_data, completed, skipped, auto_advance } = validatedRequest;

    // Verify session ownership
    const session = await getOnboardingSession(session_id);
    if (!session) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (session.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    if (session.status !== 'in_progress') {
      return new Response("La sesión de onboarding no está activa", { status: 400 });
    }

    // Validate step data
    const validation = validateStepData(step_number, step_data);

    // Get or create progress record
    let progress = await getProgressStep(session_id, step_number);
    const stepName = getStepName(step_number);

    if (!progress) {
      // Create new progress record
      progress = await createOnboardingProgress(
        session_id,
        step_number,
        stepName,
        step_data,
        completed && validation.isValid,
        skipped
      );
    } else {
      // Update existing progress
      progress = await updateProgressStep(session_id, step_number, {
        step_data,
        completed: completed && validation.isValid,
        skipped,
        ai_validation: {
          is_valid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          validated_at: new Date().toISOString()
        }
      });
    }

    // Update session's current step and form data
    const updatedFormData = {
      ...session.form_data,
      [stepName]: step_data
    };

    let nextStep = session.current_step;
    if (auto_advance && (completed || skipped) && validation.isValid && step_number === session.current_step) {
      nextStep = Math.min(step_number + 1, session.total_steps);
    }

    // Calculate completion percentage using centralized function
    // First, get all completed steps to calculate proper percentage
    const allProgress = await getOnboardingProgress(session_id);
    const completedSteps = allProgress.filter(p => p.completed).map(p => p.step_number);

    // Use the centralized calculation function
    const completionPercentage = calculateCompletionPercentage(nextStep, completedSteps);

    const updatedSession = await updateOnboardingSession(session_id, {
      current_step: nextStep,
      form_data: updatedFormData,
      completion_percentage: Math.max(session.completion_percentage, completionPercentage)
    });

    // Generate AI feedback
    const aiFeedback = generateAIFeedback(step_number, step_data, validation);

    // Prepare response
    const response: UpdateProgressResponse = {
      progress,
      session: updatedSession,
      ai_feedback: aiFeedback,
      validation_errors: validation.errors.length > 0 ? validation.errors : undefined
    };

    // Add next step info if advancing
    if (auto_advance && nextStep > step_number && nextStep <= session.total_steps) {
      response.next_step = NEXT_STEP_INFO[nextStep] || getStepInfo(nextStep);
    }

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': session_id,
        'x-step-number': nextStep.toString(),
        'x-validation-status': validation.isValid ? 'valid' : 'invalid'
      }
    });

  } catch (error) {
    console.error("Error updating onboarding progress:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'Onboarding Progress');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return new Response("session_id es requerido", { status: 400 });
    }

    // Verify session ownership
    const session = await getOnboardingSession(sessionId);
    if (!session) {
      return new Response("Sesión de onboarding no encontrada", { status: 404 });
    }

    if (session.user_id !== user.id) {
      return new Response("No autorizado para esta sesión", { status: 403 });
    }

    // Get all progress steps
    const progress = await getOnboardingProgress(sessionId);

    return new Response(JSON.stringify({
      session,
      progress,
      current_step_info: getStepInfo(session.current_step)
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
        'x-step-number': session.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error getting onboarding progress:", error);
    return handleUnknownError(error, 'Get Onboarding Progress');
  }
}
