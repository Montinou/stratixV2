/**
 * Data Validation Service for Onboarding
 *
 * Provides comprehensive real-time validation for onboarding data
 * with step-specific rules, AI-powered validation, and error handling.
 *
 * Features:
 * - Real-time field validation
 * - Step-specific validation rules
 * - AI-powered content validation
 * - Business logic validation
 * - Internationalization support
 * - Performance optimization
 */

import { z } from 'zod';
import { OnboardingAIService } from '@/lib/ai/service-connection';
import { onboardingCache } from '@/lib/cache/redis';
import { trackEvent } from '@/lib/monitoring/analytics';
import type { OnboardingSession } from '@/lib/database/onboarding-types';

// Validation result interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation?: string;
}

export interface ValidationSuggestion {
  field: string;
  type: 'improvement' | 'alternative' | 'completion';
  message: string;
  value?: any;
  confidence: number;
}

export interface ValidationMetadata {
  validatedAt: string;
  validatedBy: string;
  stepNumber: number;
  duration: number;
  aiUsed: boolean;
  cacheHit: boolean;
}

// Validation configuration
export interface ValidationConfig {
  enableAI: boolean;
  enableCache: boolean;
  enableAnalytics: boolean;
  cacheTimeout: number;
  aiTimeout: number;
  language: 'es' | 'en';
  strictMode: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  enableAI: true,
  enableCache: true,
  enableAnalytics: true,
  cacheTimeout: 300, // 5 minutes
  aiTimeout: 5000, // 5 seconds
  language: 'es',
  strictMode: false
};

/**
 * Step 1: Welcome and Initial Configuration Validation
 */
const step1Schema = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),

  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),

  email: z.string()
    .email('Debe ser una dirección de correo válida')
    .max(100, 'El correo no puede exceder 100 caracteres'),

  jobTitle: z.string()
    .min(2, 'El cargo debe tener al menos 2 caracteres')
    .max(100, 'El cargo no puede exceder 100 caracteres')
    .optional(),

  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Debe ser un número de teléfono válido')
    .optional(),

  timezone: z.string()
    .min(1, 'Debe seleccionar una zona horaria')
    .max(50, 'Zona horaria inválida'),

  language: z.enum(['es', 'en'], {
    errorMap: () => ({ message: 'Debe seleccionar un idioma válido' })
  }),

  communicationPreferences: z.object({
    emailNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    weeklyReports: z.boolean()
  }).optional()
});

/**
 * Step 2: Organization Information Validation
 */
const step2Schema = z.object({
  organizationName: z.string()
    .min(2, 'El nombre de la organización debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-&.,]+$/, 'Nombre de organización contiene caracteres inválidos'),

  industry: z.string()
    .min(1, 'Debe seleccionar una industria')
    .max(50, 'Industria inválida'),

  organizationSize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Debe seleccionar un tamaño de organización válido' })
  }),

  employeeCount: z.number()
    .int('Debe ser un número entero')
    .min(1, 'Debe tener al menos 1 empleado')
    .max(1000000, 'Número de empleados demasiado alto'),

  website: z.string()
    .url('Debe ser una URL válida')
    .max(200, 'La URL no puede exceder 200 caracteres')
    .optional(),

  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),

  country: z.string()
    .min(2, 'Debe seleccionar un país')
    .max(50, 'País inválido'),

  city: z.string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(50, 'La ciudad no puede exceder 50 caracteres')
    .optional(),

  foundedYear: z.number()
    .int('Debe ser un año válido')
    .min(1800, 'Año muy antiguo')
    .max(new Date().getFullYear(), 'No puede ser un año futuro')
    .optional(),

  departments: z.array(z.string())
    .min(1, 'Debe especificar al menos un departamento')
    .max(20, 'No puede exceder 20 departamentos')
});

/**
 * Step 3: Objectives and Strategy Validation
 */
const step3Schema = z.object({
  businessGoals: z.array(z.string())
    .min(1, 'Debe definir al menos un objetivo empresarial')
    .max(10, 'No puede exceder 10 objetivos principales'),

  timeHorizon: z.enum(['quarterly', 'semi-annual', 'annual', 'multi-year'], {
    errorMap: () => ({ message: 'Debe seleccionar un horizonte temporal válido' })
  }),

  currentChallenges: z.array(z.string())
    .min(1, 'Debe identificar al menos un desafío actual')
    .max(10, 'No puede exceder 10 desafíos'),

  successMetrics: z.array(z.object({
    name: z.string().min(1, 'Nombre de métrica requerido'),
    target: z.string().min(1, 'Meta requerida'),
    unit: z.string().min(1, 'Unidad requerida'),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
  }))
    .min(1, 'Debe definir al menos una métrica de éxito')
    .max(15, 'No puede exceder 15 métricas'),

  okrMaturity: z.enum(['beginner', 'developing', 'proficient', 'advanced', 'expert'], {
    errorMap: () => ({ message: 'Debe seleccionar un nivel de madurez OKR válido' })
  }),

  strategicPriorities: z.array(z.string())
    .min(1, 'Debe definir al menos una prioridad estratégica')
    .max(7, 'No puede exceder 7 prioridades estratégicas'),

  competitiveAdvantages: z.array(z.string())
    .max(5, 'No puede exceder 5 ventajas competitivas')
    .optional()
});

/**
 * Step 4: OKR Configuration Validation
 */
const step4Schema = z.object({
  okrCycle: z.enum(['quarterly', 'monthly', 'bi-annual', 'annual'], {
    errorMap: () => ({ message: 'Debe seleccionar un ciclo OKR válido' })
  }),

  reviewFrequency: z.enum(['weekly', 'bi-weekly', 'monthly'], {
    errorMap: () => ({ message: 'Debe seleccionar una frecuencia de revisión válida' })
  }),

  objectives: z.array(z.object({
    title: z.string()
      .min(5, 'El título del objetivo debe tener al menos 5 caracteres')
      .max(100, 'El título no puede exceder 100 caracteres'),
    description: z.string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(300, 'La descripción no puede exceder 300 caracteres'),
    owner: z.string()
      .min(1, 'Debe asignar un responsable'),
    priority: z.enum(['high', 'medium', 'low']),
    category: z.string()
      .min(1, 'Debe seleccionar una categoría'),
    keyResults: z.array(z.object({
      title: z.string()
        .min(5, 'El título del KR debe tener al menos 5 caracteres')
        .max(150, 'El título no puede exceder 150 caracteres'),
      metric: z.string()
        .min(1, 'Debe especificar una métrica'),
      target: z.string()
        .min(1, 'Debe especificar una meta'),
      unit: z.string()
        .min(1, 'Debe especificar una unidad'),
      baseline: z.string()
        .min(1, 'Debe especificar una línea base')
    }))
      .min(1, 'Cada objetivo debe tener al menos 1 resultado clave')
      .max(5, 'No puede exceder 5 resultados clave por objetivo')
  }))
    .min(1, 'Debe definir al menos 1 objetivo')
    .max(5, 'No puede exceder 5 objetivos por ciclo'),

  teamStructure: z.object({
    departments: z.array(z.string()).min(1),
    roles: z.array(z.string()).min(1),
    hierarchyLevels: z.number().min(1).max(10)
  }),

  trackingPreferences: z.object({
    updateFrequency: z.enum(['daily', 'weekly', 'bi-weekly']),
    notificationSettings: z.object({
      deadlineReminders: z.boolean(),
      progressAlerts: z.boolean(),
      teamUpdates: z.boolean()
    }),
    reportingFormat: z.enum(['dashboard', 'email', 'presentation'])
  })
});

/**
 * Step 5: Final Review and Confirmation Validation
 */
const step5Schema = z.object({
  finalReview: z.boolean()
    .refine(val => val === true, 'Debe confirmar la revisión final'),

  termsAccepted: z.boolean()
    .refine(val => val === true, 'Debe aceptar los términos y condiciones'),

  dataProcessingConsent: z.boolean()
    .refine(val => val === true, 'Debe otorgar consentimiento para el procesamiento de datos'),

  communicationConsent: z.boolean()
    .optional(),

  feedbackOptIn: z.boolean()
    .optional(),

  launchPreferences: z.object({
    sendInvitations: z.boolean(),
    scheduleKickoff: z.boolean(),
    enableNotifications: z.boolean(),
    setupIntegrations: z.boolean()
  }),

  additionalComments: z.string()
    .max(1000, 'Los comentarios no pueden exceder 1000 caracteres')
    .optional()
});

// Step schemas mapping
const STEP_SCHEMAS = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
  5: step5Schema
} as const;

/**
 * Main Validation Service Class
 */
export class OnboardingValidationService {
  private config: ValidationConfig;
  private aiService: OnboardingAIService;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aiService = OnboardingAIService.getInstance();
  }

  /**
   * Validate step data with comprehensive checks
   */
  public async validateStep(
    stepNumber: number,
    data: Record<string, any>,
    context?: {
      userId?: string;
      sessionId?: string;
      previousSteps?: Record<string, any>;
    }
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.enableCache) {
        const cachedResult = await this.getCachedValidation(stepNumber, data);
        if (cachedResult) {
          cachedResult.metadata.cacheHit = true;
          cachedResult.metadata.duration = Date.now() - startTime;
          return cachedResult;
        }
      }

      // Get step schema
      const schema = STEP_SCHEMAS[stepNumber as keyof typeof STEP_SCHEMAS];
      if (!schema) {
        throw new Error(`Invalid step number: ${stepNumber}`);
      }

      // Perform basic validation
      const basicValidation = await this.performBasicValidation(schema, data);

      // Perform business logic validation
      const businessValidation = await this.performBusinessLogicValidation(
        stepNumber,
        data,
        context
      );

      // Perform AI validation if enabled
      let aiValidation: Partial<ValidationResult> = {
        errors: [],
        warnings: [],
        suggestions: []
      };

      if (this.config.enableAI) {
        aiValidation = await this.performAIValidation(stepNumber, data, context);
      }

      // Combine results
      const result: ValidationResult = {
        isValid: basicValidation.isValid && businessValidation.isValid,
        errors: [
          ...basicValidation.errors,
          ...businessValidation.errors,
          ...(aiValidation.errors || [])
        ],
        warnings: [
          ...basicValidation.warnings,
          ...businessValidation.warnings,
          ...(aiValidation.warnings || [])
        ],
        suggestions: [
          ...basicValidation.suggestions,
          ...businessValidation.suggestions,
          ...(aiValidation.suggestions || [])
        ],
        metadata: {
          validatedAt: new Date().toISOString(),
          validatedBy: 'OnboardingValidationService',
          stepNumber,
          duration: Date.now() - startTime,
          aiUsed: this.config.enableAI,
          cacheHit: false
        }
      };

      // Cache result
      if (this.config.enableCache) {
        await this.cacheValidation(stepNumber, data, result);
      }

      // Track validation
      if (this.config.enableAnalytics) {
        await this.trackValidation(result, context);
      }

      return result;

    } catch (error) {
      console.error('Validation error:', error);

      // Return error result
      const errorResult: ValidationResult = {
        isValid: false,
        errors: [{
          field: '_system',
          code: 'VALIDATION_ERROR',
          message: 'Error interno de validación',
          severity: 'error',
          context: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        warnings: [],
        suggestions: [],
        metadata: {
          validatedAt: new Date().toISOString(),
          validatedBy: 'OnboardingValidationService',
          stepNumber,
          duration: Date.now() - startTime,
          aiUsed: false,
          cacheHit: false
        }
      };

      if (this.config.enableAnalytics) {
        await this.trackValidation(errorResult, context);
      }

      return errorResult;
    }
  }

  /**
   * Validate field in real-time
   */
  public async validateField(
    stepNumber: number,
    fieldName: string,
    value: any,
    context?: Record<string, any>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    try {
      const schema = STEP_SCHEMAS[stepNumber as keyof typeof STEP_SCHEMAS];
      if (!schema) {
        return { errors: [], warnings: [], suggestions: [] };
      }

      // Create partial data object for validation
      const data = { [fieldName]: value };

      // Validate specific field
      const result = schema.safeParse(data);

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: ValidationSuggestion[] = [];

      if (!result.success) {
        const fieldErrors = result.error.errors.filter(err =>
          err.path.includes(fieldName)
        );

        errors.push(...fieldErrors.map(err => ({
          field: fieldName,
          code: err.code,
          message: err.message,
          severity: 'error' as const
        })));
      }

      // Add field-specific business logic validation
      const businessValidation = await this.validateFieldBusinessLogic(
        stepNumber,
        fieldName,
        value,
        context
      );

      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);
      suggestions.push(...businessValidation.suggestions);

      return { errors, warnings, suggestions };

    } catch (error) {
      console.error('Field validation error:', error);
      return {
        errors: [{
          field: fieldName,
          code: 'FIELD_VALIDATION_ERROR',
          message: 'Error validando el campo',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      };
    }
  }

  /**
   * Validate complete onboarding data
   */
  public async validateComplete(
    sessionData: Record<number, Record<string, any>>,
    context?: { userId?: string; sessionId?: string }
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allSuggestions: ValidationSuggestion[] = [];

    // Validate each step
    for (const [stepNumber, stepData] of Object.entries(sessionData)) {
      const stepNum = parseInt(stepNumber);
      const stepResult = await this.validateStep(stepNum, stepData, {
        ...context,
        previousSteps: Object.fromEntries(
          Object.entries(sessionData).filter(([s]) => parseInt(s) < stepNum)
        )
      });

      allErrors.push(...stepResult.errors);
      allWarnings.push(...stepResult.warnings);
      allSuggestions.push(...stepResult.suggestions);
    }

    // Cross-step validation
    const crossValidation = await this.performCrossStepValidation(sessionData);
    allErrors.push(...crossValidation.errors);
    allWarnings.push(...crossValidation.warnings);
    allSuggestions.push(...crossValidation.suggestions);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      metadata: {
        validatedAt: new Date().toISOString(),
        validatedBy: 'OnboardingValidationService',
        stepNumber: 0, // Complete validation
        duration: Date.now() - startTime,
        aiUsed: this.config.enableAI,
        cacheHit: false
      }
    };
  }

  /**
   * Perform basic schema validation
   */
  private async performBasicValidation(
    schema: z.ZodSchema,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        metadata: {} as ValidationMetadata
      };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      code: err.code,
      message: err.message,
      severity: 'error'
    }));

    return {
      isValid: false,
      errors,
      warnings: [],
      suggestions: [],
      metadata: {} as ValidationMetadata
    };
  }

  /**
   * Perform business logic validation
   */
  private async performBusinessLogicValidation(
    stepNumber: number,
    data: Record<string, any>,
    context?: any
  ): Promise<Pick<ValidationResult, 'isValid' | 'errors' | 'warnings' | 'suggestions'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    switch (stepNumber) {
      case 1:
        // Email domain validation
        if (data.email && this.isDisposableEmail(data.email)) {
          warnings.push({
            field: 'email',
            code: 'DISPOSABLE_EMAIL',
            message: 'Considera usar tu correo empresarial',
            recommendation: 'Los correos empresariales facilitan la gestión del equipo'
          });
        }
        break;

      case 2:
        // Organization consistency checks
        if (data.employeeCount && data.organizationSize) {
          const sizeRanges = {
            startup: [1, 10],
            small: [11, 50],
            medium: [51, 200],
            large: [201, 1000],
            enterprise: [1001, Infinity]
          };

          const [min, max] = sizeRanges[data.organizationSize as keyof typeof sizeRanges] || [0, 0];
          if (data.employeeCount < min || data.employeeCount > max) {
            warnings.push({
              field: 'employeeCount',
              code: 'SIZE_MISMATCH',
              message: `El número de empleados no coincide con el tamaño "${data.organizationSize}"`,
              recommendation: 'Verifica que la información sea consistente'
            });
          }
        }
        break;

      case 3:
        // Business goals and metrics alignment
        if (data.businessGoals && data.successMetrics) {
          if (data.successMetrics.length < data.businessGoals.length) {
            suggestions.push({
              field: 'successMetrics',
              type: 'improvement',
              message: 'Considera agregar más métricas para cada objetivo empresarial',
              confidence: 0.8
            });
          }
        }
        break;

      case 4:
        // OKR best practices validation
        if (data.objectives) {
          for (const [index, objective] of data.objectives.entries()) {
            if (objective.keyResults && objective.keyResults.length > 3) {
              warnings.push({
                field: `objectives.${index}.keyResults`,
                code: 'TOO_MANY_KRS',
                message: 'Se recomienda un máximo de 3 resultados clave por objetivo',
                recommendation: 'Los KRs más específicos son más fáciles de medir'
              });
            }
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Perform AI-powered validation
   */
  private async performAIValidation(
    stepNumber: number,
    data: Record<string, any>,
    context?: any
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    try {
      // Use AI service to validate content quality and provide suggestions
      const aiSuggestions = await this.aiService.generateSuggestions(
        `Valida y mejora estos datos del paso ${stepNumber} de onboarding: ${JSON.stringify(data)}`,
        {
          step: stepNumber,
          industry: context?.previousSteps?.[2]?.industry,
          organizationSize: context?.previousSteps?.[2]?.organizationSize
        }
      );

      return {
        errors: [],
        warnings: [],
        suggestions: [
          {
            field: '_ai',
            type: 'improvement',
            message: aiSuggestions,
            confidence: 0.7
          }
        ]
      };

    } catch (error) {
      console.error('AI validation error:', error);
      return { errors: [], warnings: [], suggestions: [] };
    }
  }

  /**
   * Validate specific field business logic
   */
  private async validateFieldBusinessLogic(
    stepNumber: number,
    fieldName: string,
    value: any,
    context?: any
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Field-specific business validation
    if (fieldName === 'email' && typeof value === 'string') {
      if (this.isDisposableEmail(value)) {
        warnings.push({
          field: fieldName,
          code: 'DISPOSABLE_EMAIL',
          message: 'Considera usar tu correo empresarial',
          recommendation: 'Los correos empresariales facilitan la gestión del equipo'
        });
      }
    }

    if (fieldName === 'organizationName' && typeof value === 'string') {
      if (value.length < 5) {
        suggestions.push({
          field: fieldName,
          type: 'improvement',
          message: 'Un nombre más descriptivo ayuda a identificar mejor tu organización',
          confidence: 0.6
        });
      }
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Perform cross-step validation
   */
  private async performCrossStepValidation(
    sessionData: Record<number, Record<string, any>>
  ): Promise<Pick<ValidationResult, 'errors' | 'warnings' | 'suggestions'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check consistency across steps
    const step1 = sessionData[1];
    const step2 = sessionData[2];
    const step3 = sessionData[3];
    const step4 = sessionData[4];

    // Email domain consistency
    if (step1?.email && step2?.website) {
      const emailDomain = step1.email.split('@')[1];
      const websiteDomain = step2.website.replace(/^https?:\/\//, '').replace(/^www\./, '');

      if (emailDomain && websiteDomain && !websiteDomain.includes(emailDomain)) {
        warnings.push({
          field: 'cross_validation',
          code: 'DOMAIN_MISMATCH',
          message: 'El dominio del correo no coincide con el sitio web de la organización',
          recommendation: 'Verifica que la información sea consistente'
        });
      }
    }

    // Objectives and metrics alignment
    if (step3?.businessGoals && step4?.objectives) {
      if (step4.objectives.length < step3.businessGoals.length) {
        suggestions.push({
          field: 'cross_validation',
          type: 'improvement',
          message: 'Considera crear objetivos OKR para todos tus objetivos empresariales',
          confidence: 0.9
        });
      }
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Cache validation result
   */
  private async cacheValidation(
    stepNumber: number,
    data: Record<string, any>,
    result: ValidationResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(stepNumber, data);
      await onboardingCache.set(
        `validation_${cacheKey}`,
        result,
        this.config.cacheTimeout
      );
    } catch (error) {
      console.error('Failed to cache validation:', error);
    }
  }

  /**
   * Get cached validation result
   */
  private async getCachedValidation(
    stepNumber: number,
    data: Record<string, any>
  ): Promise<ValidationResult | null> {
    try {
      const cacheKey = this.generateCacheKey(stepNumber, data);
      return await onboardingCache.get(`validation_${cacheKey}`);
    } catch (error) {
      console.error('Failed to get cached validation:', error);
      return null;
    }
  }

  /**
   * Generate cache key for validation data
   */
  private generateCacheKey(stepNumber: number, data: Record<string, any>): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    const hash = this.simpleHash(dataString);
    return `step${stepNumber}_${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if email is from a disposable email provider
   */
  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'throwaway.email'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  /**
   * Track validation for analytics
   */
  private async trackValidation(
    result: ValidationResult,
    context?: any
  ): Promise<void> {
    try {
      await trackEvent('onboarding_validation', {
        stepNumber: result.metadata.stepNumber,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        suggestionCount: result.suggestions.length,
        duration: result.metadata.duration,
        aiUsed: result.metadata.aiUsed,
        cacheHit: result.metadata.cacheHit,
        userId: context?.userId,
        sessionId: context?.sessionId
      });
    } catch (error) {
      console.error('Failed to track validation:', error);
    }
  }
}

/**
 * Factory function to create validation service
 */
export function createValidationService(
  config?: Partial<ValidationConfig>
): OnboardingValidationService {
  return new OnboardingValidationService(config);
}

/**
 * Utility functions for validation
 */

/**
 * Validate single field with schema
 */
export function validateField(
  schema: z.ZodSchema,
  fieldName: string,
  value: any
): { isValid: boolean; errors: string[] } {
  try {
    schema.parse({ [fieldName]: value });
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors
        .filter(err => err.path.includes(fieldName))
        .map(err => err.message);
      return { isValid: false, errors };
    }
    return { isValid: false, errors: ['Error de validación desconocido'] };
  }
}

/**
 * Get validation schema for step
 */
export function getStepSchema(stepNumber: number): z.ZodSchema | null {
  return STEP_SCHEMAS[stepNumber as keyof typeof STEP_SCHEMAS] || null;
}

// Export validation schemas for external use
export {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  STEP_SCHEMAS
};

// Export types
export type { ValidationConfig };