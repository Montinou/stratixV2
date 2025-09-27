import { getDrizzleClient } from '@/lib/database/client'
import { aiPerformanceMetrics } from '@/lib/database/schema'
import { eq, and, gte, lte, desc, sql, avg, count, sum } from 'drizzle-orm'
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

import { CostCalculator } from '@/lib/performance/unified-performance-service'

// Use the unified cost calculator for consistency
const costCalculator = new CostCalculator()

export class AIPerformanceAnalyticsDB {
  private db = getDrizzleClient()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up old metrics every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 24 * 60 * 60 * 1000)
  }

  /**
   * Record performance metrics for an AI operation
   */
  public async recordMetrics(metrics: Omit<AIPerformanceMetrics, 'requestId' | 'cost'>): Promise<string> {
    try {
      const requestId = this.generateRequestId()
      const cost = this.calculateCost(metrics.model, metrics.tokensInput, metrics.tokensOutput)

      const result = await this.db
        .insert(aiPerformanceMetrics)
        .values({
          requestId,
          operation: metrics.operation,
          model: metrics.model,
          provider: this.extractProvider(metrics.model),
          startTime: metrics.startTime,
          endTime: metrics.endTime,
          duration: metrics.duration,
          tokensInput: metrics.tokensInput,
          tokensOutput: metrics.tokensOutput,
          cost: cost.toString(),
          success: metrics.success,
          error: metrics.error,
          qualityScore: metrics.qualityScore,
          userId: metrics.userId,
          metadata: JSON.stringify(metrics.metadata || {}),
        })
        .returning({ id: aiPerformanceMetrics.id })

      return requestId
    } catch (error) {
      console.error('Error recording performance metrics:', error)
      throw error
    }
  }

  /**
   * Get performance statistics for a given time range
   */
  public async getPerformanceStats(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
    }
  ): Promise<PerformanceStats> {
    try {
      let query = this.db
        .select()
        .from(aiPerformanceMetrics)
        .where(
          and(
            gte(aiPerformanceMetrics.startTime, startTime),
            lte(aiPerformanceMetrics.startTime, endTime)
          )
        )

      // Apply filters
      if (filters?.operation) {
        query = query.where(eq(aiPerformanceMetrics.operation, filters.operation))
      }
      if (filters?.model) {
        query = query.where(eq(aiPerformanceMetrics.model, filters.model))
      }
      if (filters?.provider) {
        query = query.where(eq(aiPerformanceMetrics.provider, filters.provider))
      }
      if (filters?.userId) {
        query = query.where(eq(aiPerformanceMetrics.userId, filters.userId))
      }

      const metrics = await query

      if (metrics.length === 0) {
        return this.getEmptyStats(startTime, endTime)
      }

      // Calculate statistics
      const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
      const costs = metrics.map(m => parseFloat(m.cost.toString()))
      const totalTokens = metrics.reduce((sum, m) => sum + m.tokensInput + m.tokensOutput, 0)
      const qualityScores = metrics
        .filter(m => m.qualityScore !== null)
        .map(m => m.qualityScore!)

      const successfulMetrics = metrics.filter(m => m.success)

      return {
        totalRequests: metrics.length,
        successRate: (successfulMetrics.length / metrics.length) * 100,
        averageLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        medianLatency: durations[Math.floor(durations.length / 2)] || 0,
        p95Latency: durations[Math.floor(durations.length * 0.95)] || 0,
        p99Latency: durations[Math.floor(durations.length * 0.99)] || 0,
        totalCost: costs.reduce((sum, c) => sum + c, 0),
        averageCost: costs.reduce((sum, c) => sum + c, 0) / costs.length || 0,
        costPerToken: totalTokens > 0 ? costs.reduce((sum, c) => sum + c, 0) / totalTokens : 0,
        qualityScore: qualityScores.length > 0 ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0,
        timeRange: { start: startTime, end: endTime }
      }
    } catch (error) {
      console.error('Error getting performance stats:', error)
      return this.getEmptyStats(startTime, endTime)
    }
  }

  /**
   * Get performance comparison across models for a specific operation
   */
  public async getModelComparison(
    operation: string,
    startTime: Date,
    endTime: Date
  ): Promise<OperationPerformance> {
    try {
      const metrics = await this.db
        .select()
        .from(aiPerformanceMetrics)
        .where(
          and(
            eq(aiPerformanceMetrics.operation, operation),
            gte(aiPerformanceMetrics.startTime, startTime),
            lte(aiPerformanceMetrics.startTime, endTime)
          )
        )

      // Group by model
      const modelGroups = this.groupByModel(metrics)

      const modelPerformances: ModelPerformance[] = []

      for (const [model, modelMetrics] of Object.entries(modelGroups)) {
        const stats = this.calculateStatsForMetrics(modelMetrics, startTime, endTime)
        const provider = this.extractProvider(model)

        modelPerformances.push({
          model,
          provider,
          stats,
          comparativeRank: 0, // Will be calculated after sorting
          recommendations: this.generateModelRecommendations(model, stats)
        })
      }

      // Rank models by overall performance score
      const rankedModels = this.rankModels(modelPerformances)

      return {
        operation,
        models: rankedModels,
        bestModel: rankedModels[0]?.model || '',
        worstModel: rankedModels[rankedModels.length - 1]?.model || '',
        improvementSuggestions: this.generateImprovementSuggestions(rankedModels)
      }
    } catch (error) {
      console.error('Error getting model comparison:', error)
      return {
        operation,
        models: [],
        bestModel: '',
        worstModel: '',
        improvementSuggestions: []
      }
    }
  }

  /**
   * Detect performance anomalies
   */
  public async detectAnomalies(
    lookbackHours: number = 24,
    thresholds?: {
      latencyMultiplier?: number
      errorRateThreshold?: number
      costMultiplier?: number
    }
  ): Promise<Array<{
    type: 'latency' | 'error_rate' | 'cost' | 'quality'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    affectedOperations: string[]
    recommendation: string
    detectedAt: Date
  }>> {
    try {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - lookbackHours * 60 * 60 * 1000)
      const baselineStart = new Date(startTime.getTime() - lookbackHours * 60 * 60 * 1000)

      const currentMetrics = await this.getMetricsInRange(startTime, endTime)
      const baselineMetrics = await this.getMetricsInRange(baselineStart, startTime)

      const anomalies: Array<any> = []

      // Latency anomalies
      const currentLatency = this.getAverageLatency(currentMetrics)
      const baselineLatency = this.getAverageLatency(baselineMetrics)
      const latencyMultiplier = thresholds?.latencyMultiplier || 2.0

      if (currentLatency > baselineLatency * latencyMultiplier && baselineLatency > 0) {
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

      if (currentCost > baselineCost * costMultiplier && baselineCost > 0) {
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
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return []
    }
  }

  /**
   * Generate optimization recommendations
   */
  public async generateOptimizationRecommendations(
    timeRange: { start: Date; end: Date },
    targetMetric: 'cost' | 'latency' | 'quality' = 'cost'
  ): Promise<Array<{
    type: 'model_switch' | 'parameter_tuning' | 'caching' | 'batching'
    description: string
    expectedImpact: string
    implementation: string
    priority: 'low' | 'medium' | 'high'
  }>> {
    try {
      const metrics = await this.getMetricsInRange(timeRange.start, timeRange.end)
      const recommendations: Array<any> = []

      // Model switching recommendations
      const operationGroups = this.groupByOperation(metrics)

      for (const [operation, operationMetrics] of Object.entries(operationGroups)) {
        const modelComparison = await this.getModelComparison(operation, timeRange.start, timeRange.end)

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
    } catch (error) {
      console.error('Error generating optimization recommendations:', error)
      return []
    }
  }

  // Private helper methods

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    return costCalculator.calculateCost(model, inputTokens, outputTokens)
  }

  private extractProvider(model: string): string {
    return model.split('/')[0] || 'unknown'
  }

  private async getMetricsInRange(startTime: Date, endTime: Date): Promise<any[]> {
    return await this.db
      .select()
      .from(aiPerformanceMetrics)
      .where(
        and(
          gte(aiPerformanceMetrics.startTime, startTime),
          lte(aiPerformanceMetrics.startTime, endTime)
        )
      )
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

  private groupByModel(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.model]) {
        groups[metric.model] = []
      }
      groups[metric.model].push(metric)
      return groups
    }, {} as Record<string, any[]>)
  }

  private groupByOperation(metrics: any[]): Record<string, any[]> {
    return metrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = []
      }
      groups[metric.operation].push(metric)
      return groups
    }, {} as Record<string, any[]>)
  }

  private calculateStatsForMetrics(metrics: any[], startTime: Date, endTime: Date): PerformanceStats {
    if (metrics.length === 0) return this.getEmptyStats(startTime, endTime)

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b)
    const costs = metrics.map(m => parseFloat(m.cost.toString()))
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokensInput + m.tokensOutput, 0)
    const qualityScores = metrics
      .filter(m => m.qualityScore !== null)
      .map(m => m.qualityScore!)

    return {
      totalRequests: metrics.length,
      successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
      averageLatency: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianLatency: durations[Math.floor(durations.length / 2)] || 0,
      p95Latency: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Latency: durations[Math.floor(durations.length * 0.99)] || 0,
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      averageCost: costs.reduce((sum, c) => sum + c, 0) / costs.length || 0,
      costPerToken: totalTokens > 0 ? costs.reduce((sum, c) => sum + c, 0) / totalTokens : 0,
      qualityScore: qualityScores.length > 0 ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0,
      timeRange: { start: startTime, end: endTime }
    }
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

  private getAverageLatency(metrics: any[]): number {
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  }

  private getErrorRate(metrics: any[]): number {
    if (metrics.length === 0) return 0
    return (metrics.filter(m => !m.success).length / metrics.length) * 100
  }

  private getTotalCost(metrics: any[]): number {
    return metrics.reduce((sum, m) => sum + parseFloat(m.cost.toString()), 0)
  }

  private getSlowOperations(metrics: any[]): string[] {
    const operationLatencies = this.groupByOperation(metrics)
    return Object.entries(operationLatencies)
      .filter(([_, opMetrics]) => this.getAverageLatency(opMetrics) > 5000)
      .map(([operation, _]) => operation)
  }

  private getErrorProneOperations(metrics: any[]): string[] {
    const operationGroups = this.groupByOperation(metrics)
    return Object.entries(operationGroups)
      .filter(([_, opMetrics]) => this.getErrorRate(opMetrics) > 10)
      .map(([operation, _]) => operation)
  }

  private getExpensiveOperations(metrics: any[]): string[] {
    const operationGroups = this.groupByOperation(metrics)
    return Object.entries(operationGroups)
      .filter(([_, opMetrics]) => this.getTotalCost(opMetrics) > 1.0)
      .map(([operation, _]) => operation)
  }

  private getMostUsedModel(metrics: any[]): string {
    const modelCounts = metrics.reduce((counts, metric) => {
      counts[metric.model] = (counts[metric.model] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    return Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || ''
  }

  private findRepetitiveRequests(metrics: any[]): any[] {
    // Simple implementation: find requests with very similar metadata
    const seen = new Set<string>()
    const repetitive: any[] = []

    for (const metric of metrics) {
      const metadataStr = typeof metric.metadata === 'string' ? metric.metadata : JSON.stringify(metric.metadata)
      const key = `${metric.operation}-${metric.model}-${metadataStr}`
      if (seen.has(key)) {
        repetitive.push(metric)
      } else {
        seen.add(key)
      }
    }

    return repetitive
  }

  /**
   * Clean up old metrics (older than 30 days)
   */
  private async cleanup(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      await this.db
        .delete(aiPerformanceMetrics)
        .where(lte(aiPerformanceMetrics.startTime, thirtyDaysAgo))

      console.log(`Performance Analytics: Cleaned up old metrics`)
    } catch (error) {
      console.error('Error during performance analytics cleanup:', error)
    }
  }

  /**
   * Destroy analytics instance and cleanup intervals
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const performanceAnalyticsDB = new AIPerformanceAnalyticsDB()

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
    .then(async result => {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      // Extract token usage from result if available
      const tokensInput = (result as any)?.usage?.promptTokens || 0
      const tokensOutput = (result as any)?.usage?.completionTokens || 0

      const requestId = await performanceAnalyticsDB.recordMetrics({
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
    .catch(async error => {
      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      const requestId = await performanceAnalyticsDB.recordMetrics({
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