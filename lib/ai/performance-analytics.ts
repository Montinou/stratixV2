import { aiClient } from './gateway-client'
import type { AIRequestContext } from './gateway-client'

// Performance metrics interfaces
export interface AIPerformanceMetrics {
  requestId: string
  operation: string
  model: string
  provider: string
  startTime: Date
  endTime: Date
  duration: number
  tokensInput: number
  tokensOutput: number
  cost: number
  success: boolean
  error?: string
  qualityScore?: number
  userId?: string
  metadata?: Record<string, any>
}

export interface PerformanceStats {
  totalRequests: number
  successRate: number
  averageLatency: number
  medianLatency: number
  p95Latency: number
  p99Latency: number
  totalCost: number
  averageCost: number
  costPerToken: number
  qualityScore: number
  timeRange: {
    start: Date
    end: Date
  }
}

export interface ModelPerformance {
  model: string
  provider: string
  stats: PerformanceStats
  comparativeRank: number
  recommendations: string[]
}

export interface OperationPerformance {
  operation: string
  models: ModelPerformance[]
  bestModel: string
  worstModel: string
  improvementSuggestions: string[]
}

// Cost calculation constants (based on Vercel AI Gateway pricing)
const MODEL_COSTS = {
  'openai/gpt-4o': { input: 2.5, output: 10.0 }, // per 1M tokens
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'anthropic/claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'anthropic/claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'openai/text-embedding-3-small': { input: 0.02, output: 0 },
  'openai/text-embedding-ada-002': { input: 0.1, output: 0 }
} as const

export class AIPerformanceAnalytics {
  private metrics: AIPerformanceMetrics[] = []
  private readonly maxMetricsInMemory = 10000

  constructor() {
    // In a real implementation, this would connect to a database
    // For now, we'll use in-memory storage with persistence hooks
  }

  /**
   * Record performance metrics for an AI operation
   */
  public recordMetrics(metrics: Omit<AIPerformanceMetrics, 'requestId' | 'cost'>): string {
    const requestId = this.generateRequestId()
    const cost = this.calculateCost(metrics.model, metrics.tokensInput, metrics.tokensOutput)

    const fullMetrics: AIPerformanceMetrics = {
      ...metrics,
      requestId,
      cost
    }

    this.metrics.push(fullMetrics)

    // Keep only the most recent metrics in memory
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory)
    }

    return requestId
  }

  /**
   * Get performance statistics for a given time range
   */
  public getPerformanceStats(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
    }
  ): PerformanceStats {
    const filteredMetrics = this.filterMetrics(startTime, endTime, filters)

    if (filteredMetrics.length === 0) {
      return this.getEmptyStats(startTime, endTime)
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b)
    const costs = filteredMetrics.map(m => m.cost)
    const totalTokens = filteredMetrics.reduce((sum, m) => sum + m.tokensInput + m.tokensOutput, 0)
    const qualityScores = filteredMetrics
      .filter(m => m.qualityScore !== undefined)
      .map(m => m.qualityScore!)

    return {
      totalRequests: filteredMetrics.length,
      successRate: (filteredMetrics.filter(m => m.success).length / filteredMetrics.length) * 100,
      averageLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianLatency: durations[Math.floor(durations.length / 2)],
      p95Latency: durations[Math.floor(durations.length * 0.95)],
      p99Latency: durations[Math.floor(durations.length * 0.99)],
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      averageCost: costs.reduce((sum, c) => sum + c, 0) / costs.length,
      costPerToken: totalTokens > 0 ? costs.reduce((sum, c) => sum + c, 0) / totalTokens : 0,
      qualityScore: qualityScores.length > 0 ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0,
      timeRange: { start: startTime, end: endTime }
    }
  }

  /**
   * Get performance comparison across models for a specific operation
   */
  public getModelComparison(
    operation: string,
    startTime: Date,
    endTime: Date
  ): OperationPerformance {
    const operationMetrics = this.filterMetrics(startTime, endTime, { operation })

    // Group by model
    const modelGroups = this.groupByModel(operationMetrics)

    const modelPerformances: ModelPerformance[] = Object.entries(modelGroups).map(([model, metrics]) => {
      const stats = this.calculateStatsForMetrics(metrics, startTime, endTime)
      const provider = this.extractProvider(model)

      return {
        model,
        provider,
        stats,
        comparativeRank: 0, // Will be calculated after sorting
        recommendations: this.generateModelRecommendations(model, stats)
      }
    })

    // Rank models by overall performance score
    const rankedModels = this.rankModels(modelPerformances)

    return {
      operation,
      models: rankedModels,
      bestModel: rankedModels[0]?.model || '',
      worstModel: rankedModels[rankedModels.length - 1]?.model || '',
      improvementSuggestions: this.generateImprovementSuggestions(rankedModels)
    }
  }

  /**
   * Detect performance anomalies
   */
  public detectAnomalies(
    lookbackHours: number = 24,
    thresholds?: {
      latencyMultiplier?: number
      errorRateThreshold?: number
      costMultiplier?: number
    }
  ): Array<{
    type: 'latency' | 'error_rate' | 'cost' | 'quality'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    affectedOperations: string[]
    recommendation: string
    detectedAt: Date
  }> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - lookbackHours * 60 * 60 * 1000)
    const baselineStart = new Date(startTime.getTime() - lookbackHours * 60 * 60 * 1000)

    const currentMetrics = this.filterMetrics(startTime, endTime)
    const baselineMetrics = this.filterMetrics(baselineStart, startTime)

    const anomalies: Array<any> = []

    // Latency anomalies
    const currentLatency = this.getAverageLatency(currentMetrics)
    const baselineLatency = this.getAverageLatency(baselineMetrics)
    const latencyMultiplier = thresholds?.latencyMultiplier || 2.0

    if (currentLatency > baselineLatency * latencyMultiplier) {
      anomalies.push({
        type: 'latency' as const,
        severity: currentLatency > baselineLatency * 3 ? 'critical' as const : 'high' as const,
        description: `Latencia promedio ${((currentLatency / baselineLatency - 1) * 100).toFixed(1)}% mayor que el baseline`,
        affectedOperations: this.getSlowOperations(currentMetrics),
        recommendation: 'Revisar modelos utilizados y considerar optimización de prompts',
        detectedAt: new Date()
      })
    }

    // Error rate anomalies
    const currentErrorRate = this.getErrorRate(currentMetrics)
    const baselineErrorRate = this.getErrorRate(baselineMetrics)
    const errorThreshold = thresholds?.errorRateThreshold || 5.0

    if (currentErrorRate > Math.max(baselineErrorRate * 2, errorThreshold)) {
      anomalies.push({
        type: 'error_rate' as const,
        severity: currentErrorRate > 20 ? 'critical' as const : 'high' as const,
        description: `Tasa de error del ${currentErrorRate.toFixed(1)}% detectada`,
        affectedOperations: this.getErrorProneOperations(currentMetrics),
        recommendation: 'Verificar conectividad con providers y revisar configuración de fallbacks',
        detectedAt: new Date()
      })
    }

    // Cost anomalies
    const currentCost = this.getTotalCost(currentMetrics)
    const baselineCost = this.getTotalCost(baselineMetrics)
    const costMultiplier = thresholds?.costMultiplier || 2.5

    if (currentCost > baselineCost * costMultiplier) {
      anomalies.push({
        type: 'cost' as const,
        severity: currentCost > baselineCost * 5 ? 'critical' as const : 'medium' as const,
        description: `Costo ${((currentCost / baselineCost - 1) * 100).toFixed(1)}% mayor que el baseline`,
        affectedOperations: this.getExpensiveOperations(currentMetrics),
        recommendation: 'Considerar usar modelos más económicos o optimizar el número de tokens',
        detectedAt: new Date()
      })
    }

    return anomalies
  }

  /**
   * Generate optimization recommendations
   */
  public generateOptimizationRecommendations(
    timeRange: { start: Date; end: Date },
    targetMetric: 'cost' | 'latency' | 'quality' = 'cost'
  ): Array<{
    type: 'model_switch' | 'parameter_tuning' | 'caching' | 'batching'
    description: string
    expectedImpact: string
    implementation: string
    priority: 'low' | 'medium' | 'high'
  }> {
    const metrics = this.filterMetrics(timeRange.start, timeRange.end)
    const recommendations: Array<any> = []

    // Model switching recommendations
    const operationGroups = this.groupByOperation(metrics)

    for (const [operation, operationMetrics] of Object.entries(operationGroups)) {
      const modelComparison = this.getModelComparison(operation, timeRange.start, timeRange.end)

      if (modelComparison.models.length > 1) {
        const bestModel = modelComparison.models[0]
        const currentModel = this.getMostUsedModel(operationMetrics)

        if (bestModel.model !== currentModel) {
          let impact = ''
          let priority: 'low' | 'medium' | 'high' = 'medium'

          if (targetMetric === 'cost') {
            const currentStats = modelComparison.models.find(m => m.model === currentModel)?.stats
            if (currentStats && bestModel.stats.averageCost < currentStats.averageCost * 0.7) {
              impact = `Reducción estimada de costo: ${((1 - bestModel.stats.averageCost / currentStats.averageCost) * 100).toFixed(1)}%`
              priority = 'high'
            }
          }

          if (impact) {
            recommendations.push({
              type: 'model_switch' as const,
              description: `Cambiar de ${currentModel} a ${bestModel.model} para operación ${operation}`,
              expectedImpact: impact,
              implementation: `Actualizar configuración de modelo en la operación ${operation}`,
              priority
            })
          }
        }
      }
    }

    // Caching recommendations
    const repetitiveRequests = this.findRepetitiveRequests(metrics)
    if (repetitiveRequests.length > 0) {
      recommendations.push({
        type: 'caching' as const,
        description: 'Implementar cache para requests repetitivos',
        expectedImpact: `Reducción potencial de ${repetitiveRequests.length} requests duplicados`,
        implementation: 'Añadir layer de cache con TTL apropiado',
        priority: repetitiveRequests.length > 50 ? 'high' as const : 'medium' as const
      })
    }

    return recommendations
  }

  // Private helper methods

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelCost = MODEL_COSTS[model as keyof typeof MODEL_COSTS]
    if (!modelCost) return 0

    const inputCost = (inputTokens / 1000000) * modelCost.input
    const outputCost = (outputTokens / 1000000) * modelCost.output

    return inputCost + outputCost
  }

  private filterMetrics(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
    }
  ): AIPerformanceMetrics[] {
    return this.metrics.filter(metric => {
      if (metric.startTime < startTime || metric.startTime > endTime) return false
      if (filters?.operation && metric.operation !== filters.operation) return false
      if (filters?.model && metric.model !== filters.model) return false
      if (filters?.provider && metric.provider !== filters.provider) return false
      if (filters?.userId && metric.userId !== filters.userId) return false
      return true
    })
  }

  private getEmptyStats(startTime: Date, endTime: Date): PerformanceStats {
    return {
      totalRequests: 0,
      successRate: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      totalCost: 0,
      averageCost: 0,
      costPerToken: 0,
      qualityScore: 0,
      timeRange: { start: startTime, end: endTime }
    }
  }

  private groupByModel(metrics: AIPerformanceMetrics[]): Record<string, AIPerformanceMetrics[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.model]) {
        groups[metric.model] = []
      }
      groups[metric.model].push(metric)
      return groups
    }, {} as Record<string, AIPerformanceMetrics[]>)
  }

  private groupByOperation(metrics: AIPerformanceMetrics[]): Record<string, AIPerformanceMetrics[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = []
      }
      groups[metric.operation].push(metric)
      return groups
    }, {} as Record<string, AIPerformanceMetrics[]>)
  }

  private calculateStatsForMetrics(metrics: AIPerformanceMetrics[], startTime: Date, endTime: Date): PerformanceStats {
    if (metrics.length === 0) return this.getEmptyStats(startTime, endTime)

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
    const costs = metrics.map(m => m.cost)
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokensInput + m.tokensOutput, 0)
    const qualityScores = metrics
      .filter(m => m.qualityScore !== undefined)
      .map(m => m.qualityScore!)

    return {
      totalRequests: metrics.length,
      successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
      averageLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianLatency: durations[Math.floor(durations.length / 2)],
      p95Latency: durations[Math.floor(durations.length * 0.95)],
      p99Latency: durations[Math.floor(durations.length * 0.99)],
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      averageCost: costs.reduce((sum, c) => sum + c, 0) / costs.length,
      costPerToken: totalTokens > 0 ? costs.reduce((sum, c) => sum + c, 0) / totalTokens : 0,
      qualityScore: qualityScores.length > 0 ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0,
      timeRange: { start: startTime, end: endTime }
    }
  }

  private extractProvider(model: string): string {
    return model.split('/')[0] || 'unknown'
  }

  private generateModelRecommendations(model: string, stats: PerformanceStats): string[] {
    const recommendations: string[] = []

    if (stats.successRate < 95) {
      recommendations.push('Considerar configurar fallback adicionales para mejorar confiabilidad')
    }

    if (stats.averageLatency > 5000) {
      recommendations.push('Evaluar modelos más rápidos para casos de uso en tiempo real')
    }

    if (stats.costPerToken > 0.00001) {
      recommendations.push('Considerar modelos más económicos para operaciones de alto volumen')
    }

    if (stats.qualityScore > 0 && stats.qualityScore < 70) {
      recommendations.push('Revisar y optimizar prompts para mejorar calidad de respuestas')
    }

    return recommendations
  }

  private rankModels(models: ModelPerformance[]): ModelPerformance[] {
    // Score based on weighted combination of metrics
    const scored = models.map(model => {
      const successWeight = 0.3
      const latencyWeight = 0.25
      const costWeight = 0.25
      const qualityWeight = 0.2

      // Normalize scores (higher is better)
      const successScore = model.stats.successRate
      const latencyScore = Math.max(0, 100 - (model.stats.averageLatency / 100))
      const costScore = Math.max(0, 100 - (model.stats.averageCost * 10000))
      const qualityScore = model.stats.qualityScore || 50

      const overallScore =
        successScore * successWeight +
        latencyScore * latencyWeight +
        costScore * costWeight +
        qualityScore * qualityWeight

      return { ...model, overallScore }
    })

    // Sort by overall score (descending)
    scored.sort((a, b) => b.overallScore - a.overallScore)

    // Assign ranks
    return scored.map((model, index) => ({
      ...model,
      comparativeRank: index + 1
    }))
  }

  private generateImprovementSuggestions(models: ModelPerformance[]): string[] {
    const suggestions: string[] = []

    if (models.length === 0) return suggestions

    const bestModel = models[0]
    const worstModel = models[models.length - 1]

    if (bestModel.stats.successRate > worstModel.stats.successRate + 10) {
      suggestions.push('Migrar requests del modelo menos confiable al más confiable')
    }

    if (bestModel.stats.averageCost < worstModel.stats.averageCost * 0.5) {
      suggestions.push('Evaluar migración a modelo más económico para reducir costos')
    }

    if (models.some(m => m.stats.averageLatency > 10000)) {
      suggestions.push('Implementar timeout más agresivo para modelos lentos')
    }

    return suggestions
  }

  private getAverageLatency(metrics: AIPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  }

  private getErrorRate(metrics: AIPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0
    return (metrics.filter(m => !m.success).length / metrics.length) * 100
  }

  private getTotalCost(metrics: AIPerformanceMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.cost, 0)
  }

  private getSlowOperations(metrics: AIPerformanceMetrics[]): string[] {
    const operationLatencies = this.groupByOperation(metrics)
    return Object.entries(operationLatencies)
      .filter(([_, opMetrics]) => this.getAverageLatency(opMetrics) > 5000)
      .map(([operation, _]) => operation)
  }

  private getErrorProneOperations(metrics: AIPerformanceMetrics[]): string[] {
    const operationGroups = this.groupByOperation(metrics)
    return Object.entries(operationGroups)
      .filter(([_, opMetrics]) => this.getErrorRate(opMetrics) > 10)
      .map(([operation, _]) => operation)
  }

  private getExpensiveOperations(metrics: AIPerformanceMetrics[]): string[] {
    const operationGroups = this.groupByOperation(metrics)
    return Object.entries(operationGroups)
      .filter(([_, opMetrics]) => this.getTotalCost(opMetrics) > 1.0)
      .map(([operation, _]) => operation)
  }

  private getMostUsedModel(metrics: AIPerformanceMetrics[]): string {
    const modelCounts = metrics.reduce((counts, metric) => {
      counts[metric.model] = (counts[metric.model] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    return Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || ''
  }

  private findRepetitiveRequests(metrics: AIPerformanceMetrics[]): AIPerformanceMetrics[] {
    // Simple implementation: find requests with very similar metadata
    const seen = new Set<string>()
    const repetitive: AIPerformanceMetrics[] = []

    for (const metric of metrics) {
      const key = `${metric.operation}-${metric.model}-${JSON.stringify(metric.metadata)}`
      if (seen.has(key)) {
        repetitive.push(metric)
      } else {
        seen.add(key)
      }
    }

    return repetitive
  }
}

// Export singleton instance
export const performanceAnalytics = new AIPerformanceAnalytics()

// Instrumentation helper for tracking AI operations
export function instrumentAIOperation<T>(
  operation: string,
  model: string,
  provider: string,
  aiFunction: () => Promise<T>,
  userId?: string,
  metadata?: Record<string, any>
): Promise<T & { requestId: string }> {
  const startTime = new Date()

  return aiFunction()
    .then(result => {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      // Extract token usage from result if available
      const tokensInput = (result as any)?.usage?.promptTokens || 0
      const tokensOutput = (result as any)?.usage?.completionTokens || 0

      const requestId = performanceAnalytics.recordMetrics({
        operation,
        model,
        provider,
        startTime,
        endTime,
        duration,
        tokensInput,
        tokensOutput,
        success: true,
        userId,
        metadata
      })

      return { ...result, requestId }
    })
    .catch(error => {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      const requestId = performanceAnalytics.recordMetrics({
        operation,
        model,
        provider,
        startTime,
        endTime,
        duration,
        tokensInput: 0,
        tokensOutput: 0,
        success: false,
        error: error.message,
        userId,
        metadata
      })

      // Re-throw with requestId for debugging
      const enhancedError = new Error(error.message)
      ;(enhancedError as any).requestId = requestId
      throw enhancedError
    })
}