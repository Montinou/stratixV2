import type { OnboardingStepInfo } from '@/lib/database/onboarding-types';

/**
 * Centralized onboarding configuration
 * This file contains all step definitions and configuration used across the application
 */

export const ONBOARDING_STEPS: Record<number, OnboardingStepInfo> = {
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

/**
 * Step names mapping for easy lookup
 * Dynamically generated from the main configuration
 */
export const STEP_NAMES: Record<number, string> = Object.fromEntries(
  Object.values(ONBOARDING_STEPS).map(step => [step.step_number, step.step_name])
);

/**
 * Next step information for progress flow
 * Excludes step 1 since it's handled by the start endpoint
 * Dynamically generated from the main configuration
 */
export const NEXT_STEP_INFO: Record<number, OnboardingStepInfo> = Object.fromEntries(
  Object.entries(ONBOARDING_STEPS)
    .filter(([stepNumber]) => parseInt(stepNumber) > 1)
    .map(([stepNumber, stepInfo]) => [parseInt(stepNumber), stepInfo])
);

/**
 * Calculate total number of steps dynamically
 */
export const TOTAL_STEPS = Object.keys(ONBOARDING_STEPS).length;

/**
 * Get step information by step number
 */
export function getStepInfo(stepNumber: number): OnboardingStepInfo | null {
  return ONBOARDING_STEPS[stepNumber] || null;
}

/**
 * Get step name by step number
 */
export function getStepName(stepNumber: number): string {
  return STEP_NAMES[stepNumber] || `step_${stepNumber}`;
}

/**
 * Calculate completion percentage based on current step and completed steps
 */
export function calculateCompletionPercentage(currentStep: number, completedSteps: number[]): number {
  // Use the maximum of: current step progress or actual completed steps
  const stepBasedProgress = (currentStep / TOTAL_STEPS) * 100;
  const completedBasedProgress = (completedSteps.length / TOTAL_STEPS) * 100;

  return Math.max(stepBasedProgress, completedBasedProgress);
}

/**
 * Validate if a step number is valid
 */
export function isValidStep(stepNumber: number): boolean {
  return stepNumber >= 1 && stepNumber <= TOTAL_STEPS && ONBOARDING_STEPS[stepNumber] !== undefined;
}

/**
 * Get next step number, ensuring it doesn't exceed total steps
 */
export function getNextStepNumber(currentStep: number): number | null {
  const nextStep = currentStep + 1;
  return nextStep <= TOTAL_STEPS ? nextStep : null;
}

/**
 * Check if onboarding is complete (all steps completed)
 */
export function isOnboardingComplete(completedSteps: number[]): boolean {
  return completedSteps.length >= TOTAL_STEPS;
}