import { type NextRequest } from "next/server";
import { stackServerApp } from "@/stack";
import { z } from "zod";
import {
  createOnboardingSession,
  getUserActiveSession,
  updateOnboardingSession,
  createOnboardingProgress
} from "@/lib/database/onboarding-queries";
import type {
  CreateOnboardingSessionRequest,
  CreateOnboardingSessionResponse,
  OnboardingStepInfo
} from "@/lib/database/onboarding-types";
import { handleUnknownError, CommonErrors } from "@/lib/api/error-handler";

export const runtime = 'nodejs';

// Request validation schema
const startOnboardingSchema = z.object({
  user_preferences: z.object({
    language: z.enum(['es', 'en']).default('es'),
    communication_style: z.enum(['formal', 'informal']).default('formal'),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')
  }).optional(),
  context: z.object({
    source: z.string().optional(),
    utm_params: z.record(z.string()).optional()
  }).optional(),
  restart: z.boolean().default(false)
});

// Onboarding step configurations
const ONBOARDING_STEPS: Record<number, OnboardingStepInfo> = {
  1: {
    step_number: 1,
    step_name: 'welcome',
    title: 'Bienvenido a StratixV2',
    description: 'Cuéntanos sobre ti y tu experiencia con OKRs para personalizar tu experiencia.',
    fields: [
      {
        name: 'full_name',
        type: 'text',
        label: 'Nombre completo',
        placeholder: 'Tu nombre completo',
        required: true
      },
      {
        name: 'job_title',
        type: 'text',
        label: 'Cargo o posición',
        placeholder: 'Ej: CEO, Gerente de Producto, etc.',
        required: true
      },
      {
        name: 'experience_with_okr',
        type: 'select',
        label: '¿Cuál es tu experiencia con OKRs?',
        required: true,
        options: [
          { value: 'none', label: 'Nunca he usado OKRs' },
          { value: 'basic', label: 'Conocimiento básico' },
          { value: 'intermediate', label: 'Experiencia intermedia' },
          { value: 'advanced', label: 'Experto en OKRs' }
        ]
      },
      {
        name: 'primary_goal',
        type: 'textarea',
        label: '¿Cuál es tu objetivo principal con StratixV2?',
        placeholder: 'Describe qué esperas lograr...',
        required: true
      },
      {
        name: 'urgency_level',
        type: 'select',
        label: '¿Qué tan urgente es implementar OKRs?',
        required: true,
        options: [
          { value: 'low', label: 'Puedo tomarlo con calma' },
          { value: 'medium', label: 'Moderadamente urgente' },
          { value: 'high', label: 'Muy urgente' }
        ]
      }
    ],
    ai_hints: [
      'La información que proporciones nos ayudará a personalizar tu experiencia',
      'Sé honesto sobre tu nivel de experiencia - no hay respuestas incorrectas',
      'Podemos adaptar el proceso según tu urgencia'
    ],
    estimated_time: 3
  },
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
        options: [] // Will be populated by industries API
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
    ai_hints: [
      'Esta información nos ayuda a sugerir OKRs específicos para tu industria',
      'Si no encuentras tu industria, selecciona la más similar',
      'El tamaño de empresa influye en la complejidad de los OKRs recomendados'
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
    ai_hints: [
      'Los desafíos actuales nos ayudan a priorizar las características más útiles',
      'Los objetivos de negocio guían nuestras recomendaciones de OKRs',
      'Esta información se usa para personalizar tu dashboard inicial'
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
    ai_hints: [
      'Estas preferencias se pueden cambiar después en tu perfil',
      'El nivel de asistencia de IA afecta la frecuencia de sugerencias',
      'Las áreas de enfoque determinan qué características priorizamos'
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
    ai_hints: [
      'Puedes editar cualquier información después de completar el onboarding',
      'La demo te ayudará a aprovechar al máximo StratixV2',
      'Invitar miembros del equipo mejora la colaboración en OKRs'
    ],
    estimated_time: 2
  }
};

function generateAIGreeting(userPreferences: any, experienceLevel: string): string {
  const style = userPreferences?.communication_style || 'formal';
  const lang = userPreferences?.language || 'es';

  if (lang === 'en') {
    return style === 'formal'
      ? `Welcome to StratixV2! I'll help you set up your OKR management system. Based on your ${experienceLevel} experience level, I'll provide appropriate guidance throughout the process.`
      : `Hey there! 👋 Welcome to StratixV2! I'm here to help you get started with OKRs. Don't worry if you're ${experienceLevel === 'none' ? 'new to this' : 'still learning'} - we'll make it easy!`;
  }

  return style === 'formal'
    ? `Bienvenido a StratixV2. Le ayudaré a configurar su sistema de gestión de OKRs. Basándome en su nivel de experiencia ${experienceLevel}, proporcionaré la orientación adecuada durante todo el proceso.`
    : `¡Hola! 👋 ¡Bienvenido a StratixV2! Estoy aquí para ayudarte a empezar con los OKRs. ${experienceLevel === 'none' ? 'No te preocupes si es tu primera vez' : 'Tranquilo si aún estás aprendiendo'} - ¡lo haremos fácil!`;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = startOnboardingSchema.parse(body);

    const { user_preferences, context, restart } = validatedRequest;

    // Check for existing active session
    let existingSession = null;
    if (!restart) {
      existingSession = await getUserActiveSession(user.id);
    }

    let session;
    if (existingSession && !restart) {
      // Resume existing session
      session = existingSession;
    } else {
      // Create new session (or restart)
      if (existingSession && restart) {
        // Mark existing session as abandoned
        await updateOnboardingSession(existingSession.id, { status: 'abandoned' });
      }

      // Create new session
      session = await createOnboardingSession(user.id, 5);

      // Initialize first step
      await createOnboardingProgress(
        session.id,
        1,
        'welcome',
        {},
        false,
        false
      );

      // Store user preferences in session if provided
      if (user_preferences || context) {
        await updateOnboardingSession(session.id, {
          form_data: {
            user_preferences,
            context
          }
        });
      }
    }

    // Get current step info
    const currentStep = ONBOARDING_STEPS[session.current_step];
    if (!currentStep) {
      throw new Error('Invalid step number');
    }

    // Generate AI greeting
    const experienceLevel = user_preferences?.experience_level || 'beginner';
    const aiGreeting = generateAIGreeting(user_preferences, experienceLevel);

    const response: CreateOnboardingSessionResponse = {
      session,
      next_step: currentStep,
      ai_greeting: aiGreeting
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': session.id,
        'x-step-number': session.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error starting onboarding:", error);

    if (error instanceof z.ZodError) {
      return CommonErrors.validationError(error.errors).clone();
    }

    return handleUnknownError(error, 'Onboarding Start');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    // Get user's active session
    const activeSession = await getUserActiveSession(user.id);

    if (!activeSession) {
      return new Response(JSON.stringify({
        has_active_session: false,
        message: 'No hay sesión de onboarding activa'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current step info
    const currentStep = ONBOARDING_STEPS[activeSession.current_step];

    return new Response(JSON.stringify({
      has_active_session: true,
      session: activeSession,
      next_step: currentStep
    }), {
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': activeSession.id,
        'x-step-number': activeSession.current_step.toString()
      }
    });

  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return handleUnknownError(error, 'Onboarding Status');
  }
}