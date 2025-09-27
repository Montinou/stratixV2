import { z } from 'zod';

// Base validation schemas for onboarding system

// User preferences schema
export const userPreferencesSchema = z.object({
  language: z.enum(['es', 'en']).default('es'),
  communication_style: z.enum(['formal', 'informal']).default('formal'),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner')
});

// Context schema for tracking user source and UTM parameters
export const contextSchema = z.object({
  source: z.string().max(100).optional(),
  utm_params: z.record(z.string().max(255)).optional(),
  referrer: z.string().url().optional(),
  campaign: z.string().max(100).optional()
});

// Welcome step validation
export const welcomeStepSchema = z.object({
  full_name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo se permiten letras y espacios'),

  job_title: z.string()
    .min(2, 'El cargo debe tener al menos 2 caracteres')
    .max(100, 'El cargo no puede exceder 100 caracteres'),

  experience_with_okr: z.enum(['none', 'basic', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: 'Selecciona un nivel de experiencia válido' })
  }),

  primary_goal: z.string()
    .min(10, 'El objetivo debe tener al menos 10 caracteres')
    .max(500, 'El objetivo no puede exceder 500 caracteres'),

  urgency_level: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Selecciona un nivel de urgencia válido' })
  })
});

// Company step validation
export const companyStepSchema = z.object({
  company_name: z.string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(255, 'El nombre de la empresa no puede exceder 255 caracteres')
    .regex(/^[a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s\-_.&()]+$/, 'Caracteres no válidos en el nombre de la empresa'),

  industry_id: z.number()
    .int('El ID de industria debe ser un número entero')
    .positive('El ID de industria debe ser positivo')
    .optional(),

  company_size: z.enum(['startup', 'pyme', 'empresa', 'corporacion'], {
    errorMap: () => ({ message: 'Selecciona un tamaño de empresa válido' })
  }),

  description: z.string()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),

  website: z.string()
    .url('Debe ser una URL válida')
    .max(255, 'La URL no puede exceder 255 caracteres')
    .optional()
    .or(z.literal('')),

  country: z.string()
    .min(2, 'El país debe tener al menos 2 caracteres')
    .max(100, 'El país no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo se permiten letras y espacios'),

  city: z.string()
    .max(100, 'La ciudad no puede exceder 100 caracteres')
    .regex(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Solo se permiten letras y espacios')
    .optional(),

  employee_count: z.number()
    .int('El número de empleados debe ser un número entero')
    .min(1, 'Debe tener al menos 1 empleado')
    .max(100000, 'El número de empleados no puede exceder 100,000')
    .optional(),

  founded_year: z.number()
    .int('El año de fundación debe ser un número entero')
    .min(1800, 'El año de fundación debe ser posterior a 1800')
    .max(new Date().getFullYear(), 'El año de fundación no puede ser futuro')
    .optional()
});

// Organization step validation
export const organizationStepSchema = z.object({
  department: z.string()
    .max(100, 'El departamento no puede exceder 100 caracteres')
    .optional(),

  team_size: z.number()
    .int('El tamaño del equipo debe ser un número entero')
    .min(0, 'El tamaño del equipo no puede ser negativo')
    .max(500, 'El tamaño del equipo no puede exceder 500')
    .optional(),

  okr_maturity: z.enum(['beginner', 'intermediate', 'advanced'], {
    errorMap: () => ({ message: 'Selecciona un nivel de madurez OKR válido' })
  }),

  current_challenges: z.array(
    z.enum([
      'alignment', 'measurement', 'focus', 'communication',
      'execution', 'culture', 'resources', 'growth'
    ])
  )
    .min(1, 'Debe seleccionar al menos un desafío')
    .max(8, 'No puede seleccionar más de 8 desafíos'),

  business_goals: z.array(
    z.enum([
      'revenue_growth', 'market_expansion', 'product_development',
      'operational_efficiency', 'customer_satisfaction', 'team_development',
      'innovation', 'sustainability'
    ])
  )
    .min(1, 'Debe seleccionar al menos un objetivo de negocio')
    .max(8, 'No puede seleccionar más de 8 objetivos'),

  success_metrics: z.array(z.string().max(100))
    .max(10, 'No puede tener más de 10 métricas de éxito')
    .optional()
});

// Preferences step validation
export const preferencesStepSchema = z.object({
  communication_style: z.enum(['formal', 'informal'], {
    errorMap: () => ({ message: 'Selecciona un estilo de comunicación válido' })
  }),

  language: z.enum(['es', 'en'], {
    errorMap: () => ({ message: 'Selecciona un idioma válido' })
  }),

  notification_frequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: 'Selecciona una frecuencia de notificaciones válida' })
  }),

  focus_areas: z.array(
    z.enum(['strategy', 'execution', 'analytics', 'collaboration', 'reporting'])
  )
    .min(1, 'Debe seleccionar al menos un área de enfoque')
    .max(5, 'No puede seleccionar más de 5 áreas de enfoque'),

  ai_assistance_level: z.enum(['minimal', 'moderate', 'extensive'], {
    errorMap: () => ({ message: 'Selecciona un nivel de asistencia IA válido' })
  })
});

// Review step validation
export const reviewStepSchema = z.object({
  confirmed: z.enum(['true', 'false'])
    .refine(val => val === 'true', {
      message: 'Debe confirmar que la información es correcta'
    }),

  additional_notes: z.string()
    .max(1000, 'Las notas adicionales no pueden exceder 1000 caracteres')
    .optional(),

  setup_demo: z.enum(['yes', 'no', 'later'])
    .optional(),

  invite_team_members: z.enum(['immediately', 'soon', 'later', 'no'])
    .optional()
});

// Combined form data schema
export const onboardingFormDataSchema = z.object({
  welcome: welcomeStepSchema.optional(),
  company: companyStepSchema.optional(),
  organization: organizationStepSchema.optional(),
  preferences: preferencesStepSchema.optional(),
  review: reviewStepSchema.optional()
});

// Session creation schema
export const createSessionSchema = z.object({
  user_preferences: userPreferencesSchema.optional(),
  context: contextSchema.optional(),
  restart: z.boolean().default(false)
});

// Progress update schema
export const updateProgressSchema = z.object({
  session_id: z.string().uuid('ID de sesión debe ser un UUID válido'),
  step_number: z.number()
    .int('El número de paso debe ser un entero')
    .min(1, 'El número de paso debe ser al menos 1')
    .max(10, 'El número de paso no puede exceder 10'),
  step_data: z.record(z.any()),
  completed: z.boolean().default(false),
  skipped: z.boolean().default(false),
  auto_advance: z.boolean().default(true)
});

// Complete onboarding schema
export const completeOnboardingSchema = z.object({
  session_id: z.string().uuid('ID de sesión debe ser un UUID válido'),
  final_data: z.record(z.any()).optional(),
  create_organization: z.boolean().default(true)
});

// Organization creation schema
export const createOrganizationSchema = z.object({
  name: z.string()
    .min(1, 'El nombre de la organización es requerido')
    .max(255, 'El nombre no puede exceder 255 caracteres'),

  industry_id: z.number()
    .int('El ID de industria debe ser un entero')
    .positive('El ID de industria debe ser positivo')
    .optional(),

  size: z.enum(['startup', 'pyme', 'empresa', 'corporacion']),

  description: z.string()
    .min(1, 'La descripción es requerida')
    .max(1000, 'La descripción no puede exceder 1000 caracteres'),

  website: z.string()
    .url('Debe ser una URL válida')
    .optional(),

  country: z.string()
    .min(1, 'El país es requerido')
    .max(100, 'El país no puede exceder 100 caracteres'),

  city: z.string()
    .max(100, 'La ciudad no puede exceder 100 caracteres')
    .optional(),

  employee_count: z.number()
    .int('El número de empleados debe ser un entero')
    .positive('El número de empleados debe ser positivo')
    .max(100000, 'El número de empleados no puede exceder 100,000')
    .optional(),

  founded_year: z.number()
    .int('El año de fundación debe ser un entero')
    .min(1800, 'El año de fundación debe ser posterior a 1800')
    .max(new Date().getFullYear(), 'El año de fundación no puede ser futuro')
    .optional(),

  okr_maturity: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),

  business_goals: z.array(z.string()).default([]),

  current_challenges: z.array(z.string()).default([]),

  initial_role: z.string().default('owner'),

  department: z.string().optional(),

  job_title: z.string().optional()
});

// AI validation schema
export const aiValidationSchema = z.object({
  session_id: z.string().uuid('ID de sesión debe ser un UUID válido'),
  step_data: z.record(z.any()),
  step_name: z.string()
    .min(1, 'Nombre del paso es requerido')
    .max(50, 'Nombre del paso no puede exceder 50 caracteres'),
  context: z.record(z.any()).optional()
});

// AI industry analysis schema
export const aiIndustryAnalysisSchema = z.object({
  company_name: z.string()
    .min(1, 'El nombre de la empresa es requerido')
    .max(255, 'El nombre de la empresa no puede exceder 255 caracteres'),

  description: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),

  website: z.string()
    .url('Debe ser una URL válida')
    .optional(),

  existing_industry: z.string()
    .max(100, 'La industria no puede exceder 100 caracteres')
    .optional(),

  additional_context: z.string()
    .max(500, 'El contexto adicional no puede exceder 500 caracteres')
    .optional()
});

// AI completion schema
export const aiCompletionSchema = z.object({
  session_id: z.string().uuid('ID de sesión debe ser un UUID válido'),
  partial_data: z.record(z.any()).optional(),
  completion_type: z.enum(['smart_fill', 'suggestions', 'full_analysis']).default('smart_fill'),
  fields_to_complete: z.array(z.string()).optional()
});

// Validation helpers
export const validateStepData = (stepNumber: number, data: unknown) => {
  switch (stepNumber) {
    case 1:
      return welcomeStepSchema.safeParse(data);
    case 2:
      return companyStepSchema.safeParse(data);
    case 3:
      return organizationStepSchema.safeParse(data);
    case 4:
      return preferencesStepSchema.safeParse(data);
    case 5:
      return reviewStepSchema.safeParse(data);
    default:
      return { success: false, error: { issues: [{ message: 'Número de paso no válido' }] } };
  }
};

export const getStepSchema = (stepNumber: number) => {
  switch (stepNumber) {
    case 1:
      return welcomeStepSchema;
    case 2:
      return companyStepSchema;
    case 3:
      return organizationStepSchema;
    case 4:
      return preferencesStepSchema;
    case 5:
      return reviewStepSchema;
    default:
      throw new Error(`Número de paso no válido: ${stepNumber}`);
  }
};

// Security validation
export const securitySchema = z.object({
  // Rate limiting
  user_id: z.string().min(1, 'ID de usuario requerido'),
  endpoint: z.string().min(1, 'Endpoint requerido'),
  ip_address: z.string().ip('Dirección IP no válida').optional(),

  // Input sanitization
  sanitize_html: z.boolean().default(true),
  allow_special_chars: z.boolean().default(false),
  max_length: z.number().positive().default(1000),

  // Session validation
  session_token: z.string().min(1, 'Token de sesión requerido').optional(),
  csrf_token: z.string().min(1, 'Token CSRF requerido').optional()
});

// Export all schemas
export {
  userPreferencesSchema,
  contextSchema,
  welcomeStepSchema,
  companyStepSchema,
  organizationStepSchema,
  preferencesStepSchema,
  reviewStepSchema,
  onboardingFormDataSchema,
  createSessionSchema,
  updateProgressSchema,
  completeOnboardingSchema,
  createOrganizationSchema,
  aiValidationSchema,
  aiIndustryAnalysisSchema,
  aiCompletionSchema,
  securitySchema
};