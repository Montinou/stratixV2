/**
 * AI Service Connection for Onboarding
 * Connects to existing Motor AI Completo infrastructure with onboarding-specific configuration
 */

import { aiClient } from './gateway-client'
import type {
  AIGatewayConfig,
  TextGenerationOptions,
  EmbeddingOptions,
  HealthCheckResult,
  AIOperationContext,
  ValidationResult
} from '@/lib/types/ai'

export interface OnboardingAIConfig extends AIGatewayConfig {
  enableOnboardingSuggestions?: boolean
  enableIndustrySpecificPrompts?: boolean
  enableProgressTracking?: boolean
  onboardingModelPreferences?: {
    textModel?: string
    embeddingModel?: string
  }
}

export interface OnboardingContext {
  userId?: string
  sessionId?: string
  currentStep?: string
  industry?: string
  companySize?: string
  role?: string
  organizationData?: Record<string, any>
  progressData?: Record<string, any>
}

export interface OnboardingAIResponse<T = any> {
  success: boolean
  data?: T
  suggestions?: string[]
  confidence?: number
  reasoning?: string
  fallbackUsed?: boolean
  cached?: boolean
  error?: string
}

export class OnboardingAIService {
  private static instance: OnboardingAIService
  private config: OnboardingAIConfig
  private healthStatus: HealthCheckResult | null = null
  private lastHealthCheck: Date | null = null
  private readonly healthCheckInterval = 5 * 60 * 1000 // 5 minutes

  private constructor(config: OnboardingAIConfig = {}) {
    this.config = {
      enableOnboardingSuggestions: true,
      enableIndustrySpecificPrompts: true,
      enableProgressTracking: true,
      onboardingModelPreferences: {
        textModel: 'openai/gpt-4o-mini', // Budget-friendly for onboarding
        embeddingModel: 'openai/text-embedding-3-small'
      },
      ...config
    }
  }

  public static getInstance(config?: OnboardingAIConfig): OnboardingAIService {
    if (!OnboardingAIService.instance) {
      OnboardingAIService.instance = new OnboardingAIService(config)
    }
    return OnboardingAIService.instance
  }

  /**
   * Initialize and validate AI service connection
   */
  public async initialize(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Validate AI Gateway client configuration
      aiClient.validateConfiguration()
    } catch (error) {
      errors.push(`AI Gateway configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Check environment variables specific to onboarding
    if (!process.env.AI_GATEWAY_API_KEY) {
      errors.push('AI_GATEWAY_API_KEY environment variable is required')
    }

    // Perform initial health check
    try {
      const health = await this.checkHealth()
      if (health.status === 'unhealthy') {
        errors.push('AI Gateway health check failed')
      } else if (health.status === 'degraded') {
        warnings.push('AI Gateway is running with degraded performance')
      }
    } catch (error) {
      warnings.push('Unable to perform initial health check')
    }

    // Check if onboarding-specific features are enabled
    if (!this.config.enableOnboardingSuggestions) {
      warnings.push('Onboarding suggestions are disabled')
    }

    if (!this.config.enableIndustrySpecificPrompts) {
      warnings.push('Industry-specific prompts are disabled')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check AI service health with caching
   */
  public async checkHealth(): Promise<HealthCheckResult> {
    const now = new Date()

    // Return cached health status if recent
    if (this.healthStatus && this.lastHealthCheck &&
        (now.getTime() - this.lastHealthCheck.getTime()) < this.healthCheckInterval) {
      return this.healthStatus
    }

    try {
      this.healthStatus = await aiClient.healthCheck()
      this.lastHealthCheck = now
      return this.healthStatus
    } catch (error) {
      const errorResult: HealthCheckResult = {
        status: 'unhealthy',
        models: {},
        timestamp: now
      }
      this.healthStatus = errorResult
      this.lastHealthCheck = now
      return errorResult
    }
  }

  /**
   * Generate onboarding suggestions with context awareness
   */
  public async generateOnboardingSuggestions(
    prompt: string,
    context: OnboardingContext,
    options: TextGenerationOptions = {}
  ): Promise<OnboardingAIResponse<string>> {
    try {
      // Check if AI features are enabled
      if (!this.config.enableOnboardingSuggestions) {
        return {
          success: false,
          error: 'Onboarding AI suggestions are disabled'
        }
      }

      // Check health before making request
      const health = await this.checkHealth()
      if (health.status === 'unhealthy') {
        return {
          success: false,
          error: 'AI service is currently unavailable'
        }
      }

      // Enhance prompt with onboarding context
      const contextualPrompt = this.buildContextualPrompt(prompt, context)

      // Use preferred model for onboarding
      const modelOptions: TextGenerationOptions = {
        model: this.config.onboardingModelPreferences?.textModel,
        temperature: 0.7, // Balanced creativity for suggestions
        maxTokens: 500, // Reasonable limit for onboarding suggestions
        ...options
      }

      const operationContext: AIOperationContext = {
        operation: 'generateText',
        userId: context.userId,
        model: modelOptions.model || 'openai/gpt-4o-mini',
        timestamp: new Date(),
        metadata: {
          onboardingStep: context.currentStep,
          industry: context.industry,
          sessionId: context.sessionId
        }
      }

      const result = await aiClient.generateText(contextualPrompt, modelOptions)

      return {
        success: true,
        data: result,
        confidence: 0.8, // Default confidence for successful generation
        fallbackUsed: health.status === 'degraded'
      }

    } catch (error) {
      console.error('Onboarding AI suggestion generation failed:', error)

      // Attempt graceful degradation
      return this.handleAIFailure(error, 'suggestion_generation')
    }
  }

  /**
   * Generate embeddings for onboarding content
   */
  public async generateOnboardingEmbeddings(
    texts: string[],
    context: OnboardingContext,
    options: EmbeddingOptions = {}
  ): Promise<OnboardingAIResponse<number[][]>> {
    try {
      const health = await this.checkHealth()
      if (health.status === 'unhealthy') {
        return {
          success: false,
          error: 'AI service is currently unavailable'
        }
      }

      const embeddingOptions: EmbeddingOptions = {
        model: this.config.onboardingModelPreferences?.embeddingModel,
        ...options
      }

      const embeddings = await aiClient.generateEmbeddings(texts, embeddingOptions)

      return {
        success: true,
        data: embeddings,
        confidence: 0.9, // High confidence for embeddings
        fallbackUsed: health.status === 'degraded'
      }

    } catch (error) {
      console.error('Onboarding embedding generation failed:', error)
      return this.handleAIFailure(error, 'embedding_generation')
    }
  }

  /**
   * Validate onboarding data using AI
   */
  public async validateOnboardingData(
    data: Record<string, any>,
    context: OnboardingContext
  ): Promise<OnboardingAIResponse<{ isValid: boolean; suggestions: string[]; issues: string[] }>> {
    try {
      const health = await this.checkHealth()
      if (health.status === 'unhealthy') {
        return {
          success: false,
          error: 'AI service is currently unavailable'
        }
      }

      const validationPrompt = this.buildValidationPrompt(data, context)

      const result = await aiClient.generateText(validationPrompt, {
        model: this.config.onboardingModelPreferences?.textModel,
        temperature: 0.3, // Lower temperature for validation consistency
        maxTokens: 300
      })

      // Parse the validation result (in a real implementation, you'd have structured output)
      const validationResult = this.parseValidationResult(result)

      return {
        success: true,
        data: validationResult,
        confidence: 0.85
      }

    } catch (error) {
      console.error('Onboarding data validation failed:', error)
      return this.handleAIFailure(error, 'data_validation')
    }
  }

  /**
   * Get AI-powered progress insights
   */
  public async getProgressInsights(
    progressData: Record<string, any>,
    context: OnboardingContext
  ): Promise<OnboardingAIResponse<{ insights: string[]; recommendations: string[]; nextSteps: string[] }>> {
    try {
      if (!this.config.enableProgressTracking) {
        return {
          success: false,
          error: 'Progress tracking is disabled'
        }
      }

      const health = await this.checkHealth()
      if (health.status === 'unhealthy') {
        return {
          success: false,
          error: 'AI service is currently unavailable'
        }
      }

      const insightsPrompt = this.buildProgressInsightsPrompt(progressData, context)

      const result = await aiClient.generateText(insightsPrompt, {
        model: this.config.onboardingModelPreferences?.textModel,
        temperature: 0.6,
        maxTokens: 400
      })

      const insights = this.parseProgressInsights(result)

      return {
        success: true,
        data: insights,
        confidence: 0.75
      }

    } catch (error) {
      console.error('Progress insights generation failed:', error)
      return this.handleAIFailure(error, 'progress_insights')
    }
  }

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<OnboardingAIConfig>): void {
    this.config = { ...this.config, ...config }
    // Clear health cache when configuration changes
    this.healthStatus = null
    this.lastHealthCheck = null
  }

  /**
   * Get current service status
   */
  public getServiceStatus(): {
    configured: boolean
    healthy: boolean
    lastHealthCheck: Date | null
    featuresEnabled: {
      suggestions: boolean
      industryPrompts: boolean
      progressTracking: boolean
    }
  } {
    return {
      configured: !!process.env.AI_GATEWAY_API_KEY,
      healthy: this.healthStatus?.status === 'healthy',
      lastHealthCheck: this.lastHealthCheck,
      featuresEnabled: {
        suggestions: this.config.enableOnboardingSuggestions || false,
        industryPrompts: this.config.enableIndustrySpecificPrompts || false,
        progressTracking: this.config.enableProgressTracking || false
      }
    }
  }

  // Private helper methods

  private buildContextualPrompt(prompt: string, context: OnboardingContext): string {
    let contextualPrompt = prompt

    if (context.industry) {
      contextualPrompt += `\n\nIndustria: ${context.industry}`
    }

    if (context.companySize) {
      contextualPrompt += `\nTamaño de empresa: ${context.companySize}`
    }

    if (context.role) {
      contextualPrompt += `\nRol del usuario: ${context.role}`
    }

    if (context.currentStep) {
      contextualPrompt += `\nPaso actual del onboarding: ${context.currentStep}`
    }

    contextualPrompt += '\n\nPor favor, proporciona sugerencias específicas y relevantes en español.'

    return contextualPrompt
  }

  private buildValidationPrompt(data: Record<string, any>, context: OnboardingContext): string {
    return `Valida los siguientes datos de onboarding y proporciona sugerencias de mejora:

Datos: ${JSON.stringify(data, null, 2)}

Contexto:
- Industria: ${context.industry || 'No especificada'}
- Tamaño: ${context.companySize || 'No especificado'}
- Paso: ${context.currentStep || 'No especificado'}

Responde en el siguiente formato JSON:
{
  "isValid": boolean,
  "suggestions": ["sugerencia1", "sugerencia2"],
  "issues": ["problema1", "problema2"]
}`
  }

  private buildProgressInsightsPrompt(progressData: Record<string, any>, context: OnboardingContext): string {
    return `Analiza el progreso del onboarding y proporciona insights:

Datos de progreso: ${JSON.stringify(progressData, null, 2)}

Contexto:
- Industria: ${context.industry || 'No especificada'}
- Usuario: ${context.role || 'No especificado'}
- Paso actual: ${context.currentStep || 'No especificado'}

Responde en el siguiente formato JSON:
{
  "insights": ["insight1", "insight2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "nextSteps": ["paso1", "paso2"]
}`
  }

  private parseValidationResult(result: string): { isValid: boolean; suggestions: string[]; issues: string[] } {
    try {
      return JSON.parse(result)
    } catch {
      return {
        isValid: true,
        suggestions: ['Los datos parecen correctos'],
        issues: []
      }
    }
  }

  private parseProgressInsights(result: string): { insights: string[]; recommendations: string[]; nextSteps: string[] } {
    try {
      return JSON.parse(result)
    } catch {
      return {
        insights: ['Progreso normal detectado'],
        recommendations: ['Continúa con el siguiente paso'],
        nextSteps: ['Sigue las instrucciones del sistema']
      }
    }
  }

  private handleAIFailure(error: any, operation: string): OnboardingAIResponse {
    console.error(`AI operation ${operation} failed:`, error)

    // Return graceful degradation response
    return {
      success: false,
      error: 'AI service temporarily unavailable',
      suggestions: [
        'El sistema continúa funcionando sin asistencia de IA',
        'Por favor, procede manualmente con el onboarding'
      ]
    }
  }
}

// Export singleton instance
export const onboardingAI = OnboardingAIService.getInstance()

// Export utility functions for common onboarding AI operations
export const onboardingAIHelpers = {
  // Generate suggestions for specific onboarding steps
  getStepSuggestions: async (step: string, context: OnboardingContext) => {
    const prompt = `Proporciona sugerencias útiles para el paso "${step}" del proceso de onboarding.`
    return onboardingAI.generateOnboardingSuggestions(prompt, { ...context, currentStep: step })
  },

  // Validate organization data
  validateOrganizationData: async (orgData: Record<string, any>, context: OnboardingContext) => {
    return onboardingAI.validateOnboardingData(orgData, context)
  },

  // Get completion insights
  getCompletionInsights: async (completionData: Record<string, any>, context: OnboardingContext) => {
    return onboardingAI.getProgressInsights(completionData, context)
  },

  // Check if AI features are available
  isAIAvailable: async (): Promise<boolean> => {
    const health = await onboardingAI.checkHealth()
    return health.status !== 'unhealthy'
  },

  // Get feature availability status
  getFeatureStatus: () => {
    return onboardingAI.getServiceStatus()
  }
}