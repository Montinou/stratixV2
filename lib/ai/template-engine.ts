import { aiClient } from './gateway-client'
import { generateAdvancedPrompt, ADVANCED_INDUSTRY_DATA, TEMPLATE_STYLES } from './industry-prompts'
import { validateOKRTemplateAdvanced } from './okr-validator'
import { withCache, CACHE_PRESETS } from './cache-layer'
import { withRateLimit, getRateLimitConfig } from './rate-limiter'
import { randomUUID } from 'crypto'
import type {
  OKRTemplateContext,
  OKRTemplate,
  OKRGenerationRequest,
  OKRGenerationResponse,
  Industry,
  CompanySize,
  UserRole
} from '@/lib/types/ai'

/**
 * Advanced OKR Template Generation Engine
 * Provides industry-specific, role-specific, and context-aware OKR template generation
 * with advanced customization, versioning, and analytics
 */

// Extended industry types from industry-prompts.ts
export type ExtendedIndustry = Industry |
  'fintech' | 'healthtech' | 'edtech' | 'proptech' | 'logistics' |
  'automotive' | 'aerospace' | 'energy' | 'telecommunications' |
  'media' | 'hospitality' | 'agriculture' | 'nonprofit' | 'government' | 'legal'

// Template generation modes
export type GenerationMode = 'standard' | 'creative' | 'conservative' | 'aggressive'

// Template quality tiers
export type QualityTier = 'basic' | 'standard' | 'premium' | 'enterprise'

// Template customization options
export interface TemplateCustomization {
  includeRisks?: boolean
  includeInitiatives?: boolean
  includeSuccessCriteria?: boolean
  includeComplianceConsiderations?: boolean
  includeStakeholderImpact?: boolean
  focusOnSpecificMetrics?: string[]
  excludeTerms?: string[]
  customInstructions?: string
  preferredLanguageStyle?: 'formal' | 'casual' | 'technical' | 'business'
  emphasizeAreas?: string[]
}

// Advanced template context
export interface AdvancedTemplateContext extends OKRTemplateContext {
  extendedIndustry?: ExtendedIndustry
  generationMode?: GenerationMode
  qualityTier?: QualityTier
  templateStyle?: keyof typeof TEMPLATE_STYLES
  customization?: TemplateCustomization
  existingOKRs?: OKRTemplate[]
  competitorBenchmarks?: string[]
  regulatoryRequirements?: string[]
  budgetConstraints?: string
  resourceLimitations?: string[]
  marketConditions?: string
  businessObjectives?: string[]
}

// Enhanced key result with additional metadata
export interface EnhancedKeyResult {
  title: string
  description: string
  target: string
  measurementType: 'percentage' | 'number' | 'boolean' | 'currency'
  baseline?: string
  frequency: 'weekly' | 'monthly' | 'quarterly'
  industryBenchmark?: string
  riskFactors?: string[]
  dependencies?: string[]
  dataSource?: string
  automationPossible?: boolean
  difficultyLevel?: 1 | 2 | 3 | 4 | 5
  strategicAlignment?: number // 1-10 scale
}

// Enhanced OKR template with advanced features
export interface EnhancedOKRTemplate {
  id: string
  version: string
  objective: {
    title: string
    description: string
    category: string
    timeframe: 'quarterly' | 'annual'
    industryAlignment: string
    roleSpecific: string
    strategicImportance: number // 1-10 scale
    difficultyLevel: number // 1-10 scale
  }
  keyResults: EnhancedKeyResult[]
  initiatives: string[]
  metrics: string[]
  risks: string[]
  successCriteria: string[]
  confidenceScore: number
  industryRelevance: number
  styleAlignment: number
  complexityLevel: 'beginner' | 'intermediate' | 'advanced'
  stakeholderImpact: {
    primary: string[]
    secondary: string[]
  }
  complianceConsiderations: string[]
  estimatedEffort: 'low' | 'medium' | 'high'
  expectedImpact: 'low' | 'medium' | 'high'
  resourceRequirements: string[]
  dependencies: string[]
  metadata: {
    generatedAt: Date
    model: string
    provider: string
    promptVersion: string
    qualityScore: number
    industryData: string
  }
}

// Template generation analytics
export interface TemplateGenerationAnalytics {
  requestId: string
  userId?: string
  context: AdvancedTemplateContext
  generationTime: number
  templatesGenerated: number
  qualityScores: number[]
  averageQuality: number
  modelUsed: string
  providerUsed: string
  cacheHit: boolean
  rateLimitHit: boolean
  errorOccurred: boolean
  errorDetails?: string
  costEstimate: number
  feedback?: TemplateFeedback[]
}

// User feedback on templates
export interface TemplateFeedback {
  templateId: string
  userId: string
  rating: 1 | 2 | 3 | 4 | 5
  usefulness: 1 | 2 | 3 | 4 | 5
  accuracy: 1 | 2 | 3 | 4 | 5
  relevance: 1 | 2 | 3 | 4 | 5
  comments?: string
  improvements?: string[]
  timestamp: Date
}

// A/B testing configuration
export interface ABTestConfig {
  enabled: boolean
  testId: string
  variants: {
    control: TemplateVariant
    treatment: TemplateVariant
  }
  splitRatio: number // 0.5 = 50/50 split
  metrics: string[]
  minSampleSize: number
  confidenceLevel: number
}

// Template variant for A/B testing
export interface TemplateVariant {
  name: string
  promptModifications: string[]
  customization: TemplateCustomization
  expectedOutcome: string
}

/**
 * Advanced Template Generation Engine Class
 */
export class AdvancedTemplateEngine {
  private analytics: TemplateGenerationAnalytics[] = []
  private templateVersions: Map<string, EnhancedOKRTemplate[]> = new Map()
  private abTests: Map<string, ABTestConfig> = new Map()

  /**
   * Generate enhanced OKR templates with advanced features
   */
  async generateAdvancedTemplates(
    context: AdvancedTemplateContext,
    numberOfTemplates: number = 3
  ): Promise<{
    templates: EnhancedOKRTemplate[]
    analytics: TemplateGenerationAnalytics
    alternatives: EnhancedOKRTemplate[]
    improvements: string[]
  }> {
    const startTime = Date.now()
    const requestId = randomUUID()

    try {
      // Validate and prepare context
      const validatedContext = await this.validateAndEnhanceContext(context)

      // Check for A/B testing
      const abTestConfig = this.getActiveABTest(validatedContext)
      if (abTestConfig) {
        return await this.generateWithABTest(validatedContext, numberOfTemplates, abTestConfig, requestId, startTime)
      }

      // Generate primary templates
      const primaryTemplates = await this.generatePrimaryTemplates(validatedContext, numberOfTemplates)

      // Generate alternative templates with different approaches
      const alternativeTemplates = await this.generateAlternativeTemplates(validatedContext, 2)

      // Validate all templates
      const validatedPrimary = await this.validateAndEnhanceTemplates(primaryTemplates, validatedContext)
      const validatedAlternatives = await this.validateAndEnhanceTemplates(alternativeTemplates, validatedContext)

      // Generate improvement suggestions
      const improvements = await this.generateImprovementSuggestions(validatedPrimary, validatedContext)

      // Create analytics record
      const analytics = this.createAnalyticsRecord(
        requestId,
        validatedContext,
        validatedPrimary,
        Date.now() - startTime
      )

      // Store analytics
      this.analytics.push(analytics)

      // Version templates
      await this.versionTemplates(validatedPrimary)

      return {
        templates: validatedPrimary,
        analytics,
        alternatives: validatedAlternatives,
        improvements
      }

    } catch (error) {
      console.error('Advanced template generation failed:', error)

      // Return fallback with analytics
      const analytics = this.createErrorAnalyticsRecord(
        requestId,
        context,
        error as Error,
        Date.now() - startTime
      )
      this.analytics.push(analytics)

      throw error
    }
  }

  /**
   * Generate primary templates using advanced prompts
   */
  private async generatePrimaryTemplates(
    context: AdvancedTemplateContext,
    numberOfTemplates: number
  ): Promise<EnhancedOKRTemplate[]> {
    const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                       ADVANCED_INDUSTRY_DATA.general

    // Build advanced prompt
    const prompt = generateAdvancedPrompt(
      context,
      context.templateStyle || 'traditional',
      numberOfTemplates
    )

    // Use appropriate model based on quality tier
    const modelConfig = this.getModelForQualityTier(context.qualityTier || 'standard')

    const response = await aiClient.generateText(prompt, {
      maxTokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
      model: modelConfig.model
    })

    // Parse and enhance response
    let parsedResponse: { templates: any[] }
    try {
      parsedResponse = JSON.parse(response.trim())
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError}`)
    }

    if (!parsedResponse.templates || !Array.isArray(parsedResponse.templates)) {
      throw new Error('Invalid AI response structure')
    }

    // Convert to enhanced templates
    return parsedResponse.templates.map((template, index) => this.convertToEnhancedTemplate(
      template,
      context,
      `${randomUUID()}-${index}`,
      '1.0.0'
    ))
  }

  /**
   * Generate alternative templates with different approaches
   */
  private async generateAlternativeTemplates(
    context: AdvancedTemplateContext,
    numberOfTemplates: number
  ): Promise<EnhancedOKRTemplate[]> {
    const alternativeContexts = this.createAlternativeContexts(context)
    const alternatives: EnhancedOKRTemplate[] = []

    for (const altContext of alternativeContexts.slice(0, numberOfTemplates)) {
      try {
        const templates = await this.generatePrimaryTemplates(altContext, 1)
        alternatives.push(...templates)
      } catch (error) {
        console.warn('Failed to generate alternative template:', error)
      }
    }

    return alternatives
  }

  /**
   * Create alternative contexts for diverse template generation
   */
  private createAlternativeContexts(context: AdvancedTemplateContext): AdvancedTemplateContext[] {
    const alternatives: AdvancedTemplateContext[] = []

    // Different template styles
    const styles = Object.keys(TEMPLATE_STYLES).filter(style => style !== context.templateStyle)
    styles.forEach(style => {
      alternatives.push({
        ...context,
        templateStyle: style as keyof typeof TEMPLATE_STYLES,
        generationMode: 'creative'
      })
    })

    // Different generation modes
    const modes: GenerationMode[] = ['conservative', 'aggressive', 'creative']
    modes.forEach(mode => {
      if (mode !== context.generationMode) {
        alternatives.push({
          ...context,
          generationMode: mode
        })
      }
    })

    // Different role perspectives
    const roles: UserRole[] = ['corporativo', 'gerente', 'empleado']
    roles.forEach(role => {
      if (role !== context.role) {
        alternatives.push({
          ...context,
          role
        })
      }
    })

    return alternatives
  }

  /**
   * Validate and enhance templates with additional metadata
   */
  private async validateAndEnhanceTemplates(
    templates: EnhancedOKRTemplate[],
    context: AdvancedTemplateContext
  ): Promise<EnhancedOKRTemplate[]> {
    return templates.map(template => {
      const validation = validateOKRTemplateAdvanced(template, context.industry)

      return {
        ...template,
        metadata: {
          ...template.metadata,
          qualityScore: validation.score
        }
      }
    })
  }

  /**
   * Generate improvement suggestions based on templates and context
   */
  private async generateImprovementSuggestions(
    templates: EnhancedOKRTemplate[],
    context: AdvancedTemplateContext
  ): Promise<string[]> {
    const suggestions: string[] = []

    // Analyze template quality
    const averageQuality = templates.reduce((sum, t) => sum + t.metadata.qualityScore, 0) / templates.length

    if (averageQuality < 0.7) {
      suggestions.push('Considera proporcionar más contexto específico de tu industria para mejorar la relevancia')
    }

    if (averageQuality < 0.8) {
      suggestions.push('Los objetivos podrían ser más específicos y medibles')
    }

    // Industry-specific suggestions
    const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA]
    if (industryData) {
      suggestions.push(`Considera incluir métricas específicas de ${industryData.name}: ${industryData.keyMetrics.financial.slice(0, 2).join(', ')}`)
    }

    // Context-specific suggestions
    if (context.companyStage === 'early') {
      suggestions.push('Para empresas en etapa temprana, enfócate en métricas de tracción y validación de mercado')
    }

    if (context.budgetConstraints) {
      suggestions.push('Considera objetivos que maximicen el impacto con recursos limitados')
    }

    return suggestions
  }

  /**
   * Convert basic template to enhanced template
   */
  private convertToEnhancedTemplate(
    template: any,
    context: AdvancedTemplateContext,
    id: string,
    version: string
  ): EnhancedOKRTemplate {
    return {
      id,
      version,
      objective: {
        ...template.objective,
        industryAlignment: template.objective.industryAlignment || 'Alineado con mejores prácticas de la industria',
        roleSpecific: template.objective.roleSpecific || `Específico para rol ${context.role || 'general'}`,
        strategicImportance: template.objective.strategicImportance || 8,
        difficultyLevel: template.objective.difficultyLevel || 7
      },
      keyResults: template.keyResults.map((kr: any) => ({
        ...kr,
        industryBenchmark: kr.industryBenchmark || 'Benchmark estándar de la industria',
        riskFactors: kr.riskFactors || ['Factores externos del mercado'],
        dependencies: kr.dependencies || [],
        dataSource: kr.dataSource || 'Sistema de métricas interno',
        automationPossible: kr.automationPossible || false,
        difficultyLevel: kr.difficultyLevel || 3,
        strategicAlignment: kr.strategicAlignment || 8
      })),
      initiatives: template.initiatives || [],
      metrics: template.metrics || [],
      risks: template.risks || [],
      successCriteria: template.successCriteria || [],
      confidenceScore: template.confidenceScore || 0.8,
      industryRelevance: template.industryRelevance || 0.9,
      styleAlignment: template.styleAlignment || 0.85,
      complexityLevel: template.complexityLevel || 'intermediate',
      stakeholderImpact: template.stakeholderImpact || {
        primary: ['Equipo directo', 'Departamento'],
        secondary: ['Otros departamentos', 'Clientes']
      },
      complianceConsiderations: template.complianceConsiderations || [],
      estimatedEffort: template.estimatedEffort || 'medium',
      expectedImpact: template.expectedImpact || 'medium',
      resourceRequirements: template.resourceRequirements || ['Recursos estándar del equipo'],
      dependencies: template.dependencies || [],
      metadata: {
        generatedAt: new Date(),
        model: 'openai/gpt-4o-mini',
        provider: 'openai',
        promptVersion: '2.0-advanced',
        qualityScore: 0.8,
        industryData: context.extendedIndustry || context.industry
      }
    }
  }

  /**
   * Get model configuration based on quality tier
   */
  private getModelForQualityTier(tier: QualityTier) {
    const configs = {
      basic: {
        model: 'openai/gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.7
      },
      standard: {
        model: 'openai/gpt-4o-mini',
        maxTokens: 3000,
        temperature: 0.6
      },
      premium: {
        model: 'openai/gpt-4o',
        maxTokens: 4000,
        temperature: 0.5
      },
      enterprise: {
        model: 'anthropic/claude-3-sonnet-20240229',
        maxTokens: 5000,
        temperature: 0.4
      }
    }

    return configs[tier]
  }

  /**
   * Validate and enhance context with additional data
   */
  private async validateAndEnhanceContext(context: AdvancedTemplateContext): Promise<AdvancedTemplateContext> {
    // Add industry-specific enhancements
    const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA]

    if (industryData && !context.regulatoryRequirements) {
      context.regulatoryRequirements = industryData.regulations
    }

    if (industryData && !context.competitorBenchmarks) {
      context.competitorBenchmarks = industryData.benchmarkKPIs
    }

    // Set defaults
    context.generationMode = context.generationMode || 'standard'
    context.qualityTier = context.qualityTier || 'standard'
    context.templateStyle = context.templateStyle || 'traditional'

    return context
  }

  /**
   * Create analytics record for successful generation
   */
  private createAnalyticsRecord(
    requestId: string,
    context: AdvancedTemplateContext,
    templates: EnhancedOKRTemplate[],
    generationTime: number
  ): TemplateGenerationAnalytics {
    const qualityScores = templates.map(t => t.metadata.qualityScore)

    return {
      requestId,
      context,
      generationTime,
      templatesGenerated: templates.length,
      qualityScores,
      averageQuality: qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length,
      modelUsed: templates[0]?.metadata.model || 'unknown',
      providerUsed: templates[0]?.metadata.provider || 'unknown',
      cacheHit: false,
      rateLimitHit: false,
      errorOccurred: false,
      costEstimate: this.estimateCost(templates.length, generationTime)
    }
  }

  /**
   * Create analytics record for failed generation
   */
  private createErrorAnalyticsRecord(
    requestId: string,
    context: AdvancedTemplateContext,
    error: Error,
    generationTime: number
  ): TemplateGenerationAnalytics {
    return {
      requestId,
      context,
      generationTime,
      templatesGenerated: 0,
      qualityScores: [],
      averageQuality: 0,
      modelUsed: 'unknown',
      providerUsed: 'unknown',
      cacheHit: false,
      rateLimitHit: false,
      errorOccurred: true,
      errorDetails: error.message,
      costEstimate: 0
    }
  }

  /**
   * Estimate cost based on generation complexity
   */
  private estimateCost(templateCount: number, generationTime: number): number {
    const baseCost = 0.002 // Base cost per template
    const timeFactor = generationTime / 1000 * 0.0001 // Time-based cost
    return templateCount * baseCost + timeFactor
  }

  /**
   * Version templates for tracking and improvements
   */
  private async versionTemplates(templates: EnhancedOKRTemplate[]): Promise<void> {
    templates.forEach(template => {
      const existingVersions = this.templateVersions.get(template.objective.title) || []
      existingVersions.push(template)
      this.templateVersions.set(template.objective.title, existingVersions)
    })
  }

  /**
   * A/B testing functionality
   */
  private getActiveABTest(context: AdvancedTemplateContext): ABTestConfig | null {
    // Implementation for A/B testing logic
    const activeTests = Array.from(this.abTests.values()).filter(test => test.enabled)

    // Simple hash-based assignment (in production, use more sophisticated logic)
    if (activeTests.length > 0) {
      const hash = this.hashContext(context)
      const testIndex = hash % activeTests.length
      return activeTests[testIndex]
    }

    return null
  }

  private async generateWithABTest(
    context: AdvancedTemplateContext,
    numberOfTemplates: number,
    abTest: ABTestConfig,
    requestId: string,
    startTime: number
  ): Promise<any> {
    // A/B testing implementation
    const isControlGroup = Math.random() < abTest.splitRatio
    const variant = isControlGroup ? abTest.variants.control : abTest.variants.treatment

    // Apply variant modifications to context
    const modifiedContext = {
      ...context,
      customization: {
        ...context.customization,
        ...variant.customization
      }
    }

    // Generate with modified context
    return await this.generateAdvancedTemplates(modifiedContext, numberOfTemplates)
  }

  private hashContext(context: AdvancedTemplateContext): number {
    const str = JSON.stringify(context)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Get template analytics
   */
  getAnalytics(): TemplateGenerationAnalytics[] {
    return this.analytics
  }

  /**
   * Submit template feedback
   */
  async submitFeedback(feedback: TemplateFeedback): Promise<void> {
    // Store feedback for continuous improvement
    const analytics = this.analytics.find(a =>
      a.context.specificGoals?.includes(feedback.templateId)
    )

    if (analytics) {
      analytics.feedback = analytics.feedback || []
      analytics.feedback.push(feedback)
    }
  }

  /**
   * Clear analytics (for testing or privacy)
   */
  clearAnalytics(): void {
    this.analytics = []
  }
}

// Export cached and rate-limited version
const templateEngineBase = new AdvancedTemplateEngine()

export const generateAdvancedOKRTemplates = withCache(
  'generateAdvancedOKRTemplates',
  withRateLimit(
    'generateAdvancedOKRTemplates',
    (context: AdvancedTemplateContext, numberOfTemplates?: number) =>
      templateEngineBase.generateAdvancedTemplates(context, numberOfTemplates),
    getRateLimitConfig(),
    (context: AdvancedTemplateContext) =>
      `adv_okr_${context.extendedIndustry || context.industry}_${context.companySize}_${context.role || 'general'}_${context.templateStyle || 'traditional'}`
  ),
  CACHE_PRESETS.templates
)

// Export the template engine instance
export const advancedTemplateEngine = templateEngineBase

// Export types
export type {
  AdvancedTemplateContext,
  EnhancedOKRTemplate,
  EnhancedKeyResult,
  TemplateCustomization,
  TemplateGenerationAnalytics,
  TemplateFeedback,
  ABTestConfig,
  GenerationMode,
  QualityTier
}