import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  getOnboardingSession,
  updateOnboardingSession,
  updateProgressStep,
  getProgressStep,
  createOnboardingProgress
} from "@/lib/database/onboarding-queries";
import type {
  UpdateProgressRequest,
  UpdateProgressResponse,
  OnboardingStepInfo
} from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';

// Request validation schema
const updateProgressSchema = z.object({
  session_id: z.string().uuid('ID de sesión inválido'),
  step_number: z.number().int().min(1).max(10, 'Número de paso inválido'),
  step_data: z.record(z.any()).default({}),
  completed: z.boolean().default(false),
  skipped: z.boolean().default(false),
  auto_advance: z.boolean().default(true)
});

// Step configurations (imported from start route - should be centralized)
const STEP_NAMES: Record<number, string> = {
  1: 'welcome',
  2: 'company',
  3: 'organization',
  4: 'preferences',
  5: 'review'
};

const NEXT_STEP_INFO: Record<number, OnboardingStepInfo> = {
  2: {
    step_number: 2,
    step_name: 'company',
    title: 'Información de tu empresa',
    description: 'Ayúdanos a entender tu contexto empresarial para brindarte recomendaciones más precisas.',
    fields: [
      {
        name: 'company_name',
        type: 'text',
        label: 'Nombre de la empresa',
        placeholder: 'Nombre de tu empresa',
        required: true
      },
      {
        name: 'industry_id',
        type: 'select',
        label: 'Industria',
        required: false,
        options: []
      },
      {
        name: 'company_size',
        type: 'select',
        label: 'Tamaño de la empresa',
        required: true,
        options: [
          { value: 'startup', label: 'Startup (1-10 empleados)' },
          { value: 'pyme', label: 'PyME (11-50 empleados)' },
          { value: 'empresa', label: 'Empresa (51-250 empleados)' },
          { value: 'corporacion', label: 'Corporación (250+ empleados)' }
        ]
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Descripción de la empresa',
        placeholder: 'Describe brevemente lo que hace tu empresa...',
        required: true
      },
      {
        name: 'website',
        type: 'text',
        label: 'Sitio web (opcional)',
        placeholder: 'https://...',
        required: false
      },
      {
        name: 'country',
        type: 'text',
        label: 'País',
        placeholder: 'País donde opera la empresa',
        required: true
      },
      {
        name: 'employee_count',
        type: 'number',
        label: 'Número de empleados (aproximado)',
        required: false,
        validation: { min: 1, max: 100000 }
      }
    ],
    estimated_time: 4
  },
  3: {
    step_number: 3,
    step_name: 'organization',
    title: 'Estructura organizacional',
    description: 'Entendamos cómo está estructurada tu organización y tu experiencia con metodologías ágiles.',
    fields: [
      {
        name: 'department',
        type: 'text',
        label: 'Departamento o área',
        placeholder: 'Ej: Producto, Marketing, Ventas...',
        required: false
      },
      {
        name: 'team_size',
        type: 'number',
        label: 'Tamaño de tu equipo directo',
        required: false,
        validation: { min: 0, max: 500 }
      },
      {
        name: 'okr_maturity',
        type: 'select',
        label: 'Nivel de madurez organizacional con OKRs',
        required: true,
        options: [
          { value: 'beginner', label: 'Principiante - Primera vez con OKRs' },
          { value: 'intermediate', label: 'Intermedio - Algunos ciclos de OKRs' },
          { value: 'advanced', label: 'Avanzado - OKRs bien establecidos' }
        ]
      },
      {
        name: 'current_challenges',
        type: 'multiselect',
        label: 'Principales desafíos actuales',
        required: true,
        options: [
          { value: 'alignment', label: 'Alineación entre equipos' },
          { value: 'measurement', label: 'Medición y seguimiento' },
          { value: 'focus', label: 'Falta de enfoque y priorización' },
          { value: 'communication', label: 'Comunicación de objetivos' },
          { value: 'execution', label: 'Ejecución de estrategias' },
          { value: 'culture', label: 'Cultura de resultados' },
          { value: 'resources', label: 'Gestión de recursos' },
          { value: 'growth', label: 'Escalamiento del negocio' }
        ]
      },
      {
        name: 'business_goals',
        type: 'multiselect',
        label: 'Objetivos de negocio prioritarios',
        required: true,
        options: [
          { value: 'revenue_growth', label: 'Crecimiento de ingresos' },
          { value: 'market_expansion', label: 'Expansión de mercado' },
          { value: 'product_development', label: 'Desarrollo de producto' },
          { value: 'operational_efficiency', label: 'Eficiencia operacional' },
          { value: 'customer_satisfaction', label: 'Satisfacción del cliente' },
          { value: 'team_development', label: 'Desarrollo del equipo' },
          { value: 'innovation', label: 'Innovación' },
          { value: 'sustainability', label: 'Sostenibilidad' }
        ]
      }
    ],
    estimated_time: 5
  },
  4: {
    step_number: 4,
    step_name: 'preferences',
    title: 'Preferencias del sistema',
    description: 'Personaliza tu experiencia en StratixV2 según tus preferencias de trabajo.',
    fields: [
      {
        name: 'communication_style',
        type: 'select',
        label: 'Estilo de comunicación preferido',
        required: true,
        options: [
          { value: 'formal', label: 'Formal y profesional' },
          { value: 'informal', label: 'Amigable e informal' }
        ]
      },
      {
        name: 'language',
        type: 'select',
        label: 'Idioma preferido',
        required: true,
        options: [
          { value: 'es', label: 'Español' },
          { value: 'en', label: 'English' }
        ]
      },
      {
        name: 'notification_frequency',
        type: 'select',
        label: 'Frecuencia de notificaciones',
        required: true,
        options: [
          { value: 'daily', label: 'Diarias' },
          { value: 'weekly', label: 'Semanales' },
          { value: 'monthly', label: 'Mensuales' }
        ]
      },
      {
        name: 'focus_areas',
        type: 'multiselect',
        label: 'Áreas de enfoque principales',
        required: true,
        options: [
          { value: 'strategy', label: 'Planificación estratégica' },
          { value: 'execution', label: 'Ejecución y seguimiento' },
          { value: 'analytics', label: 'Análisis y métricas' },
          { value: 'collaboration', label: 'Colaboración en equipo' },
          { value: 'reporting', label: 'Reportes y comunicación' }
        ]
      },
      {
        name: 'ai_assistance_level',
        type: 'select',
        label: 'Nivel de asistencia de IA',
        required: true,
        options: [
          { value: 'minimal', label: 'Mínima - Solo cuando lo solicite' },
          { value: 'moderate', label: 'Moderada - Sugerencias ocasionales' },
          { value: 'extensive', label: 'Extensiva - Máxima asistencia' }
        ]
      }
    ],
    estimated_time: 3
  },
  5: {
    step_number: 5,
    step_name: 'review',
    title: 'Revisión y confirmación',
    description: 'Revisa tu información y confirma para completar la configuración inicial.',
    fields: [
      {
        name: 'confirmed',
        type: 'select',
        label: '¿Confirmas que la información es correcta?',
        required: true,
        options: [
          { value: 'true', label: 'Sí, la información es correcta' },
          { value: 'false', label: 'No, quiero hacer cambios' }
        ]
      },
      {
        name: 'additional_notes',
        type: 'textarea',
        label: 'Notas adicionales (opcional)',
        placeholder: 'Cualquier información adicional que consideres relevante...',
        required: false
      },
      {
        name: 'setup_demo',
        type: 'select',
        label: '¿Te gustaría una demostración personalizada?',
        required: false,
        options: [
          { value: 'yes', label: 'Sí, agendar demo' },
          { value: 'no', label: 'No por ahora' },
          { value: 'later', label: 'Tal vez más tarde' }
        ]
      },
      {
        name: 'invite_team_members',
        type: 'select',
        label: '¿Planeas invitar miembros del equipo?',
        required: false,
        options: [
          { value: 'immediately', label: 'Inmediatamente' },
          { value: 'soon', label: 'En los próximos días' },
          { value: 'later', label: 'Más adelante' },
          { value: 'no', label: 'Solo yo por ahora' }
        ]
      }
    ],
    estimated_time: 2
  }
};

function validateStepData(stepNumber: number, stepData: Record<string, any>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (stepNumber) {
    case 1: // Welcome step
      if (!stepData.full_name?.trim()) {
        errors.push('El nombre completo es requerido');
      }
      if (!stepData.job_title?.trim()) {
        errors.push('El cargo o posición es requerido');
      }
      if (!stepData.experience_with_okr) {
        errors.push('La experiencia con OKRs es requerida');
      }
      if (!stepData.primary_goal?.trim()) {
        errors.push('El objetivo principal es requerido');
      }
      if (!stepData.urgency_level) {
        errors.push('El nivel de urgencia es requerido');
      }
      break;

    case 2: // Company step
      if (!stepData.company_name?.trim()) {
        errors.push('El nombre de la empresa es requerido');
      }
      if (!stepData.company_size) {
        errors.push('El tamaño de la empresa es requerido');
      }
      if (!stepData.description?.trim()) {
        errors.push('La descripción de la empresa es requerida');
      }
      if (!stepData.country?.trim()) {
        errors.push('El país es requerido');
      }
      if (stepData.website && !stepData.website.match(/^https?:\/\/.+/)) {
        warnings.push('El sitio web debe incluir http:// o https://');
      }
      break;

    case 3: // Organization step
      if (!stepData.okr_maturity) {
        errors.push('El nivel de madurez con OKRs es requerido');
      }
      if (!stepData.current_challenges || stepData.current_challenges.length === 0) {
        errors.push('Debe seleccionar al menos un desafío actual');
      }
      if (!stepData.business_goals || stepData.business_goals.length === 0) {
        errors.push('Debe seleccionar al menos un objetivo de negocio');
      }
      break;

    case 4: // Preferences step
      if (!stepData.communication_style) {
        errors.push('El estilo de comunicación es requerido');
      }
      if (!stepData.language) {
        errors.push('El idioma es requerido');
      }
      if (!stepData.notification_frequency) {
        errors.push('La frecuencia de notificaciones es requerida');
      }
      if (!stepData.focus_areas || stepData.focus_areas.length === 0) {
        errors.push('Debe seleccionar al menos un área de enfoque');
      }
      if (!stepData.ai_assistance_level) {
        errors.push('El nivel de asistencia de IA es requerido');
      }
      break;

    case 5: // Review step
      if (!stepData.confirmed || stepData.confirmed !== 'true') {
        errors.push('Debe confirmar que la información es correcta');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
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
    const stepName = STEP_NAMES[step_number] || `step_${step_number}`;

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

    // Calculate completion percentage
    const completionPercentage = (step_number / session.total_steps) * 100;

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
      response.next_step = NEXT_STEP_INFO[nextStep];
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
      current_step_info: NEXT_STEP_INFO[session.current_step]
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