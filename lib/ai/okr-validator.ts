import type {
  OKRTemplate,
  OKRValidationResult,
  KeyResult,
  Industry
} from '@/lib/types/ai'

/**
 * Advanced OKR validation utilities for quality assurance
 */

// Industry-specific validation rules
const INDUSTRY_VALIDATION_RULES = {
  technology: {
    requiredMetrics: ['time', 'quality', 'adoption', 'performance'],
    commonObjectives: ['develop', 'improve', 'optimize', 'launch', 'scale'],
    riskFactors: ['technical debt', 'security', 'scalability', 'performance']
  },
  finance: {
    requiredMetrics: ['revenue', 'cost', 'roi', 'compliance', 'risk'],
    commonObjectives: ['increase', 'reduce', 'optimize', 'improve', 'maintain'],
    riskFactors: ['regulatory', 'market', 'credit', 'operational']
  },
  healthcare: {
    requiredMetrics: ['patient satisfaction', 'safety', 'quality', 'efficiency'],
    commonObjectives: ['improve', 'enhance', 'reduce', 'maintain', 'achieve'],
    riskFactors: ['patient safety', 'compliance', 'quality', 'staffing']
  },
  general: {
    requiredMetrics: ['performance', 'quality', 'efficiency', 'satisfaction'],
    commonObjectives: ['improve', 'increase', 'reduce', 'optimize', 'achieve'],
    riskFactors: ['resource', 'timeline', 'quality', 'market']
  }
} as const

// SMART criteria validation weights
const SMART_WEIGHTS = {
  specific: 0.25,
  measurable: 0.25,
  achievable: 0.2,
  relevant: 0.15,
  timeBound: 0.15
} as const

/**
 * Enhanced OKR validation with detailed feedback
 */
export function validateOKRTemplateAdvanced(
  template: OKRTemplate,
  industry?: Industry
): OKRValidationResult {
  const feedback = {
    objectiveQuality: 0,
    keyResultsQuality: 0,
    measurabilityScore: 0,
    timelineRealism: 0,
    industryAlignment: 0
  }

  const improvements: string[] = []
  const warnings: string[] = []

  // Validate objective using SMART criteria
  const objectiveScore = validateSMARTObjective(template.objective, industry)
  feedback.objectiveQuality = objectiveScore.score

  if (objectiveScore.score < 0.7) {
    improvements.push(...objectiveScore.suggestions)
  }

  // Validate key results
  const keyResultsScore = validateKeyResults(template.keyResults, industry)
  feedback.keyResultsQuality = keyResultsScore.averageScore
  feedback.measurabilityScore = keyResultsScore.measurabilityScore

  if (keyResultsScore.averageScore < 0.7) {
    improvements.push(...keyResultsScore.suggestions)
  }

  if (keyResultsScore.measurabilityScore < 0.8) {
    improvements.push('Los Key Results necesitan métricas más específicas y cuantificables')
  }

  // Validate timeline realism
  const timelineScore = validateTimeline(template, industry)
  feedback.timelineRealism = timelineScore.score

  if (timelineScore.score < 0.7) {
    improvements.push(...timelineScore.suggestions)
  }

  // Validate industry alignment
  const industryScore = validateIndustryAlignment(template, industry)
  feedback.industryAlignment = industryScore.score

  if (industryScore.score < 0.7) {
    improvements.push(...industryScore.suggestions)
  }

  // Check for potential issues
  const qualityChecks = performQualityChecks(template)
  warnings.push(...qualityChecks.warnings)
  improvements.push(...qualityChecks.improvements)

  // Calculate overall score with weighted average
  const weights = {
    objectiveQuality: 0.3,
    keyResultsQuality: 0.3,
    measurabilityScore: 0.2,
    timelineRealism: 0.1,
    industryAlignment: 0.1
  }

  const score = Object.entries(feedback).reduce((sum, [key, value]) => {
    return sum + (value * (weights[key as keyof typeof weights] || 0))
  }, 0)

  return {
    isValid: score > 0.6 && improvements.length < 5,
    score,
    feedback,
    improvements: improvements.slice(0, 10), // Limit to top 10 improvements
    warnings: warnings.slice(0, 5) // Limit to top 5 warnings
  }
}

/**
 * Validate objective against SMART criteria
 */
function validateSMARTObjective(
  objective: { title: string; description: string; category: string; timeframe: string },
  industry?: Industry
): { score: number; suggestions: string[] } {
  const suggestions: string[] = []
  let score = 0

  // Specific (S) - Check if objective is specific and clear
  const specificScore = validateSpecific(objective.title, objective.description)
  if (specificScore < 0.7) {
    suggestions.push('El objetivo necesita ser más específico y claro')
  }
  score += specificScore * SMART_WEIGHTS.specific

  // Measurable (M) - Check if there are measurable outcomes implied
  const measurableScore = validateMeasurable(objective.title, objective.description)
  if (measurableScore < 0.7) {
    suggestions.push('El objetivo necesita criterios de medición más claros')
  }
  score += measurableScore * SMART_WEIGHTS.measurable

  // Achievable (A) - Check if objective seems realistic
  const achievableScore = validateAchievable(objective.title, objective.description)
  if (achievableScore < 0.7) {
    suggestions.push('El objetivo podría ser demasiado ambicioso o poco realista')
  }
  score += achievableScore * SMART_WEIGHTS.achievable

  // Relevant (R) - Check industry alignment if provided
  const relevantScore = industry ? validateRelevant(objective, industry) : 0.8
  if (relevantScore < 0.7) {
    suggestions.push(`El objetivo podría ser más relevante para la industria ${industry}`)
  }
  score += relevantScore * SMART_WEIGHTS.relevant

  // Time-bound (T) - Check if timeframe is appropriate
  const timeBoundScore = validateTimeBound(objective.timeframe)
  if (timeBoundScore < 0.7) {
    suggestions.push('El marco temporal del objetivo necesita ser más específico')
  }
  score += timeBoundScore * SMART_WEIGHTS.timeBound

  return { score, suggestions }
}

function validateSpecific(title: string, description: string): number {
  let score = 0

  // Check title specificity
  if (title.length > 20 && title.length < 80) score += 0.3
  if (!title.includes('aumentar') && !title.includes('mejorar') && !title.includes('reducir')) {
    score += 0.2 // Bonus for specific action verbs
  }
  if (title.includes('específico') || title.includes('concreto')) score += 0.1

  // Check description specificity
  if (description.length > 50) score += 0.2
  if (description.includes('cómo') || description.includes('mediante')) score += 0.2

  return Math.min(score, 1)
}

function validateMeasurable(title: string, description: string): number {
  let score = 0
  const text = `${title} ${description}`.toLowerCase()

  // Look for measurement indicators
  const measurementKeywords = ['%', 'porcentaje', 'número', 'cantidad', 'medir', 'métrica', 'indicador']
  const hasMessagement = measurementKeywords.some(keyword => text.includes(keyword))
  if (hasMessagement) score += 0.4

  // Look for specific numbers or targets
  if (/\d+/.test(text)) score += 0.3

  // Look for comparison words
  const comparisonWords = ['incrementar', 'reducir', 'aumentar', 'disminuir', 'optimizar']
  if (comparisonWords.some(word => text.includes(word))) score += 0.3

  return Math.min(score, 1)
}

function validateAchievable(title: string, description: string): number {
  let score = 0.7 // Default assumption that most objectives are achievable
  const text = `${title} ${description}`.toLowerCase()

  // Penalize overly ambitious language
  const ambitiousWords = ['revolucionar', 'transformar completamente', '100%', 'eliminar completamente']
  if (ambitiousWords.some(word => text.includes(word))) score -= 0.3

  // Reward realistic language
  const realisticWords = ['mejorar', 'optimizar', 'incrementar gradualmente', 'progresivamente']
  if (realisticWords.some(word => text.includes(word))) score += 0.2

  return Math.max(0, Math.min(score, 1))
}

function validateRelevant(
  objective: { title: string; description: string; category: string },
  industry: Industry
): number {
  const rules = INDUSTRY_VALIDATION_RULES[industry] || INDUSTRY_VALIDATION_RULES.general
  const text = `${objective.title} ${objective.description} ${objective.category}`.toLowerCase()

  let score = 0.5 // Base score

  // Check for industry-relevant objectives
  const hasRelevantObjective = rules.commonObjectives.some(obj => text.includes(obj))
  if (hasRelevantObjective) score += 0.3

  // Check for industry-specific metrics
  const hasRelevantMetrics = rules.requiredMetrics.some(metric => text.includes(metric))
  if (hasRelevantMetrics) score += 0.2

  return Math.min(score, 1)
}

function validateTimeBound(timeframe: string): number {
  const validTimeframes = ['quarterly', 'annual']
  return validTimeframes.includes(timeframe) ? 1 : 0.5
}

/**
 * Validate key results quality
 */
function validateKeyResults(
  keyResults: KeyResult[],
  industry?: Industry
): { averageScore: number; measurabilityScore: number; suggestions: string[] } {
  const suggestions: string[] = []

  if (keyResults.length < 2) {
    suggestions.push('Se recomiendan al menos 2-3 Key Results por objetivo')
  }

  if (keyResults.length > 5) {
    suggestions.push('Demasiados Key Results pueden diluir el enfoque')
  }

  const scores = keyResults.map(kr => validateSingleKeyResult(kr, industry))
  const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length

  // Calculate measurability score
  const measurableKRs = keyResults.filter(kr => isMeasurable(kr))
  const measurabilityScore = measurableKRs.length / keyResults.length

  // Collect suggestions from individual KR validations
  const allSuggestions = scores.flatMap(s => s.suggestions)
  const uniqueSuggestions = [...new Set(allSuggestions)]

  return {
    averageScore,
    measurabilityScore,
    suggestions: uniqueSuggestions.concat(suggestions)
  }
}

function validateSingleKeyResult(
  keyResult: KeyResult,
  industry?: Industry
): { score: number; suggestions: string[] } {
  const suggestions: string[] = []
  let score = 0

  // Title quality
  if (keyResult.title.length > 10 && keyResult.title.length < 100) {
    score += 0.2
  } else {
    suggestions.push('El título del Key Result debe ser conciso pero descriptivo')
  }

  // Target specificity
  if (keyResult.target && keyResult.target.trim()) {
    score += 0.3
    if (isMeasurable(keyResult)) {
      score += 0.2
    }
  } else {
    suggestions.push('El Key Result necesita una meta específica y cuantificable')
  }

  // Measurement type appropriateness
  if (keyResult.measurementType && ['percentage', 'number', 'currency'].includes(keyResult.measurementType)) {
    score += 0.2
  }

  // Frequency appropriateness
  if (keyResult.frequency && ['weekly', 'monthly', 'quarterly'].includes(keyResult.frequency)) {
    score += 0.1
  }

  // Description quality
  if (keyResult.description && keyResult.description.length > 20) {
    score += 0.2
  }

  return { score: Math.min(score, 1), suggestions }
}

function isMeasurable(keyResult: KeyResult): boolean {
  if (!keyResult.target) return false

  const target = keyResult.target.toLowerCase()

  // Check for numbers
  if (/\d+/.test(target)) return true

  // Check for measurable terms
  const measurableTerms = ['%', 'porcentaje', 'unidades', 'puntos', '$', 'euros', 'días', 'horas']
  return measurableTerms.some(term => target.includes(term))
}

/**
 * Validate timeline realism
 */
function validateTimeline(
  template: OKRTemplate,
  industry?: Industry
): { score: number; suggestions: string[] } {
  const suggestions: string[] = []
  let score = 0.7 // Base score

  // Check timeframe appropriateness
  if (template.objective.timeframe === 'quarterly') {
    score += 0.2
    // Quarterly objectives should be more focused
    if (template.keyResults.length > 4) {
      suggestions.push('Para objetivos trimestrales, considera reducir el número de Key Results')
    }
  } else if (template.objective.timeframe === 'annual') {
    score += 0.1
    // Annual objectives can have more complexity
    if (template.keyResults.length < 3) {
      suggestions.push('Los objetivos anuales pueden incluir más Key Results para mayor impacto')
    }
  }

  return { score: Math.min(score, 1), suggestions }
}

/**
 * Validate industry alignment
 */
function validateIndustryAlignment(
  template: OKRTemplate,
  industry?: Industry
): { score: number; suggestions: string[] } {
  if (!industry) return { score: 0.8, suggestions: [] }

  const suggestions: string[] = []
  const rules = INDUSTRY_VALIDATION_RULES[industry] || INDUSTRY_VALIDATION_RULES.general

  let score = 0.5 // Base score

  // Check metrics alignment
  const templateText = JSON.stringify(template).toLowerCase()
  const relevantMetrics = rules.requiredMetrics.filter(metric =>
    templateText.includes(metric)
  )

  score += (relevantMetrics.length / rules.requiredMetrics.length) * 0.3

  // Check risk consideration
  const relevantRisks = rules.riskFactors.filter(risk =>
    templateText.includes(risk)
  )

  if (relevantRisks.length === 0) {
    suggestions.push(`Considera incluir riesgos específicos de ${industry} como: ${rules.riskFactors.join(', ')}`)
  } else {
    score += 0.2
  }

  return { score: Math.min(score, 1), suggestions }
}

/**
 * Perform additional quality checks
 */
function performQualityChecks(
  template: OKRTemplate
): { warnings: string[]; improvements: string[] } {
  const warnings: string[] = []
  const improvements: string[] = []

  // Check for initiative-objective alignment
  if (template.initiatives.length === 0) {
    improvements.push('Agrega iniciativas específicas que soporten el objetivo')
  }

  // Check for balanced key results
  const measurementTypes = template.keyResults.map(kr => kr.measurementType)
  const uniqueTypes = new Set(measurementTypes)
  if (uniqueTypes.size === 1) {
    warnings.push('Considera diversificar los tipos de medición en los Key Results')
  }

  // Check for realistic confidence score
  if (template.confidenceScore > 0.95) {
    warnings.push('El nivel de confianza parece muy alto, considera posibles riesgos')
  } else if (template.confidenceScore < 0.5) {
    warnings.push('El nivel de confianza es bajo, revisa la viabilidad del objetivo')
  }

  // Check for adequate risk coverage
  if (template.risks.length < 2) {
    improvements.push('Identifica más riesgos potenciales y estrategias de mitigación')
  }

  // Check for success criteria coverage
  if (template.successCriteria.length === 0) {
    improvements.push('Define criterios de éxito específicos para el objetivo')
  }

  return { warnings, improvements }
}

/**
 * Generate quality improvement suggestions
 */
export function generateImprovementSuggestions(
  template: OKRTemplate,
  validation: OKRValidationResult,
  industry?: Industry
): string[] {
  const suggestions: string[] = []

  // Priority suggestions based on score
  if (validation.feedback.objectiveQuality < 0.6) {
    suggestions.push('Prioridad Alta: Reformula el objetivo para que sea más específico y medible')
  }

  if (validation.feedback.keyResultsQuality < 0.6) {
    suggestions.push('Prioridad Alta: Mejora la calidad de los Key Results con métricas más claras')
  }

  if (validation.feedback.measurabilityScore < 0.7) {
    suggestions.push('Prioridad Media: Agrega métricas cuantificables a los Key Results')
  }

  // Industry-specific suggestions
  if (industry && validation.feedback.industryAlignment < 0.7) {
    const rules = INDUSTRY_VALIDATION_RULES[industry] || INDUSTRY_VALIDATION_RULES.general
    suggestions.push(`Considera incluir métricas específicas de ${industry}: ${rules.requiredMetrics.join(', ')}`)
  }

  return suggestions
}

export { INDUSTRY_VALIDATION_RULES, SMART_WEIGHTS }