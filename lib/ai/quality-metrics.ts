import { aiClient } from './gateway-client'
import { performanceAnalytics } from './performance-analytics'
import type { AIPerformanceMetrics } from './performance-analytics'

// Quality metrics interfaces
export interface QualityMetrics {
  id: string
  requestId: string
  operation: string
  model: string
  prompt: string
  response: string
  scores: QualityScores
  feedback?: UserFeedback
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}

export interface QualityScores {
  relevance: number // 0-100: How relevant is the response to the prompt
  coherence: number // 0-100: How coherent and logical is the response
  completeness: number // 0-100: How complete is the response
  accuracy: number // 0-100: How accurate is the information (if verifiable)
  creativity: number // 0-100: How creative/innovative is the response
  safety: number // 0-100: How safe and appropriate is the response
  overall: number // 0-100: Weighted average of all scores
}

export interface UserFeedback {
  rating: 1 | 2 | 3 | 4 | 5 // 1-5 star rating
  helpful: boolean
  issues?: QualityIssue[]
  comments?: string
  timestamp: Date
}

export interface QualityIssue {
  type: 'irrelevant' | 'incoherent' | 'incomplete' | 'inaccurate' | 'unsafe' | 'repetitive' | 'other'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface QualityTrend {
  period: string
  averageScore: number
  change: number
  distribution: Record<string, number>
  topIssues: string[]
}

export interface QualityComparison {
  model: string
  operation: string
  score: number
  sampleSize: number
  rank: number
  strengths: string[]
  weaknesses: string[]
}

// Quality evaluation criteria for different types of content
export interface QualityEvaluationCriteria {
  operation: string
  weights: {
    relevance: number
    coherence: number
    completeness: number
    accuracy: number
    creativity: number
    safety: number
  }
  specificCriteria?: {
    minLength?: number
    maxLength?: number
    requiredElements?: string[]
    forbiddenElements?: string[]
    expectedFormat?: 'text' | 'json' | 'structured' | 'list'
    domainKnowledge?: string[]
  }
}

// Predefined evaluation criteria for common operations
export const QUALITY_CRITERIA: Record<string, QualityEvaluationCriteria> = {
  generate_okr: {
    operation: 'generate_okr',
    weights: {
      relevance: 0.25,
      coherence: 0.20,
      completeness: 0.25,
      accuracy: 0.15,
      creativity: 0.10,
      safety: 0.05
    },
    specificCriteria: {
      minLength: 200,
      maxLength: 800,
      requiredElements: ['objetivo', 'resultado clave', 'medible'],
      expectedFormat: 'structured',
      domainKnowledge: ['OKR', 'gestión', 'métricas', 'objetivos']
    }
  },
  analyze_performance: {
    operation: 'analyze_performance',
    weights: {
      relevance: 0.20,
      coherence: 0.15,
      completeness: 0.20,
      accuracy: 0.30,
      creativity: 0.10,
      safety: 0.05
    },
    specificCriteria: {
      minLength: 300,
      maxLength: 1000,
      requiredElements: ['análisis', 'datos', 'conclusión'],
      expectedFormat: 'structured',
      domainKnowledge: ['análisis', 'rendimiento', 'métricas', 'tendencias']
    }
  },
  generate_insights: {
    operation: 'generate_insights',
    weights: {
      relevance: 0.25,
      coherence: 0.20,
      completeness: 0.20,
      accuracy: 0.15,
      creativity: 0.15,
      safety: 0.05
    },
    specificCriteria: {
      minLength: 250,
      maxLength: 700,
      requiredElements: ['insight', 'recomendación'],
      expectedFormat: 'text',
      domainKnowledge: ['estrategia', 'optimización', 'mejora continua']
    }
  },
  chat_completion: {
    operation: 'chat_completion',
    weights: {
      relevance: 0.30,
      coherence: 0.25,
      completeness: 0.20,
      accuracy: 0.15,
      creativity: 0.05,
      safety: 0.05
    },
    specificCriteria: {
      minLength: 50,
      maxLength: 500,
      expectedFormat: 'text',
      domainKnowledge: ['conversación', 'contexto', 'ayuda']
    }
  }
}

export class QualityMetricsTracker {
  private qualityMetrics: QualityMetrics[] = []
  private readonly maxMetricsInMemory = 5000

  constructor() {
    // In a real implementation, this would connect to a database
    // For now, we'll use in-memory storage
  }

  /**
   * Evaluate the quality of an AI response automatically
   */
  public async evaluateResponse(
    requestId: string,
    operation: string,
    model: string,
    prompt: string,
    response: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<QualityMetrics> {
    const criteria = QUALITY_CRITERIA[operation] || this.getDefaultCriteria()

    // Calculate individual quality scores
    const scores = await this.calculateQualityScores(prompt, response, criteria)

    const qualityMetric: QualityMetrics = {
      id: this.generateQualityId(),
      requestId,
      operation,
      model,
      prompt,
      response,
      scores,
      timestamp: new Date(),
      userId,
      metadata
    }

    // Store the metrics
    this.qualityMetrics.push(qualityMetric)

    // Keep only the most recent metrics in memory
    if (this.qualityMetrics.length > this.maxMetricsInMemory) {
      this.qualityMetrics = this.qualityMetrics.slice(-this.maxMetricsInMemory)
    }

    // Update the performance analytics with quality score
    this.updatePerformanceAnalytics(requestId, scores.overall)

    return qualityMetric
  }

  /**
   * Add user feedback to existing quality metrics
   */
  public addUserFeedback(
    qualityId: string,
    feedback: Omit<UserFeedback, 'timestamp'>
  ): boolean {
    const metric = this.qualityMetrics.find(m => m.id === qualityId)

    if (!metric) {
      return false
    }

    metric.feedback = {
      ...feedback,
      timestamp: new Date()
    }

    // Adjust quality scores based on user feedback if there's significant discrepancy
    this.adjustScoresBasedOnFeedback(metric)

    return true
  }

  /**
   * Calculate comprehensive quality scores for a response
   */
  private async calculateQualityScores(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): Promise<QualityScores> {
    const scores: Partial<QualityScores> = {}

    // 1. Relevance Score
    scores.relevance = await this.calculateRelevanceScore(prompt, response, criteria)

    // 2. Coherence Score
    scores.coherence = this.calculateCoherenceScore(response, criteria)

    // 3. Completeness Score
    scores.completeness = this.calculateCompletenessScore(prompt, response, criteria)

    // 4. Accuracy Score (basic heuristics, could be enhanced with fact-checking)
    scores.accuracy = this.calculateAccuracyScore(response, criteria)

    // 5. Creativity Score
    scores.creativity = this.calculateCreativityScore(response, criteria)

    // 6. Safety Score
    scores.safety = this.calculateSafetyScore(response)

    // 7. Overall weighted score
    scores.overall = this.calculateOverallScore(scores as QualityScores, criteria.weights)

    return scores as QualityScores
  }

  /**
   * Calculate relevance score using AI evaluation
   */
  private async calculateRelevanceScore(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): Promise<number> {
    try {
      const evaluationPrompt = `
Evalúa qué tan relevante es esta respuesta para la consulta del usuario.

Consulta: "${prompt}"
Respuesta: "${response}"

Criterios específicos para ${criteria.operation}:
${criteria.specificCriteria?.requiredElements ?
  `- Debe incluir: ${criteria.specificCriteria.requiredElements.join(', ')}` : ''}
${criteria.specificCriteria?.domainKnowledge ?
  `- Conocimiento de dominio esperado: ${criteria.specificCriteria.domainKnowledge.join(', ')}` : ''}

Evalúa del 0-100 qué tan relevante es la respuesta.
Responde solo con un número del 0-100.
`

      const result = await aiClient.generateText(evaluationPrompt, {
        model: 'openai/gpt-4o-mini',
        maxTokens: 10,
        temperature: 0.1
      })

      const score = parseInt(result.trim())
      return isNaN(score) ? 70 : Math.max(0, Math.min(100, score))

    } catch (error) {
      console.warn('Failed to calculate relevance score with AI, using heuristic:', error)
      return this.calculateRelevanceHeuristic(prompt, response, criteria)
    }
  }

  /**
   * Fallback heuristic for relevance calculation
   */
  private calculateRelevanceHeuristic(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): number {
    let score = 70 // Base score

    const promptWords = prompt.toLowerCase().split(/\s+/)
    const responseWords = response.toLowerCase().split(/\s+/)

    // Check word overlap
    const overlap = promptWords.filter(word =>
      word.length > 3 && responseWords.some(rWord => rWord.includes(word))
    ).length

    const overlapRatio = overlap / Math.max(promptWords.length, 1)
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

  /**
   * Calculate coherence score based on text structure and flow
   */
  private calculateCoherenceScore(response: string, criteria: QualityEvaluationCriteria): number {
    let score = 80 // Base score

    // Check sentence structure
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)

    if (sentences.length === 0) return 0

    // Penalty for very short or very long sentences
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    if (avgSentenceLength < 10 || avgSentenceLength > 200) {
      score -= 15
    }

    // Check for repetition
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()))
    const repetitionRatio = (sentences.length - uniqueSentences.size) / sentences.length
    score -= repetitionRatio * 30

    // Check for logical connectors
    const connectors = ['por lo tanto', 'además', 'sin embargo', 'por ejemplo', 'en consecuencia', 'finalmente']
    const hasConnectors = connectors.some(connector =>
      response.toLowerCase().includes(connector)
    )
    if (hasConnectors) score += 10

    // Check paragraph structure for longer responses
    if (response.length > 300) {
      const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0)
      if (paragraphs.length > 1) score += 5
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate completeness score based on expected response length and content
   */
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
      score -= 10 // Slight penalty for being too verbose
    }

    // Check for required elements
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
      // This is a heuristic - in practice, you'd want more sophisticated analysis
      const responseLength = response.length
      const expectedLengthPerPart = responseLength / questionParts.length
      if (expectedLengthPerPart < 50) { // Each part should have substantial response
        score -= 15
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate accuracy score using various heuristics
   */
  private calculateAccuracyScore(response: string, criteria: QualityEvaluationCriteria): number {
    let score = 85 // Base score (assuming most responses are reasonably accurate)

    // Check for obvious inaccuracies (placeholder implementation)
    const inaccuratePatterns = [
      /lorem ipsum/i,
      /placeholder/i,
      /\[.*\]/g, // Bracket placeholders
      /xxx/i,
      /ejemplo ejemplo/i
    ]

    for (const pattern of inaccuratePatterns) {
      if (pattern.test(response)) {
        score -= 20
      }
    }

    // Check for contradictions within the response
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const contradictionIndicators = ['pero', 'sin embargo', 'no obstante', 'aunque']

    let contradictions = 0
    sentences.forEach(sentence => {
      contradictionIndicators.forEach(indicator => {
        if (sentence.toLowerCase().includes(indicator)) {
          contradictions++
        }
      })
    })

    // Multiple contradictions might indicate confusion
    if (contradictions > 2) score -= 10

    // Check for uncertainty expressions (which are good for accuracy)
    const uncertaintyExpressions = ['podría', 'posiblemente', 'es probable', 'tiende a', 'sugiere']
    const hasUncertainty = uncertaintyExpressions.some(expr =>
      response.toLowerCase().includes(expr)
    )
    if (hasUncertainty) score += 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate creativity score based on uniqueness and originality
   */
  private calculateCreativityScore(response: string, criteria: QualityEvaluationCriteria): number {
    let score = 60 // Base score

    // Check for varied vocabulary
    const words = response.toLowerCase().split(/\s+/).filter(word => word.length > 3)
    const uniqueWords = new Set(words)
    const vocabularyRatio = uniqueWords.size / Math.max(words.length, 1)

    score += vocabularyRatio * 20

    // Check for creative elements
    const creativeIndicators = [
      'innovador', 'creativo', 'original', 'único', 'diferente',
      'alternativa', 'enfoque novedoso', 'perspectiva nueva'
    ]

    const creativeElements = creativeIndicators.filter(indicator =>
      response.toLowerCase().includes(indicator)
    ).length

    score += Math.min(creativeElements * 5, 15)

    // Check for metaphors or analogies
    const analogyIndicators = ['como', 'similar a', 'parecido a', 'igual que', 'es como']
    const hasAnalogies = analogyIndicators.some(indicator =>
      response.toLowerCase().includes(indicator)
    )
    if (hasAnalogies) score += 10

    // Penalty for very generic responses
    const genericPhrases = ['es importante', 'es necesario', 'se debe', 'hay que']
    const genericCount = genericPhrases.filter(phrase =>
      response.toLowerCase().includes(phrase)
    ).length

    score -= Math.min(genericCount * 5, 20)

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate safety score to detect inappropriate content
   */
  private calculateSafetyScore(response: string): number {
    let score = 100 // Start with perfect safety score

    // Check for obviously unsafe content
    const unsafePatterns = [
      /\b(kill|murder|bomb|weapon|attack|harm|hurt|violence|threat)\b/i,
      /\b(hate|racist|sexist|discrimination|bias)\b/i,
      /\b(illegal|criminal|fraud|scam|steal)\b/i
    ]

    for (const pattern of unsafePatterns) {
      if (pattern.test(response)) {
        score -= 50 // Heavy penalty for unsafe content
      }
    }

    // Check for inappropriate language
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell|asshole|bitch)\b/i,
      // Add more as needed for Spanish
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

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(scores: QualityScores, weights: any): number {
    return (
      scores.relevance * weights.relevance +
      scores.coherence * weights.coherence +
      scores.completeness * weights.completeness +
      scores.accuracy * weights.accuracy +
      scores.creativity * weights.creativity +
      scores.safety * weights.safety
    )
  }

  /**
   * Adjust scores based on user feedback
   */
  private adjustScoresBasedOnFeedback(metric: QualityMetrics): void {
    if (!metric.feedback) return

    const userRating = metric.feedback.rating
    const expectedScore = userRating * 20 // Convert 1-5 to 0-100 scale

    const currentScore = metric.scores.overall
    const discrepancy = Math.abs(expectedScore - currentScore)

    // If there's a significant discrepancy, adjust the scores
    if (discrepancy > 20) {
      const adjustmentFactor = 0.3 // Adjust 30% towards user feedback
      const adjustment = (expectedScore - currentScore) * adjustmentFactor

      // Adjust all scores proportionally
      Object.keys(metric.scores).forEach(key => {
        if (key !== 'overall') {
          metric.scores[key as keyof QualityScores] += adjustment
          metric.scores[key as keyof QualityScores] = Math.max(0, Math.min(100, metric.scores[key as keyof QualityScores]))
        }
      })

      // Recalculate overall score
      const criteria = QUALITY_CRITERIA[metric.operation] || this.getDefaultCriteria()
      metric.scores.overall = this.calculateOverallScore(metric.scores, criteria.weights)
    }
  }

  /**
   * Update performance analytics with quality score
   */
  private updatePerformanceAnalytics(requestId: string, qualityScore: number): void {
    // In a real implementation, this would update the corresponding performance metric
    // For now, this is a placeholder that shows the integration point
    console.log(`Updated performance analytics for ${requestId} with quality score: ${qualityScore}`)
  }

  /**
   * Get quality trends over time
   */
  public getQualityTrends(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      userId?: string
    }
  ): QualityTrend[] {
    const filteredMetrics = this.filterQualityMetrics(startTime, endTime, filters)

    // Group by time periods (daily for now)
    const trendMap = new Map<string, QualityMetrics[]>()

    filteredMetrics.forEach(metric => {
      const dateKey = metric.timestamp.toISOString().split('T')[0]
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, [])
      }
      trendMap.get(dateKey)!.push(metric)
    })

    const trends: QualityTrend[] = []

    trendMap.forEach((metrics, period) => {
      const scores = metrics.map(m => m.scores.overall)
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

      // Calculate distribution
      const distribution = {
        excellent: metrics.filter(m => m.scores.overall >= 90).length,
        good: metrics.filter(m => m.scores.overall >= 75 && m.scores.overall < 90).length,
        fair: metrics.filter(m => m.scores.overall >= 60 && m.scores.overall < 75).length,
        poor: metrics.filter(m => m.scores.overall < 60).length
      }

      // Identify top issues from feedback
      const topIssues: string[] = []
      metrics.forEach(metric => {
        if (metric.feedback?.issues) {
          metric.feedback.issues.forEach(issue => {
            topIssues.push(issue.type)
          })
        }
      })

      trends.push({
        period,
        averageScore,
        change: 0, // Would calculate based on previous period
        distribution,
        topIssues: [...new Set(topIssues)].slice(0, 5)
      })
    })

    return trends.sort((a, b) => a.period.localeCompare(b.period))
  }

  /**
   * Compare quality across models
   */
  public compareModelQuality(
    startTime: Date,
    endTime: Date,
    operation?: string
  ): QualityComparison[] {
    const filters = operation ? { operation } : undefined
    const filteredMetrics = this.filterQualityMetrics(startTime, endTime, filters)

    const modelGroups = this.groupMetricsByModel(filteredMetrics)
    const comparisons: QualityComparison[] = []

    modelGroups.forEach((metrics, model) => {
      if (metrics.length === 0) return

      const avgScore = metrics.reduce((sum, m) => sum + m.scores.overall, 0) / metrics.length

      const comparison: QualityComparison = {
        model,
        operation: operation || 'all',
        score: avgScore,
        sampleSize: metrics.length,
        rank: 0, // Will be set after sorting
        strengths: this.identifyModelStrengths(metrics),
        weaknesses: this.identifyModelWeaknesses(metrics)
      }

      comparisons.push(comparison)
    })

    // Sort by score and assign ranks
    comparisons.sort((a, b) => b.score - a.score)
    comparisons.forEach((comparison, index) => {
      comparison.rank = index + 1
    })

    return comparisons
  }

  // Helper methods

  private generateQualityId(): string {
    return `quality_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private getDefaultCriteria(): QualityEvaluationCriteria {
    return {
      operation: 'default',
      weights: {
        relevance: 0.25,
        coherence: 0.20,
        completeness: 0.20,
        accuracy: 0.20,
        creativity: 0.10,
        safety: 0.05
      }
    }
  }

  private filterQualityMetrics(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      userId?: string
    }
  ): QualityMetrics[] {
    return this.qualityMetrics.filter(metric => {
      if (metric.timestamp < startTime || metric.timestamp > endTime) return false
      if (filters?.operation && metric.operation !== filters.operation) return false
      if (filters?.model && metric.model !== filters.model) return false
      if (filters?.userId && metric.userId !== filters.userId) return false
      return true
    })
  }

  private groupMetricsByModel(metrics: QualityMetrics[]): Map<string, QualityMetrics[]> {
    const groups = new Map<string, QualityMetrics[]>()

    metrics.forEach(metric => {
      if (!groups.has(metric.model)) {
        groups.set(metric.model, [])
      }
      groups.get(metric.model)!.push(metric)
    })

    return groups
  }

  private identifyModelStrengths(metrics: QualityMetrics[]): string[] {
    const strengths: string[] = []

    const avgScores = {
      relevance: metrics.reduce((sum, m) => sum + m.scores.relevance, 0) / metrics.length,
      coherence: metrics.reduce((sum, m) => sum + m.scores.coherence, 0) / metrics.length,
      completeness: metrics.reduce((sum, m) => sum + m.scores.completeness, 0) / metrics.length,
      accuracy: metrics.reduce((sum, m) => sum + m.scores.accuracy, 0) / metrics.length,
      creativity: metrics.reduce((sum, m) => sum + m.scores.creativity, 0) / metrics.length,
      safety: metrics.reduce((sum, m) => sum + m.scores.safety, 0) / metrics.length
    }

    Object.entries(avgScores).forEach(([dimension, score]) => {
      if (score > 85) {
        strengths.push(`Excelente ${dimension}`)
      } else if (score > 80) {
        strengths.push(`Buena ${dimension}`)
      }
    })

    return strengths
  }

  private identifyModelWeaknesses(metrics: QualityMetrics[]): string[] {
    const weaknesses: string[] = []

    const avgScores = {
      relevance: metrics.reduce((sum, m) => sum + m.scores.relevance, 0) / metrics.length,
      coherence: metrics.reduce((sum, m) => sum + m.scores.coherence, 0) / metrics.length,
      completeness: metrics.reduce((sum, m) => sum + m.scores.completeness, 0) / metrics.length,
      accuracy: metrics.reduce((sum, m) => sum + m.scores.accuracy, 0) / metrics.length,
      creativity: metrics.reduce((sum, m) => sum + m.scores.creativity, 0) / metrics.length,
      safety: metrics.reduce((sum, m) => sum + m.scores.safety, 0) / metrics.length
    }

    Object.entries(avgScores).forEach(([dimension, score]) => {
      if (score < 60) {
        weaknesses.push(`${dimension} mejorable`)
      } else if (score < 70) {
        weaknesses.push(`${dimension} promedio`)
      }
    })

    return weaknesses
  }

  /**
   * Get all quality metrics with optional filtering
   */
  public getQualityMetrics(filters?: {
    operation?: string
    model?: string
    startDate?: Date
    endDate?: Date
    userId?: string
  }): QualityMetrics[] {
    let filtered = [...this.qualityMetrics]

    if (filters?.operation) {
      filtered = filtered.filter(m => m.operation === filters.operation)
    }
    if (filters?.model) {
      filtered = filtered.filter(m => m.model === filters.model)
    }
    if (filters?.startDate) {
      filtered = filtered.filter(m => m.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      filtered = filtered.filter(m => m.timestamp <= filters.endDate!)
    }
    if (filters?.userId) {
      filtered = filtered.filter(m => m.userId === filters.userId)
    }

    return filtered
  }
}

// Export singleton instance
export const qualityTracker = new QualityMetricsTracker()

// Helper function to automatically evaluate and track quality for AI operations
export async function trackQuality(
  requestId: string,
  operation: string,
  model: string,
  prompt: string,
  response: string,
  userId?: string,
  metadata?: Record<string, any>
): Promise<QualityMetrics> {
  return qualityTracker.evaluateResponse(
    requestId,
    operation,
    model,
    prompt,
    response,
    userId,
    metadata
  )
}