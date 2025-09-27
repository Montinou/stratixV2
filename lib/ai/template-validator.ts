import type {
  OKRTemplate,
  OKRValidationResult,
  KeyResult,
  Industry
} from '@/lib/types/ai'
import type {
  EnhancedOKRTemplate,
  EnhancedKeyResult,
  ExtendedIndustry,
  AdvancedTemplateContext
} from './template-engine'
import { ADVANCED_INDUSTRY_DATA, TEMPLATE_STYLES } from './industry-prompts'

/**
 * Advanced OKR Template Validator with Quality Scoring Algorithms
 * Provides comprehensive validation, quality assessment, and improvement recommendations
 */

// Quality scoring configuration
export interface QualityConfig {
  weights: {
    specificity: number
    measurability: number
    achievability: number
    relevance: number
    timebound: number
    industryAlignment: number
    roleAlignment: number
    strategicValue: number
  }
  thresholds: {
    excellent: number
    good: number
    acceptable: number
    poor: number
  }
  industryWeights: Record<ExtendedIndustry, Partial<QualityConfig['weights']>>
}

// Default quality configuration
export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  weights: {
    specificity: 0.20,
    measurability: 0.20,
    achievability: 0.15,
    relevance: 0.15,
    timebound: 0.10,
    industryAlignment: 0.10,
    roleAlignment: 0.05,
    strategicValue: 0.05
  },
  thresholds: {
    excellent: 0.90,
    good: 0.75,
    acceptable: 0.60,
    poor: 0.40
  },
  industryWeights: {
    technology: {
      measurability: 0.25,
      achievability: 0.10,
      industryAlignment: 0.15
    },
    finance: {
      measurability: 0.25,
      relevance: 0.20,
      industryAlignment: 0.15
    },
    healthcare: {
      achievability: 0.20,
      relevance: 0.20,
      industryAlignment: 0.15
    },
    fintech: {
      measurability: 0.25,
      relevance: 0.18,
      industryAlignment: 0.15
    },
    general: {}
  } as Record<ExtendedIndustry, Partial<QualityConfig['weights']>>
}

// Advanced validation result
export interface AdvancedValidationResult extends OKRValidationResult {
  detailedScores: {
    specificity: DetailedScore
    measurability: DetailedScore
    achievability: DetailedScore
    relevance: DetailedScore
    timebound: DetailedScore
    industryAlignment: DetailedScore
    roleAlignment: DetailedScore
    strategicValue: DetailedScore
  }
  qualityTier: 'excellent' | 'good' | 'acceptable' | 'poor'
  improvementPriority: 'high' | 'medium' | 'low'
  benchmarkComparison: BenchmarkComparison
  complianceCheck: ComplianceResult
  riskAssessment: RiskAssessment
  recommendations: QualityRecommendation[]
}

// Detailed score with explanation
export interface DetailedScore {
  score: number
  weight: number
  contribution: number
  explanation: string
  suggestions: string[]
  evidence: string[]
}

// Benchmark comparison
export interface BenchmarkComparison {
  industryBenchmark: number
  performanceVsBenchmark: 'above' | 'at' | 'below'
  percentileRank: number
  similarTemplates: string[]
  improvementGap: number
}

// Compliance result
export interface ComplianceResult {
  overallCompliance: number
  regulatoryRequirements: ComplianceCheck[]
  industryStandards: ComplianceCheck[]
  bestPractices: ComplianceCheck[]
  recommendations: string[]
}

export interface ComplianceCheck {
  requirement: string
  status: 'compliant' | 'partial' | 'non-compliant'
  description: string
  importance: 'critical' | 'important' | 'minor'
}

// Risk assessment
export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high'
  riskFactors: RiskFactor[]
  mitigationStrategies: string[]
  probabilityOfSuccess: number
}

export interface RiskFactor {
  type: 'technical' | 'resource' | 'market' | 'regulatory' | 'operational'
  description: string
  likelihood: number
  impact: number
  riskScore: number
  mitigation: string[]
}

// Quality recommendation
export interface QualityRecommendation {
  category: 'objective' | 'key-results' | 'initiatives' | 'metrics' | 'overall'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actions: string[]
  expectedImprovement: number
  effortRequired: 'low' | 'medium' | 'high'
}

/**
 * Advanced Template Validator Class
 */
export class AdvancedTemplateValidator {
  private config: QualityConfig
  private industryBenchmarks: Map<ExtendedIndustry, number> = new Map()
  private historicalData: Map<string, AdvancedValidationResult[]> = new Map()

  constructor(config: QualityConfig = DEFAULT_QUALITY_CONFIG) {
    this.config = config
    this.initializeBenchmarks()
  }

  /**
   * Validate enhanced OKR template with comprehensive analysis
   */
  validateEnhancedTemplate(
    template: EnhancedOKRTemplate,
    context?: AdvancedTemplateContext
  ): AdvancedValidationResult {
    const weights = this.getAdjustedWeights(context?.extendedIndustry || context?.industry)

    // Calculate detailed scores
    const detailedScores = {
      specificity: this.validateSpecificity(template, context),
      measurability: this.validateMeasurability(template, context),
      achievability: this.validateAchievability(template, context),
      relevance: this.validateRelevance(template, context),
      timebound: this.validateTimebound(template, context),
      industryAlignment: this.validateIndustryAlignment(template, context),
      roleAlignment: this.validateRoleAlignment(template, context),
      strategicValue: this.validateStrategicValue(template, context)
    }

    // Calculate weighted overall score
    const score = Object.entries(detailedScores).reduce((total, [key, detailScore]) => {
      const weight = weights[key as keyof typeof weights]
      detailScore.weight = weight
      detailScore.contribution = detailScore.score * weight
      return total + detailScore.contribution
    }, 0)

    // Determine quality tier
    const qualityTier = this.determineQualityTier(score)

    // Generate improvement priority
    const improvementPriority = this.determineImprovementPriority(score, detailedScores)

    // Benchmark comparison
    const benchmarkComparison = this.compareToBenchmark(template, context, score)

    // Compliance check
    const complianceCheck = this.checkCompliance(template, context)

    // Risk assessment
    const riskAssessment = this.assessRisks(template, context)

    // Generate recommendations
    const recommendations = this.generateRecommendations(template, detailedScores, context)

    // Create basic validation result for backward compatibility
    const basicFeedback = {
      objectiveQuality: detailedScores.specificity.score,
      keyResultsQuality: detailedScores.measurability.score,
      measurabilityScore: detailedScores.measurability.score,
      timelineRealism: detailedScores.timebound.score,
      industryAlignment: detailedScores.industryAlignment.score
    }

    const improvements = recommendations
      .filter(r => r.priority === 'high')
      .map(r => r.description)

    const warnings = recommendations
      .filter(r => r.priority === 'medium')
      .map(r => r.description)

    const result: AdvancedValidationResult = {
      isValid: score >= this.config.thresholds.acceptable,
      score,
      feedback: basicFeedback,
      improvements,
      warnings,
      detailedScores,
      qualityTier,
      improvementPriority,
      benchmarkComparison,
      complianceCheck,
      riskAssessment,
      recommendations
    }

    // Store historical data
    this.storeHistoricalData(template, result)

    return result
  }

  /**
   * Validate template specificity (how clear and specific the objectives are)
   */
  private validateSpecificity(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    const objective = template.objective
    const title = objective.title
    const description = objective.description

    // Title specificity
    if (title.length >= 20 && title.length <= 80) {
      score += 0.3
      evidence.push('Título con longitud apropiada')
    } else if (title.length < 20) {
      suggestions.push('El título del objetivo necesita ser más descriptivo')
    } else {
      suggestions.push('El título del objetivo es muy largo, hazlo más conciso')
    }

    // Action words specificity
    const specificActions = ['desarrollar', 'implementar', 'crear', 'establecer', 'optimizar', 'reducir']
    const hasSpecificAction = specificActions.some(action => title.toLowerCase().includes(action))
    if (hasSpecificAction) {
      score += 0.2
      evidence.push('Contiene verbos de acción específicos')
    } else {
      suggestions.push('Usa verbos de acción más específicos (desarrollar, implementar, crear, etc.)')
    }

    // Quantifiable elements
    const hasNumbers = /\d+/.test(title + description)
    if (hasNumbers) {
      score += 0.2
      evidence.push('Incluye elementos cuantificables')
    } else {
      suggestions.push('Considera incluir números o metas específicas en el objetivo')
    }

    // Industry-specific terminology
    if (context?.extendedIndustry || context?.industry) {
      const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                          ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

      if (industryData) {
        const hasIndustryTerms = industryData.industrySpecificTerms.some(term =>
          (title + description).toLowerCase().includes(term.toLowerCase())
        )
        if (hasIndustryTerms) {
          score += 0.2
          evidence.push('Utiliza terminología específica de la industria')
        } else {
          suggestions.push(`Considera incluir terminología específica de ${industryData.name}`)
        }
      }
    }

    // Context specificity
    if (context?.companySize) {
      const sizeRelevantTerms = {
        startup: ['validar', 'construir', 'lanzar', 'escalar'],
        small: ['crecer', 'establecer', 'desarrollar'],
        medium: ['optimizar', 'expandir', 'sistematizar'],
        large: ['transformar', 'liderar', 'innovar'],
        enterprise: ['transformar', 'globalmente', 'estratégicamente']
      }

      const relevantTerms = sizeRelevantTerms[context.companySize]
      const hasRelevantTerms = relevantTerms.some(term =>
        (title + description).toLowerCase().includes(term)
      )

      if (hasRelevantTerms) {
        score += 0.1
        evidence.push(`Apropiado para empresa ${context.companySize}`)
      }
    }

    return {
      score: Math.min(score, 1),
      weight: 0, // Will be set later
      contribution: 0, // Will be calculated later
      explanation: `Evaluación de especificidad basada en claridad, términos de acción y contexto`,
      suggestions,
      evidence
    }
  }

  /**
   * Validate template measurability (how well can progress be measured)
   */
  private validateMeasurability(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    // Key Results measurability
    const keyResults = template.keyResults
    const measurableKRs = keyResults.filter(kr => this.isKeyResultMeasurable(kr))
    const measurabilityRatio = measurableKRs.length / keyResults.length

    score += measurabilityRatio * 0.6
    if (measurabilityRatio === 1) {
      evidence.push('Todos los Key Results son medibles')
    } else if (measurabilityRatio >= 0.8) {
      evidence.push('La mayoría de Key Results son medibles')
    } else {
      suggestions.push('Más Key Results necesitan ser cuantificables y medibles')
    }

    // Measurement type diversity
    const measurementTypes = new Set(keyResults.map(kr => kr.measurementType))
    if (measurementTypes.size >= 2) {
      score += 0.15
      evidence.push('Usa diferentes tipos de medición')
    } else {
      suggestions.push('Considera diversificar los tipos de medición (porcentaje, número, moneda)')
    }

    // Baseline and targets
    const hasBaselines = keyResults.filter(kr => kr.baseline).length
    if (hasBaselines >= keyResults.length * 0.5) {
      score += 0.1
      evidence.push('Incluye líneas base para comparación')
    } else {
      suggestions.push('Agrega líneas base para mejor medición del progreso')
    }

    // Frequency appropriateness
    const hasAppropriateFrequency = keyResults.filter(kr =>
      (template.objective.timeframe === 'quarterly' && ['weekly', 'monthly'].includes(kr.frequency)) ||
      (template.objective.timeframe === 'annual' && ['monthly', 'quarterly'].includes(kr.frequency))
    ).length

    if (hasAppropriateFrequency >= keyResults.length * 0.8) {
      score += 0.1
      evidence.push('Frecuencias de medición apropiadas')
    } else {
      suggestions.push('Ajusta las frecuencias de medición al marco temporal del objetivo')
    }

    // Industry-specific metrics
    if (context?.extendedIndustry || context?.industry) {
      const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                          ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

      if (industryData) {
        const allMetrics = [
          ...industryData.keyMetrics.financial,
          ...industryData.keyMetrics.operational,
          ...industryData.keyMetrics.customer,
          ...industryData.keyMetrics.innovation
        ]

        const hasIndustryMetrics = keyResults.some(kr =>
          allMetrics.some(metric => kr.title.toLowerCase().includes(metric.toLowerCase()))
        )

        if (hasIndustryMetrics) {
          score += 0.05
          evidence.push('Incluye métricas estándar de la industria')
        } else {
          suggestions.push(`Considera incluir métricas estándar de ${industryData.name}`)
        }
      }
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: 'Evaluación de medibilidad basada en Key Results cuantificables y métricas apropiadas',
      suggestions,
      evidence
    }
  }

  /**
   * Validate template achievability (realistic but challenging goals)
   */
  private validateAchievability(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0.7 // Start with assumption of achievability
    const suggestions: string[] = []
    const evidence: string[] = []

    // Analyze target ambition levels
    const keyResults = template.keyResults
    const ambitiousTargets = keyResults.filter(kr => this.isAmbitiousTarget(kr.target))
    const conservativeTargets = keyResults.filter(kr => this.isConservativeTarget(kr.target))

    // Balance between ambitious and achievable
    const ambitiousRatio = ambitiousTargets.length / keyResults.length

    if (ambitiousRatio >= 0.3 && ambitiousRatio <= 0.7) {
      score += 0.2
      evidence.push('Balance apropiado entre ambición y factibilidad')
    } else if (ambitiousRatio > 0.7) {
      score -= 0.3
      suggestions.push('Algunos objetivos pueden ser demasiado ambiciosos')
    } else {
      score -= 0.1
      suggestions.push('Los objetivos podrían ser más ambiciosos para generar mayor impacto')
    }

    // Resource requirements vs company size
    if (context?.companySize && template.resourceRequirements) {
      const resourceComplexity = this.assessResourceComplexity(template.resourceRequirements)
      const sizeCapability = this.getCompanySizeCapability(context.companySize)

      if (resourceComplexity <= sizeCapability) {
        score += 0.1
        evidence.push('Recursos requeridos apropiados para el tamaño de empresa')
      } else {
        score -= 0.2
        suggestions.push('Los recursos requeridos pueden exceder la capacidad de la empresa')
      }
    }

    // Timeline realism
    const complexityLevel = template.complexityLevel
    const timeframe = template.objective.timeframe

    if ((complexityLevel === 'beginner' && timeframe === 'quarterly') ||
        (complexityLevel === 'intermediate' && (timeframe === 'quarterly' || timeframe === 'annual')) ||
        (complexityLevel === 'advanced' && timeframe === 'annual')) {
      score += 0.1
      evidence.push('Marco temporal apropiado para la complejidad')
    } else {
      suggestions.push('Ajusta el marco temporal según la complejidad del objetivo')
    }

    // Dependency management
    if (template.dependencies && template.dependencies.length > 0) {
      if (template.dependencies.length <= 3) {
        evidence.push('Dependencias manejables identificadas')
      } else {
        score -= 0.1
        suggestions.push('Demasiadas dependencias pueden afectar la factibilidad')
      }
    }

    return {
      score: Math.max(0, Math.min(score, 1)),
      weight: 0,
      contribution: 0,
      explanation: 'Evaluación de factibilidad basada en ambición, recursos y complejidad',
      suggestions,
      evidence
    }
  }

  /**
   * Validate template relevance (alignment with business goals)
   */
  private validateRelevance(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    // Industry relevance
    if (context?.extendedIndustry || context?.industry) {
      const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                          ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

      if (industryData) {
        // Check focus areas alignment
        const templateText = (template.objective.title + ' ' + template.objective.description).toLowerCase()
        const alignedFocusAreas = industryData.focusAreas.filter(area =>
          templateText.includes(area.toLowerCase())
        )

        if (alignedFocusAreas.length > 0) {
          score += 0.3
          evidence.push(`Alineado con áreas de enfoque de ${industryData.name}`)
        } else {
          suggestions.push(`Considera alinear con las áreas de enfoque de ${industryData.name}`)
        }

        // Check common objectives alignment
        const alignedObjectives = industryData.commonObjectives.filter(obj =>
          templateText.includes(obj.toLowerCase())
        )

        if (alignedObjectives.length > 0) {
          score += 0.2
          evidence.push('Alineado con objetivos comunes de la industria')
        }
      }
    }

    // Role relevance
    if (context?.role) {
      const roleScore = this.validateRoleSpecificRelevance(template, context.role, context)
      score += roleScore * 0.2
      if (roleScore > 0.7) {
        evidence.push(`Apropiado para el rol ${context.role}`)
      } else {
        suggestions.push(`Ajustar para ser más relevante para el rol ${context.role}`)
      }
    }

    // Company stage relevance
    if (context?.companyStage) {
      const stageRelevance = this.validateStageRelevance(template, context.companyStage)
      score += stageRelevance * 0.15
      if (stageRelevance > 0.7) {
        evidence.push(`Apropiado para empresa en etapa ${context.companyStage}`)
      }
    }

    // Strategic importance
    if (template.objective.strategicImportance >= 7) {
      score += 0.15
      evidence.push('Alto valor estratégico')
    } else {
      suggestions.push('Considera aumentar el valor estratégico del objetivo')
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: 'Evaluación de relevancia basada en alineación industria, rol y estrategia',
      suggestions,
      evidence
    }
  }

  /**
   * Validate time-bound nature of objectives
   */
  private validateTimebound(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    // Timeframe clarity
    const timeframe = template.objective.timeframe
    if (['quarterly', 'annual'].includes(timeframe)) {
      score += 0.4
      evidence.push(`Marco temporal claro: ${timeframe}`)
    } else {
      suggestions.push('Define un marco temporal específico (trimestral o anual)')
    }

    // Key Results frequency alignment
    const keyResults = template.keyResults
    const appropriateFrequencies = keyResults.filter(kr => {
      if (timeframe === 'quarterly') {
        return ['weekly', 'monthly'].includes(kr.frequency)
      } else if (timeframe === 'annual') {
        return ['monthly', 'quarterly'].includes(kr.frequency)
      }
      return false
    })

    const frequencyAlignment = appropriateFrequencies.length / keyResults.length
    score += frequencyAlignment * 0.3

    if (frequencyAlignment >= 0.8) {
      evidence.push('Frecuencias de medición bien alineadas')
    } else {
      suggestions.push('Ajusta las frecuencias de medición al marco temporal')
    }

    // Milestone distribution
    if (template.initiatives && template.initiatives.length > 0) {
      score += 0.2
      evidence.push('Incluye iniciativas con distribución temporal')
    } else {
      suggestions.push('Agrega iniciativas con hitos temporales específicos')
    }

    // Urgency and priority
    if (template.objective.strategicImportance >= 8) {
      score += 0.1
      evidence.push('Alta prioridad estratégica indica urgencia apropiada')
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: 'Evaluación temporal basada en claridad de marcos temporales y alineación',
      suggestions,
      evidence
    }
  }

  /**
   * Validate industry alignment
   */
  private validateIndustryAlignment(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0.5 // Base score
    const suggestions: string[] = []
    const evidence: string[] = []

    if (!context?.extendedIndustry && !context?.industry) {
      return {
        score: 0.8,
        weight: 0,
        contribution: 0,
        explanation: 'No se especificó industria para validación',
        suggestions: ['Especifica la industria para obtener mejor alineación'],
        evidence: []
      }
    }

    const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                        ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

    if (!industryData) {
      return {
        score: 0.6,
        weight: 0,
        contribution: 0,
        explanation: 'Datos de industria no disponibles',
        suggestions: ['Usar categoría general para mejor validación'],
        evidence: []
      }
    }

    // Check industry-specific terms usage
    const templateText = JSON.stringify(template).toLowerCase()
    const usedTerms = industryData.industrySpecificTerms.filter(term =>
      templateText.includes(term.toLowerCase())
    )

    if (usedTerms.length >= 2) {
      score += 0.25
      evidence.push(`Usa terminología específica de ${industryData.name}: ${usedTerms.slice(0, 2).join(', ')}`)
    } else if (usedTerms.length === 1) {
      score += 0.1
      evidence.push(`Usa algo de terminología específica de ${industryData.name}`)
    } else {
      suggestions.push(`Incluye terminología específica de ${industryData.name}`)
    }

    // Check metrics alignment
    const allIndustryMetrics = [
      ...industryData.keyMetrics.financial,
      ...industryData.keyMetrics.operational,
      ...industryData.keyMetrics.customer,
      ...industryData.keyMetrics.innovation
    ]

    const alignedMetrics = template.keyResults.filter(kr =>
      allIndustryMetrics.some(metric => kr.title.toLowerCase().includes(metric.toLowerCase()))
    )

    if (alignedMetrics.length >= template.keyResults.length * 0.5) {
      score += 0.25
      evidence.push('Métricas alineadas con estándares de la industria')
    } else {
      suggestions.push(`Incluye más métricas estándar de ${industryData.name}`)
    }

    // Check risk considerations
    const templateRisks = template.risks.join(' ').toLowerCase()
    const relevantRisks = industryData.riskFactors.filter(risk =>
      templateRisks.includes(risk.toLowerCase())
    )

    if (relevantRisks.length > 0) {
      score += 0.15
      evidence.push(`Considera riesgos específicos de ${industryData.name}`)
    } else {
      suggestions.push(`Incluye riesgos específicos como: ${industryData.riskFactors.slice(0, 2).join(', ')}`)
    }

    // Check regulatory considerations
    if (template.complianceConsiderations && template.complianceConsiderations.length > 0) {
      const hasRegulatoryAlignment = industryData.regulations.some(reg =>
        template.complianceConsiderations.some(comp => comp.toLowerCase().includes(reg.toLowerCase()))
      )

      if (hasRegulatoryAlignment) {
        score += 0.1
        evidence.push('Considera aspectos regulatorios relevantes')
      }
    } else if (industryData.regulations.length > 0) {
      suggestions.push(`Considera regulaciones como: ${industryData.regulations.slice(0, 2).join(', ')}`)
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: `Evaluación de alineación específica con la industria ${industryData.name}`,
      suggestions,
      evidence
    }
  }

  /**
   * Validate role alignment
   */
  private validateRoleAlignment(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    if (!context?.role) {
      return {
        score: 0.8,
        weight: 0,
        contribution: 0,
        explanation: 'No se especificó rol para validación',
        suggestions: [],
        evidence: []
      }
    }

    return this.validateRoleSpecificAlignment(template, context.role, context)
  }

  /**
   * Validate strategic value
   */
  private validateStrategicValue(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    // Strategic importance score
    const strategicImportance = template.objective.strategicImportance
    score += (strategicImportance / 10) * 0.4

    if (strategicImportance >= 8) {
      evidence.push('Alto valor estratégico identificado')
    } else if (strategicImportance >= 6) {
      evidence.push('Valor estratégico moderado')
    } else {
      suggestions.push('Considera aumentar el valor estratégico del objetivo')
    }

    // Expected impact assessment
    const impactScore = {
      'high': 0.3,
      'medium': 0.2,
      'low': 0.1
    }[template.expectedImpact] || 0.15

    score += impactScore

    // Stakeholder impact assessment
    const primaryStakeholders = template.stakeholderImpact.primary.length
    const secondaryStakeholders = template.stakeholderImpact.secondary.length

    if (primaryStakeholders >= 2) {
      score += 0.15
      evidence.push('Impacto significativo en stakeholders primarios')
    }

    if (secondaryStakeholders >= 1) {
      score += 0.1
      evidence.push('Consideración de stakeholders secundarios')
    }

    // Business objectives alignment
    if (context?.businessObjectives && context.businessObjectives.length > 0) {
      const templateText = (template.objective.title + ' ' + template.objective.description).toLowerCase()
      const alignedObjectives = context.businessObjectives.filter(obj =>
        templateText.includes(obj.toLowerCase()) || obj.toLowerCase().includes(templateText.substring(0, 20))
      )

      if (alignedObjectives.length > 0) {
        score += 0.05
        evidence.push('Alineado con objetivos de negocio específicos')
      } else {
        suggestions.push('Alinear mejor con los objetivos estratégicos del negocio')
      }
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: 'Evaluación de valor estratégico basada en importancia e impacto',
      suggestions,
      evidence
    }
  }

  // Helper methods
  private isKeyResultMeasurable(keyResult: EnhancedKeyResult): boolean {
    if (!keyResult.target) return false

    const target = keyResult.target.toLowerCase()
    const hasMeasurableType = ['percentage', 'number', 'currency'].includes(keyResult.measurementType)
    const hasNumbers = /\d+/.test(target)
    const hasMeasurableTerms = ['%', 'porcentaje', 'unidades', 'puntos', '$', 'euros', 'días', 'horas', 'incrementar', 'reducir', 'aumentar'].some(term => target.includes(term))

    return hasMeasurableType && (hasNumbers || hasMeasurableTerms)
  }

  private isAmbitiousTarget(target: string): boolean {
    const ambitiousIndicators = ['100%', '50%', '90%', 'duplicar', 'triplicar', 'transformar', 'revolucionar']
    return ambitiousIndicators.some(indicator => target.toLowerCase().includes(indicator))
  }

  private isConservativeTarget(target: string): boolean {
    const conservativeIndicators = ['5%', '10%', 'mantener', 'estable', 'incremental']
    return conservativeIndicators.some(indicator => target.toLowerCase().includes(indicator))
  }

  private assessResourceComplexity(resourceRequirements: string[]): number {
    // Simple complexity assessment based on resource requirements
    const complexWords = ['nuevo', 'adicional', 'especializado', 'externo', 'avanzado']
    const complexity = resourceRequirements.reduce((total, req) => {
      const reqLower = req.toLowerCase()
      const complexCount = complexWords.filter(word => reqLower.includes(word)).length
      return total + complexCount
    }, 0)

    return Math.min(complexity / resourceRequirements.length, 1)
  }

  private getCompanySizeCapability(companySize: string): number {
    const capabilities = {
      startup: 0.3,
      small: 0.5,
      medium: 0.7,
      large: 0.9,
      enterprise: 1.0
    }
    return capabilities[companySize as keyof typeof capabilities] || 0.5
  }

  private validateRoleSpecificRelevance(template: EnhancedOKRTemplate, role: string, context?: AdvancedTemplateContext): number {
    if (!context?.extendedIndustry && !context?.industry) return 0.7

    const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                        ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

    if (!industryData) return 0.7

    const roleResponsibilities = industryData.roleResponsibilities[role as keyof typeof industryData.roleResponsibilities] || []
    const templateText = (template.objective.title + ' ' + template.objective.description).toLowerCase()

    const relevantResponsibilities = roleResponsibilities.filter(resp =>
      templateText.includes(resp.toLowerCase()) || resp.toLowerCase().includes(templateText.substring(0, 20))
    )

    return Math.min(relevantResponsibilities.length / Math.max(roleResponsibilities.length, 1), 1)
  }

  private validateStageRelevance(template: EnhancedOKRTemplate, stage: string): number {
    const stageKeywords = {
      early: ['validar', 'construir', 'lanzar', 'mvp', 'piloto', 'inicial'],
      growth: ['escalar', 'expandir', 'crecer', 'optimizar', 'sistematizar'],
      mature: ['transformar', 'liderar', 'innovar', 'eficiencia', 'excelencia']
    }

    const keywords = stageKeywords[stage as keyof typeof stageKeywords] || []
    const templateText = (template.objective.title + ' ' + template.objective.description).toLowerCase()

    const relevantKeywords = keywords.filter(keyword => templateText.includes(keyword))
    return Math.min(relevantKeywords.length / Math.max(keywords.length, 1), 1)
  }

  private validateRoleSpecificAlignment(template: EnhancedOKRTemplate, role: string, context?: AdvancedTemplateContext): DetailedScore {
    let score = 0
    const suggestions: string[] = []
    const evidence: string[] = []

    // Role-specific validation logic
    const roleRelevance = this.validateRoleSpecificRelevance(template, role, context)
    score += roleRelevance

    if (roleRelevance >= 0.7) {
      evidence.push(`Altamente relevante para el rol ${role}`)
    } else if (roleRelevance >= 0.4) {
      evidence.push(`Moderadamente relevante para el rol ${role}`)
    } else {
      suggestions.push(`Ajustar objetivos para ser más específicos del rol ${role}`)
    }

    return {
      score: Math.min(score, 1),
      weight: 0,
      contribution: 0,
      explanation: `Evaluación de alineación específica con el rol ${role}`,
      suggestions,
      evidence
    }
  }

  private getAdjustedWeights(industry?: ExtendedIndustry | Industry): QualityConfig['weights'] {
    const baseWeights = { ...this.config.weights }

    if (industry && this.config.industryWeights[industry as ExtendedIndustry]) {
      const industryAdjustments = this.config.industryWeights[industry as ExtendedIndustry]
      return { ...baseWeights, ...industryAdjustments }
    }

    return baseWeights
  }

  private determineQualityTier(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= this.config.thresholds.excellent) return 'excellent'
    if (score >= this.config.thresholds.good) return 'good'
    if (score >= this.config.thresholds.acceptable) return 'acceptable'
    return 'poor'
  }

  private determineImprovementPriority(score: number, detailedScores: any): 'high' | 'medium' | 'low' {
    if (score < this.config.thresholds.acceptable) return 'high'

    const lowScores = Object.values(detailedScores).filter((s: any) => s.score < 0.6).length
    if (lowScores >= 3) return 'high'
    if (lowScores >= 1) return 'medium'

    return 'low'
  }

  private compareToBenchmark(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext, score?: number): BenchmarkComparison {
    const industry = context?.extendedIndustry || context?.industry || 'general'
    const benchmark = this.industryBenchmarks.get(industry as ExtendedIndustry) || 0.75

    return {
      industryBenchmark: benchmark,
      performanceVsBenchmark: score && score > benchmark ? 'above' : score === benchmark ? 'at' : 'below',
      percentileRank: score ? Math.round((score / benchmark) * 100) : 50,
      similarTemplates: [], // Would be populated from historical data
      improvementGap: score ? Math.max(0, benchmark - score) : 0
    }
  }

  private checkCompliance(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): ComplianceResult {
    const checks: ComplianceCheck[] = []

    // Add basic compliance checks
    checks.push({
      requirement: 'SMART Criteria',
      status: 'compliant', // Would be determined by validation
      description: 'Objetivos siguen criterios SMART',
      importance: 'critical'
    })

    // Industry-specific compliance
    if (context?.extendedIndustry || context?.industry) {
      const industryData = ADVANCED_INDUSTRY_DATA[context.extendedIndustry as keyof typeof ADVANCED_INDUSTRY_DATA] ||
                          ADVANCED_INDUSTRY_DATA[context.industry as keyof typeof ADVANCED_INDUSTRY_DATA]

      if (industryData && industryData.regulations.length > 0) {
        industryData.regulations.forEach(regulation => {
          checks.push({
            requirement: regulation,
            status: template.complianceConsiderations?.some(comp =>
              comp.toLowerCase().includes(regulation.toLowerCase())
            ) ? 'compliant' : 'partial',
            description: `Consideración de ${regulation}`,
            importance: 'important'
          })
        })
      }
    }

    const compliantChecks = checks.filter(c => c.status === 'compliant').length
    const overallCompliance = compliantChecks / checks.length

    return {
      overallCompliance,
      regulatoryRequirements: checks.filter(c => c.importance === 'critical'),
      industryStandards: checks.filter(c => c.importance === 'important'),
      bestPractices: checks.filter(c => c.importance === 'minor'),
      recommendations: overallCompliance < 0.8 ? ['Revisar cumplimiento normativo'] : []
    }
  }

  private assessRisks(template: EnhancedOKRTemplate, context?: AdvancedTemplateContext): RiskAssessment {
    const riskFactors: RiskFactor[] = []

    // Analyze identified risks
    template.risks.forEach(risk => {
      riskFactors.push({
        type: 'operational',
        description: risk,
        likelihood: 0.3, // Would be assessed more sophisticated
        impact: 0.5,
        riskScore: 0.15,
        mitigation: ['Monitoreo regular', 'Plan de contingencia']
      })
    })

    // Add complexity-based risks
    if (template.complexityLevel === 'advanced') {
      riskFactors.push({
        type: 'technical',
        description: 'Complejidad alta puede afectar la entrega',
        likelihood: 0.4,
        impact: 0.7,
        riskScore: 0.28,
        mitigation: ['Dividir en fases', 'Revisiones frecuentes']
      })
    }

    const averageRiskScore = riskFactors.reduce((sum, rf) => sum + rf.riskScore, 0) / riskFactors.length || 0
    const overallRiskLevel = averageRiskScore > 0.5 ? 'high' : averageRiskScore > 0.25 ? 'medium' : 'low'

    return {
      overallRiskLevel,
      riskFactors,
      mitigationStrategies: ['Plan de contingencia', 'Monitoreo continuo', 'Revisiones regulares'],
      probabilityOfSuccess: Math.max(0.1, 1 - averageRiskScore)
    }
  }

  private generateRecommendations(
    template: EnhancedOKRTemplate,
    detailedScores: any,
    context?: AdvancedTemplateContext
  ): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = []

    // Generate recommendations based on low scores
    Object.entries(detailedScores).forEach(([category, score]: [string, any]) => {
      if (score.score < 0.7) {
        recommendations.push({
          category: category as any,
          priority: score.score < 0.5 ? 'high' : 'medium',
          title: `Mejorar ${category}`,
          description: score.explanation,
          actions: score.suggestions,
          expectedImprovement: (0.8 - score.score) * 100,
          effortRequired: score.score < 0.3 ? 'high' : 'medium'
        })
      }
    })

    return recommendations
  }

  private initializeBenchmarks(): void {
    // Initialize industry benchmarks (would come from data analysis)
    this.industryBenchmarks.set('technology', 0.82)
    this.industryBenchmarks.set('finance', 0.78)
    this.industryBenchmarks.set('healthcare', 0.75)
    this.industryBenchmarks.set('retail', 0.73)
    this.industryBenchmarks.set('manufacturing', 0.76)
    this.industryBenchmarks.set('general', 0.75)
  }

  private storeHistoricalData(template: EnhancedOKRTemplate, result: AdvancedValidationResult): void {
    const key = `${template.objective.category}_${template.metadata.industryData}`
    const existing = this.historicalData.get(key) || []
    existing.push(result)
    this.historicalData.set(key, existing.slice(-100)) // Keep last 100 results
  }

  /**
   * Get historical validation data for analysis
   */
  getHistoricalData(category?: string, industry?: string): AdvancedValidationResult[] {
    if (category && industry) {
      return this.historicalData.get(`${category}_${industry}`) || []
    }

    const allData: AdvancedValidationResult[] = []
    this.historicalData.forEach(results => allData.push(...results))
    return allData
  }

  /**
   * Update quality configuration
   */
  updateConfig(newConfig: Partial<QualityConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Export singleton instance
export const advancedValidator = new AdvancedTemplateValidator()

// Export backward compatible function
export function validateOKRTemplateAdvanced(
  template: OKRTemplate | EnhancedOKRTemplate,
  industry?: Industry
): AdvancedValidationResult {
  return advancedValidator.validateEnhancedTemplate(template as EnhancedOKRTemplate, { industry })
}

// Export all validation utilities
export {
  AdvancedTemplateValidator,
  DEFAULT_QUALITY_CONFIG
}

export type {
  AdvancedValidationResult,
  DetailedScore,
  BenchmarkComparison,
  ComplianceResult,
  RiskAssessment,
  QualityRecommendation,
  QualityConfig
}