/**
 * Unified Quality Tracking Service
 *
 * Consolidates quality assessment, tracking, and analysis functionality
 * from multiple files into a single, comprehensive quality system.
 *
 * Replaces:
 * - lib/ai/quality-metrics.ts
 * - Quality aspects of lib/ai/performance-analytics.ts
 * - Quality tracking in lib/ai/ab-testing.ts
 */

import { metricsCollector } from './unified-performance-service'
import type {
  QualityBreakdown,
  QualityEvaluationCriteria
} from './unified-performance-service'

// ============================================================================
// QUALITY INTERFACES
// ============================================================================

export interface QualityAssessment {
  id: string
  requestId: string
  operation: string
  model: string
  provider: string
  prompt: string
  response: string
  scores: QualityBreakdown
  criteria: QualityEvaluationCriteria
  feedback?: UserFeedback
  timestamp: Date
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5
  helpful: boolean
  issues?: QualityIssue[]
  comments?: string
  timestamp: Date
  userId?: string
}

export interface QualityIssue {
  type: 'irrelevant' | 'incoherent' | 'incomplete' | 'inaccurate' | 'unsafe' | 'repetitive' | 'other'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestion?: string
}

export interface QualityTrend {
  period: string
  modelComparisons: ModelQualityComparison[]
  overallTrend: {
    direction: 'improving' | 'stable' | 'degrading'
    change: number
    confidence: number
  }
  topIssues: QualityIssueFrequency[]
  recommendations: string[]
}

export interface ModelQualityComparison {
  model: string
  provider: string
  averageScore: number
  sampleSize: number
  trend: number
  rank: number
  breakdown: QualityBreakdown
  confidence: number
}

export interface QualityIssueFrequency {
  type: QualityIssue['type']
  count: number
  percentage: number
  models: string[]
  severity: QualityIssue['severity']
}

export interface QualityAlert {
  id: string
  type: 'score_drop' | 'high_frequency_issues' | 'user_complaints' | 'model_degradation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affectedModels: string[]
  threshold: number
  actual: number
  recommendation: string
  detectedAt: Date
  resolvedAt?: Date
  metadata?: Record<string, any>
}

// ============================================================================
// QUALITY EVALUATION CRITERIA PRESETS
// ============================================================================

export const QUALITY_CRITERIA_PRESETS: Record<string, QualityEvaluationCriteria> = {
  okr_generation: {
    weights: {
      relevance: 0.25,
      coherence: 0.20,
      completeness: 0.25,
      accuracy: 0.15,
      creativity: 0.10,
      safety: 0.05
    },
    thresholds: {
      minimum: 65,
      good: 80,
      excellent: 92
    },
    specificCriteria: {
      minLength: 200,
      maxLength: 800,
      requiredElements: ['objetivo', 'resultado clave', 'medible', 'específico'],
      forbiddenElements: ['lorem ipsum', 'placeholder', 'ejemplo ejemplo'],
      domainKnowledge: ['OKR', 'gestión', 'métricas', 'objetivos', 'KPI']
    }
  },

  performance_analysis: {
    weights: {
      relevance: 0.20,
      coherence: 0.15,
      completeness: 0.20,
      accuracy: 0.30,
      creativity: 0.10,
      safety: 0.05
    },
    thresholds: {
      minimum: 70,
      good: 82,
      excellent: 95
    },
    specificCriteria: {
      minLength: 300,
      maxLength: 1200,
      requiredElements: ['análisis', 'datos', 'conclusión', 'recomendación'],
      forbiddenElements: ['sin datos', 'información insuficiente'],
      domainKnowledge: ['análisis', 'rendimiento', 'métricas', 'tendencias', 'estadística']
    }
  },

  strategic_insights: {
    weights: {
      relevance: 0.25,
      coherence: 0.20,
      completeness: 0.20,
      accuracy: 0.15,
      creativity: 0.15,
      safety: 0.05
    },
    thresholds: {
      minimum: 68,
      good: 78,
      excellent: 90
    },
    specificCriteria: {
      minLength: 250,
      maxLength: 700,
      requiredElements: ['insight', 'estrategia', 'impacto'],
      domainKnowledge: ['estrategia', 'planificación', 'optimización', 'mejora continua']
    }
  },

  chat_assistance: {
    weights: {
      relevance: 0.30,
      coherence: 0.25,
      completeness: 0.20,
      accuracy: 0.15,
      creativity: 0.05,
      safety: 0.05
    },
    thresholds: {
      minimum: 60,
      good: 75,
      excellent: 88
    },
    specificCriteria: {
      minLength: 50,
      maxLength: 500,
      forbiddenElements: ['no puedo ayudar', 'no tengo información'],
      domainKnowledge: ['conversación', 'ayuda', 'asistencia']
    }
  },

  content_creation: {
    weights: {
      relevance: 0.22,
      coherence: 0.20,
      completeness: 0.18,
      accuracy: 0.15,
      creativity: 0.20,
      safety: 0.05
    },
    thresholds: {
      minimum: 65,
      good: 78,
      excellent: 90
    },
    specificCriteria: {
      minLength: 300,
      maxLength: 1500,
      domainKnowledge: ['creatividad', 'contenido', 'narrativa', 'engagement']
    }
  }
}

// ============================================================================
// UNIFIED QUALITY SERVICE
// ============================================================================

export class UnifiedQualityService {
  private assessments: QualityAssessment[] = []
  private alerts: QualityAlert[] = []
  private readonly maxAssessmentsInMemory = 5000
  private readonly maxAlertsInMemory = 1000

  /**
   * Evaluate the quality of an AI response
   */
  public async evaluateQuality(
    requestId: string,
    operation: string,
    model: string,
    provider: string,
    prompt: string,
    response: string,
    options?: {
      criteria?: QualityEvaluationCriteria
      userId?: string
      sessionId?: string
      metadata?: Record<string, any>
    }
  ): Promise<QualityAssessment> {
    const criteria = options?.criteria || this.getCriteriaForOperation(operation)
    const scores = await this.calculateQualityScores(prompt, response, criteria)

    const assessment: QualityAssessment = {
      id: this.generateAssessmentId(),
      requestId,
      operation,
      model,
      provider,
      prompt,
      response,
      scores,
      criteria,
      timestamp: new Date(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      metadata: options?.metadata
    }

    this.assessments.push(assessment)
    this.cleanupOldAssessments()

    // Check for quality alerts
    this.checkQualityAlerts(assessment)

    // Update metrics collector with quality score
    this.updateMetricsCollector(requestId, scores.overall)

    return assessment
  }

  /**
   * Add user feedback to a quality assessment
   */
  public addUserFeedback(
    assessmentId: string,
    feedback: Omit<UserFeedback, 'timestamp'>
  ): boolean {
    const assessment = this.assessments.find(a => a.id === assessmentId)
    if (!assessment) return false

    assessment.feedback = {
      ...feedback,
      timestamp: new Date()
    }

    // Adjust scores based on feedback if there's significant discrepancy
    this.adjustScoresBasedOnFeedback(assessment)

    return true
  }

  /**
   * Get quality statistics for a time range and filters
   */
  public getQualityStats(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
    }
  ): {
    totalAssessments: number
    averageScore: number
    scoreDistribution: Record<string, number>
    topIssues: QualityIssueFrequency[]
    modelComparisons: ModelQualityComparison[]
    trend: QualityTrend['overallTrend']
  } {
    const filteredAssessments = this.filterAssessments(startTime, endTime, filters)

    if (filteredAssessments.length === 0) {
      return {
        totalAssessments: 0,
        averageScore: 0,
        scoreDistribution: {},
        topIssues: [],
        modelComparisons: [],
        trend: { direction: 'stable', change: 0, confidence: 0 }
      }
    }

    const scores = filteredAssessments.map(a => a.scores.overall)
    const averageScore = this.calculateMean(scores)

    return {
      totalAssessments: filteredAssessments.length,
      averageScore,
      scoreDistribution: this.createScoreDistribution(scores),
      topIssues: this.analyzeTopIssues(filteredAssessments),
      modelComparisons: this.compareModelQuality(filteredAssessments),
      trend: this.calculateQualityTrend(filteredAssessments)
    }
  }

  /**
   * Compare quality across models
   */
  public compareModels(
    startTime: Date,
    endTime: Date,
    operation?: string
  ): ModelQualityComparison[] {
    const filters = operation ? { operation } : undefined
    const filteredAssessments = this.filterAssessments(startTime, endTime, filters)

    return this.compareModelQuality(filteredAssessments)
  }

  /**
   * Get quality trends over time
   */
  public getQualityTrends(
    startTime: Date,
    endTime: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): QualityTrend[] {
    const filteredAssessments = this.filterAssessments(startTime, endTime)
    const groupedAssessments = this.groupAssessmentsByTime(filteredAssessments, groupBy)

    return Array.from(groupedAssessments.entries()).map(([period, assessments]) => {
      const modelComparisons = this.compareModelQuality(assessments)
      const overallTrend = this.calculateQualityTrend(assessments)
      const topIssues = this.analyzeTopIssues(assessments)

      return {
        period,
        modelComparisons,
        overallTrend,
        topIssues,
        recommendations: this.generateTrendRecommendations(overallTrend, topIssues)
      }
    }).sort((a, b) => a.period.localeCompare(b.period))
  }

  /**
   * Get recent quality alerts
   */
  public getAlerts(
    severity?: QualityAlert['severity'],
    limit: number = 50
  ): QualityAlert[] {
    let filtered = [...this.alerts]

    if (severity) {
      filtered = filtered.filter(alert => alert.severity === severity)
    }

    return filtered
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Resolve a quality alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.resolvedAt = new Date()
    return true
  }

  /**
   * Get quality assessments with filtering
   */
  public getAssessments(filters?: {
    operation?: string
    model?: string
    startDate?: Date
    endDate?: Date
    userId?: string
    minScore?: number
    maxScore?: number
  }): QualityAssessment[] {
    let filtered = [...this.assessments]

    if (filters?.operation) {
      filtered = filtered.filter(a => a.operation === filters.operation)
    }
    if (filters?.model) {
      filtered = filtered.filter(a => a.model === filters.model)
    }
    if (filters?.startDate) {
      filtered = filtered.filter(a => a.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      filtered = filtered.filter(a => a.timestamp <= filters.endDate!)
    }
    if (filters?.userId) {
      filtered = filtered.filter(a => a.userId === filters.userId)
    }
    if (filters?.minScore !== undefined) {
      filtered = filtered.filter(a => a.scores.overall >= filters.minScore!)
    }
    if (filters?.maxScore !== undefined) {
      filtered = filtered.filter(a => a.scores.overall <= filters.maxScore!)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // ========================================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ========================================================================

  private async calculateQualityScores(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): Promise<QualityBreakdown> {
    const scores: Partial<QualityBreakdown> = {}

    // Calculate individual dimension scores
    scores.relevance = await this.calculateRelevanceScore(prompt, response, criteria)
    scores.coherence = this.calculateCoherenceScore(response)
    scores.completeness = this.calculateCompletenessScore(prompt, response, criteria)
    scores.accuracy = this.calculateAccuracyScore(response, criteria)
    scores.creativity = this.calculateCreativityScore(response)
    scores.safety = this.calculateSafetyScore(response)

    // Calculate overall weighted score
    scores.overall = this.calculateWeightedScore(scores as QualityBreakdown, criteria.weights)

    return scores as QualityBreakdown
  }

  private async calculateRelevanceScore(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): Promise<number> {
    let score = 70 // Base score

    // Check word overlap between prompt and response
    const promptWords = prompt.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    const responseWords = response.toLowerCase().split(/\s+/)

    const overlap = promptWords.filter(word =>
      responseWords.some(rWord => rWord.includes(word) || word.includes(rWord))
    ).length

    const overlapRatio = promptWords.length > 0 ? overlap / promptWords.length : 0
    score += overlapRatio * 20

    // Check for required elements
    if (criteria.specificCriteria?.requiredElements) {
      const foundElements = criteria.specificCriteria.requiredElements.filter(element =>
        response.toLowerCase().includes(element.toLowerCase())
      ).length

      const elementRatio = foundElements / criteria.specificCriteria.requiredElements.length
      score += elementRatio * 10
    }

    // Check for domain knowledge
    if (criteria.specificCriteria?.domainKnowledge) {
      const foundKnowledge = criteria.specificCriteria.domainKnowledge.filter(term =>
        response.toLowerCase().includes(term.toLowerCase())
      ).length

      score += Math.min(foundKnowledge * 2, 10)
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateCoherenceScore(response: string): number {
    let score = 80 // Base score

    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length === 0) return 0

    // Check sentence length variety
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    if (avgSentenceLength < 10 || avgSentenceLength > 200) score -= 15

    // Check for repetition
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()))
    const repetitionRatio = (sentences.length - uniqueSentences.size) / sentences.length
    score -= repetitionRatio * 30

    // Check for logical connectors
    const connectors = [
      'por lo tanto', 'además', 'sin embargo', 'por ejemplo', 'en consecuencia',
      'finalmente', 'posteriormente', 'mientras que', 'dado que', 'debido a'
    ]
    const hasConnectors = connectors.some(connector =>
      response.toLowerCase().includes(connector)
    )
    if (hasConnectors) score += 10

    // Check paragraph structure
    if (response.length > 300) {
      const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0)
      if (paragraphs.length > 1) score += 5
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateCompletenessScore(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): number {
    let score = 80 // Base score

    // Check length requirements
    if (criteria.specificCriteria?.minLength && response.length < criteria.specificCriteria.minLength) {
      const ratio = response.length / criteria.specificCriteria.minLength
      score -= (1 - ratio) * 30
    }

    if (criteria.specificCriteria?.maxLength && response.length > criteria.specificCriteria.maxLength) {
      score -= 10
    }

    // Check for required elements coverage
    if (criteria.specificCriteria?.requiredElements) {
      const foundElements = criteria.specificCriteria.requiredElements.filter(element =>
        response.toLowerCase().includes(element.toLowerCase())
      ).length

      const completionRatio = foundElements / criteria.specificCriteria.requiredElements.length
      score = score * completionRatio + (completionRatio * 20)
    }

    // Check if response addresses all parts of a multi-part question
    const questionParts = prompt.split(/[?¿]/).filter(part => part.trim().length > 0)
    if (questionParts.length > 1) {
      const responseLength = response.length
      const expectedLengthPerPart = responseLength / questionParts.length
      if (expectedLengthPerPart < 50) {
        score -= 15
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateAccuracyScore(
    response: string,
    criteria: QualityEvaluationCriteria
  ): number {
    let score = 85 // Base score assuming most responses are reasonably accurate

    // Check for obvious inaccuracies
    const inaccuratePatterns = [
      /lorem ipsum/i,
      /placeholder/i,
      /\[.*\]/g, // Bracket placeholders
      /xxx/i,
      /ejemplo ejemplo/i,
      /sin datos|información insuficiente/i
    ]

    for (const pattern of inaccuratePatterns) {
      if (pattern.test(response)) {
        score -= 20
      }
    }

    // Check for forbidden elements
    if (criteria.specificCriteria?.forbiddenElements) {
      const foundForbidden = criteria.specificCriteria.forbiddenElements.filter(element =>
        response.toLowerCase().includes(element.toLowerCase())
      ).length

      score -= foundForbidden * 25
    }

    // Check for uncertainty expressions (good for accuracy)
    const uncertaintyExpressions = [
      'podría', 'posiblemente', 'es probable', 'tiende a', 'sugiere',
      'aproximadamente', 'generalmente', 'típicamente'
    ]
    const hasUncertainty = uncertaintyExpressions.some(expr =>
      response.toLowerCase().includes(expr)
    )
    if (hasUncertainty) score += 5

    // Check for specific claims that might need verification
    const specificClaims = response.match(/\d+%|\d+\.\d+|\$\d+|exactamente|siempre|nunca/gi) || []
    if (specificClaims.length > 3) {
      score -= 5 // Slightly penalize excessive specificity without verification
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateCreativityScore(response: string): number {
    let score = 60 // Base score

    // Check vocabulary diversity
    const words = response.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    const uniqueWords = new Set(words)
    const vocabularyRatio = words.length > 0 ? uniqueWords.size / words.length : 0
    score += vocabularyRatio * 20

    // Check for creative indicators
    const creativeIndicators = [
      'innovador', 'creativo', 'original', 'único', 'diferente',
      'alternativa', 'enfoque novedoso', 'perspectiva nueva', 'fuera de lo común'
    ]
    const creativeElements = creativeIndicators.filter(indicator =>
      response.toLowerCase().includes(indicator)
    ).length
    score += Math.min(creativeElements * 5, 15)

    // Check for metaphors or analogies
    const analogyIndicators = [
      'como', 'similar a', 'parecido a', 'igual que', 'es como',
      'se asemeja', 'por analogía', 'metafóricamente'
    ]
    const hasAnalogies = analogyIndicators.some(indicator =>
      response.toLowerCase().includes(indicator)
    )
    if (hasAnalogies) score += 10

    // Penalty for very generic responses
    const genericPhrases = [
      'es importante', 'es necesario', 'se debe', 'hay que',
      'es fundamental', 'es crucial', 'es esencial'
    ]
    const genericCount = genericPhrases.filter(phrase =>
      response.toLowerCase().includes(phrase)
    ).length
    score -= Math.min(genericCount * 5, 20)

    return Math.max(0, Math.min(100, score))
  }

  private calculateSafetyScore(response: string): number {
    let score = 100 // Start with perfect safety score

    // Check for harmful content patterns
    const harmfulPatterns = [
      /\b(kill|murder|bomb|weapon|attack|harm|hurt|violence|threat)\b/i,
      /\b(hate|racist|sexist|discrimination|bias)\b/i,
      /\b(illegal|criminal|fraud|scam|steal)\b/i,
      /\b(suicide|self-harm|depression)\b/i
    ]

    for (const pattern of harmfulPatterns) {
      if (pattern.test(response)) {
        score -= 50
      }
    }

    // Check for inappropriate language
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell|asshole|bitch)\b/i,
      /\b(mierda|joder|coño|cabrón|puta|maldito)\b/i
    ]

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(response)) {
        score -= 20
      }
    }

    // Check for personal information disclosure
    const personalInfoPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/ // Credit card pattern
    ]

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(response)) {
        score -= 30
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateWeightedScore(
    scores: QualityBreakdown,
    weights: QualityEvaluationCriteria['weights']
  ): number {
    return (
      scores.relevance * weights.relevance +
      scores.coherence * weights.coherence +
      scores.completeness * weights.completeness +
      scores.accuracy * weights.accuracy +
      scores.creativity * weights.creativity +
      scores.safety * weights.safety
    )
  }

  private adjustScoresBasedOnFeedback(assessment: QualityAssessment): void {
    if (!assessment.feedback) return

    const userRating = assessment.feedback.rating
    const expectedScore = userRating * 20 // Convert 1-5 to 0-100 scale
    const currentScore = assessment.scores.overall
    const discrepancy = Math.abs(expectedScore - currentScore)

    // If there's significant discrepancy, adjust scores
    if (discrepancy > 20) {
      const adjustmentFactor = 0.3 // Adjust 30% towards user feedback
      const adjustment = (expectedScore - currentScore) * adjustmentFactor

      // Adjust all scores proportionally
      Object.keys(assessment.scores).forEach(key => {
        if (key !== 'overall') {
          const currentValue = assessment.scores[key as keyof QualityBreakdown]
          assessment.scores[key as keyof QualityBreakdown] = Math.max(
            0,
            Math.min(100, currentValue + adjustment)
          )
        }
      })

      // Recalculate overall score
      assessment.scores.overall = this.calculateWeightedScore(
        assessment.scores,
        assessment.criteria.weights
      )
    }
  }

  private checkQualityAlerts(assessment: QualityAssessment): void {
    const alerts: QualityAlert[] = []

    // Low quality score alert
    if (assessment.scores.overall < assessment.criteria.thresholds.minimum) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'score_drop',
        severity: assessment.scores.overall < 40 ? 'critical' : 'high',
        title: 'Low Quality Score Detected',
        description: `Quality score of ${assessment.scores.overall.toFixed(1)} is below threshold`,
        affectedModels: [assessment.model],
        threshold: assessment.criteria.thresholds.minimum,
        actual: assessment.scores.overall,
        recommendation: 'Review prompt engineering and model configuration',
        detectedAt: new Date(),
        metadata: { assessmentId: assessment.id, operation: assessment.operation }
      })
    }

    // Safety issues alert
    if (assessment.scores.safety < 80) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'user_complaints',
        severity: assessment.scores.safety < 50 ? 'critical' : 'high',
        title: 'Safety Concerns Detected',
        description: `Safety score of ${assessment.scores.safety.toFixed(1)} indicates potential issues`,
        affectedModels: [assessment.model],
        threshold: 80,
        actual: assessment.scores.safety,
        recommendation: 'Review content filtering and safety guidelines',
        detectedAt: new Date(),
        metadata: { assessmentId: assessment.id, operation: assessment.operation }
      })
    }

    this.alerts.push(...alerts)
  }

  private updateMetricsCollector(requestId: string, qualityScore: number): void {
    // Integration with the unified metrics collector
    // The metrics collector will handle this automatically when recording metrics
    console.log(`Quality score ${qualityScore.toFixed(1)} recorded for request ${requestId}`)
  }

  private getCriteriaForOperation(operation: string): QualityEvaluationCriteria {
    // Map operation names to criteria presets
    const operationMappings: Record<string, string> = {
      'generate_okr': 'okr_generation',
      'analyze_performance': 'performance_analysis',
      'generate_insights': 'strategic_insights',
      'chat_completion': 'chat_assistance',
      'create_content': 'content_creation'
    }

    const criteriaKey = operationMappings[operation] || 'chat_assistance'
    return QUALITY_CRITERIA_PRESETS[criteriaKey]
  }

  private filterAssessments(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
    }
  ): QualityAssessment[] {
    return this.assessments.filter(assessment => {
      if (assessment.timestamp < startTime || assessment.timestamp > endTime) return false
      if (filters?.operation && assessment.operation !== filters.operation) return false
      if (filters?.model && assessment.model !== filters.model) return false
      if (filters?.provider && assessment.provider !== filters.provider) return false
      if (filters?.userId && assessment.userId !== filters.userId) return false
      return true
    })
  }

  private createScoreDistribution(scores: number[]): Record<string, number> {
    const buckets = {
      'excellent (90-100)': scores.filter(s => s >= 90).length,
      'good (75-89)': scores.filter(s => s >= 75 && s < 90).length,
      'fair (60-74)': scores.filter(s => s >= 60 && s < 75).length,
      'poor (0-59)': scores.filter(s => s < 60).length
    }

    return buckets
  }

  private analyzeTopIssues(assessments: QualityAssessment[]): QualityIssueFrequency[] {
    const issueMap = new Map<string, { count: number; models: Set<string>; severities: string[] }>()

    assessments.forEach(assessment => {
      if (assessment.feedback?.issues) {
        assessment.feedback.issues.forEach(issue => {
          if (!issueMap.has(issue.type)) {
            issueMap.set(issue.type, { count: 0, models: new Set(), severities: [] })
          }
          const data = issueMap.get(issue.type)!
          data.count++
          data.models.add(assessment.model)
          data.severities.push(issue.severity)
        })
      }
    })

    const totalIssues = Array.from(issueMap.values()).reduce((sum, data) => sum + data.count, 0)

    return Array.from(issueMap.entries())
      .map(([type, data]) => ({
        type: type as QualityIssue['type'],
        count: data.count,
        percentage: totalIssues > 0 ? (data.count / totalIssues) * 100 : 0,
        models: Array.from(data.models),
        severity: this.getMostCommonSeverity(data.severities)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private compareModelQuality(assessments: QualityAssessment[]): ModelQualityComparison[] {
    const modelGroups = this.groupAssessmentsByModel(assessments)
    const comparisons: ModelQualityComparison[] = []

    modelGroups.forEach((modelAssessments, model) => {
      const scores = modelAssessments.map(a => a.scores.overall)
      const averageScore = this.calculateMean(scores)
      const breakdown = this.calculateAverageBreakdown(modelAssessments)

      comparisons.push({
        model,
        provider: model.split('/')[0],
        averageScore,
        sampleSize: modelAssessments.length,
        trend: this.calculateModelTrend(modelAssessments),
        rank: 0, // Will be assigned after sorting
        breakdown,
        confidence: this.calculateConfidence(modelAssessments.length)
      })
    })

    // Sort and assign ranks
    comparisons.sort((a, b) => b.averageScore - a.averageScore)
    comparisons.forEach((comparison, index) => {
      comparison.rank = index + 1
    })

    return comparisons
  }

  private calculateQualityTrend(assessments: QualityAssessment[]): QualityTrend['overallTrend'] {
    if (assessments.length < 10) {
      return { direction: 'stable', change: 0, confidence: 0 }
    }

    const sorted = assessments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))

    const firstScore = this.calculateMean(firstHalf.map(a => a.scores.overall))
    const secondScore = this.calculateMean(secondHalf.map(a => a.scores.overall))

    const change = ((secondScore - firstScore) / firstScore) * 100
    let direction: 'improving' | 'stable' | 'degrading' = 'stable'

    if (Math.abs(change) > 5) { // 5% change threshold
      direction = change > 0 ? 'improving' : 'degrading'
    }

    return {
      direction,
      change: Math.abs(change),
      confidence: Math.min(assessments.length / 100, 1)
    }
  }

  private groupAssessmentsByTime(
    assessments: QualityAssessment[],
    groupBy: 'day' | 'week' | 'month'
  ): Map<string, QualityAssessment[]> {
    const groups = new Map<string, QualityAssessment[]>()

    assessments.forEach(assessment => {
      let key: string
      const date = assessment.timestamp

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(assessment)
    })

    return groups
  }

  private groupAssessmentsByModel(assessments: QualityAssessment[]): Map<string, QualityAssessment[]> {
    const groups = new Map<string, QualityAssessment[]>()

    assessments.forEach(assessment => {
      if (!groups.has(assessment.model)) {
        groups.set(assessment.model, [])
      }
      groups.get(assessment.model)!.push(assessment)
    })

    return groups
  }

  private calculateAverageBreakdown(assessments: QualityAssessment[]): QualityBreakdown {
    const breakdown: QualityBreakdown = {
      relevance: 0,
      coherence: 0,
      completeness: 0,
      accuracy: 0,
      creativity: 0,
      safety: 0,
      overall: 0
    }

    if (assessments.length === 0) return breakdown

    Object.keys(breakdown).forEach(key => {
      const values = assessments.map(a => a.scores[key as keyof QualityBreakdown])
      breakdown[key as keyof QualityBreakdown] = this.calculateMean(values)
    })

    return breakdown
  }

  private calculateModelTrend(assessments: QualityAssessment[]): number {
    if (assessments.length < 5) return 0

    const sorted = assessments.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))

    const firstScore = this.calculateMean(firstHalf.map(a => a.scores.overall))
    const secondScore = this.calculateMean(secondHalf.map(a => a.scores.overall))

    return ((secondScore - firstScore) / firstScore) * 100
  }

  private generateTrendRecommendations(
    trend: QualityTrend['overallTrend'],
    topIssues: QualityIssueFrequency[]
  ): string[] {
    const recommendations: string[] = []

    if (trend.direction === 'degrading') {
      recommendations.push('Quality is declining - review recent changes to prompts or models')
    }

    if (topIssues.length > 0) {
      const topIssue = topIssues[0]
      recommendations.push(`Address ${topIssue.type} issues affecting ${topIssue.count} responses`)
    }

    if (trend.confidence < 0.5) {
      recommendations.push('Increase sample size for more reliable trend analysis')
    }

    return recommendations
  }

  private getMostCommonSeverity(severities: string[]): QualityIssue['severity'] {
    const counts = severities.reduce((acc, severity) => {
      acc[severity] = (acc[severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommon = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0]?.[0]

    return (mostCommon as QualityIssue['severity']) || 'medium'
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateConfidence(sampleSize: number): number {
    if (sampleSize < 10) return 0.3
    if (sampleSize < 30) return 0.6
    if (sampleSize < 100) return 0.8
    return 0.95
  }

  private cleanupOldAssessments(): void {
    if (this.assessments.length > this.maxAssessmentsInMemory) {
      this.assessments = this.assessments.slice(-this.maxAssessmentsInMemory)
    }

    if (this.alerts.length > this.maxAlertsInMemory) {
      this.alerts = this.alerts.slice(-this.maxAlertsInMemory)
    }
  }

  private generateAssessmentId(): string {
    return `quality_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateAlertId(): string {
    return `qalert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const qualityService = new UnifiedQualityService()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick quality evaluation for AI responses
 */
export async function evaluateResponse(
  requestId: string,
  operation: string,
  model: string,
  prompt: string,
  response: string,
  userId?: string
): Promise<QualityAssessment> {
  const provider = model.split('/')[0]
  return qualityService.evaluateQuality(
    requestId,
    operation,
    model,
    provider,
    prompt,
    response,
    { userId }
  )
}

/**
 * Track quality with user feedback
 */
export async function trackQualityWithFeedback(
  requestId: string,
  operation: string,
  model: string,
  prompt: string,
  response: string,
  userFeedback: Omit<UserFeedback, 'timestamp'>,
  userId?: string
): Promise<QualityAssessment> {
  const assessment = await evaluateResponse(requestId, operation, model, prompt, response, userId)
  qualityService.addUserFeedback(assessment.id, userFeedback)
  return assessment
}

export default qualityService