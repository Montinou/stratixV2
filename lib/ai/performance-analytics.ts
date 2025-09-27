import { generateText, gateway } from "ai"
import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"

// Performance analytics interfaces
export interface PerformanceMetrics {
  totalRequests: number
  averageResponseTime: number
  tokenUsage: {
    input: number
    output: number
    total: number
  }
  costMetrics: {
    totalCost: number
    costPerRequest: number
    costPerToken: number
  }
  qualityScore: number
  errorRate: number
  timestamp: Date
}

export interface ModelPerformance {
  modelId: string
  provider: string
  metrics: PerformanceMetrics
  benchmarkScore: number
  reliabilityScore: number
}

export interface AnalyticsQuery {
  timeRange: {
    start: Date
    end: Date
  }
  models?: string[]
  operations?: string[]
  departments?: string[]
  aggregation: 'hourly' | 'daily' | 'weekly' | 'monthly'
}

export interface PerformanceInsight {
  id: string
  type: 'cost_optimization' | 'performance_degradation' | 'quality_improvement' | 'anomaly_detection'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  impact: {
    cost?: number
    performance?: number
    quality?: number
  }
  detectedAt: Date
  resolvedAt?: Date
}

export interface ABTestConfig {
  testId: string
  name: string
  description: string
  variants: {
    name: string
    model: string
    prompt?: string
    parameters?: Record<string, any>
    trafficPercentage: number
  }[]
  metrics: string[]
  startDate: Date
  endDate: Date
  status: 'draft' | 'running' | 'completed' | 'paused'
}

export interface ABTestResult {
  testId: string
  variant: string
  metrics: {
    responseTime: number
    tokenUsage: number
    qualityScore: number
    cost: number
    userSatisfaction?: number
  }
  sampleSize: number
  confidenceLevel: number
  statisticalSignificance: boolean
}

// AI Gateway client for analytics
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Performance tracking storage (in production, use proper database)
const performanceData: PerformanceMetrics[] = []
const modelPerformance: ModelPerformance[] = []
const performanceInsights: PerformanceInsight[] = []
const abTests: ABTestConfig[] = []
const abTestResults: ABTestResult[] = []

export class PerformanceAnalytics {
  private static instance: PerformanceAnalytics
  private metricsBuffer: PerformanceMetrics[] = []
  private alertThresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    costIncrease: 0.2, // 20% increase
    qualityScore: 0.7 // below 70%
  }

  static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics()
    }
    return PerformanceAnalytics.instance
  }

  // Track performance metrics for AI operations
  async trackOperation(
    operationId: string,
    model: string,
    startTime: Date,
    endTime: Date,
    tokenUsage: { input: number; output: number },
    cost: number,
    success: boolean,
    qualityScore?: number
  ): Promise<void> {
    const responseTime = endTime.getTime() - startTime.getTime()
    const totalTokens = tokenUsage.input + tokenUsage.output

    const metrics: PerformanceMetrics = {
      totalRequests: 1,
      averageResponseTime: responseTime,
      tokenUsage: {
        input: tokenUsage.input,
        output: tokenUsage.output,
        total: totalTokens
      },
      costMetrics: {
        totalCost: cost,
        costPerRequest: cost,
        costPerToken: totalTokens > 0 ? cost / totalTokens : 0
      },
      qualityScore: qualityScore || 0.8, // Default quality score
      errorRate: success ? 0 : 1,
      timestamp: new Date()
    }

    this.metricsBuffer.push(metrics)

    // Check for anomalies and alerts
    await this.checkPerformanceAnomalies(metrics, model)

    // Flush buffer if it gets too large
    if (this.metricsBuffer.length > 100) {
      await this.flushMetrics()
    }
  }

  // Aggregate metrics by time period
  async getAggregatedMetrics(query: AnalyticsQuery): Promise<PerformanceMetrics[]> {
    const { timeRange, aggregation } = query

    // Filter metrics by time range
    const filteredMetrics = performanceData.filter(
      metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    )

    if (filteredMetrics.length === 0) {
      return []
    }

    // Group by time period
    const grouped = this.groupMetricsByPeriod(filteredMetrics, aggregation)

    // Aggregate each group
    return Object.values(grouped).map(group => this.aggregateMetrics(group))
  }

  // Calculate cost optimization recommendations
  async analyzeCostOptimization(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = []
    const recentMetrics = performanceData.slice(-100) // Last 100 operations

    if (recentMetrics.length === 0) return insights

    const avgCost = recentMetrics.reduce((sum, m) => sum + m.costMetrics.totalCost, 0) / recentMetrics.length
    const avgQuality = recentMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / recentMetrics.length

    // Analyze cost efficiency
    const costEfficiency = avgQuality / avgCost

    if (costEfficiency < 10) { // Arbitrary threshold for demonstration
      insights.push({
        id: `cost-opt-${Date.now()}`,
        type: 'cost_optimization',
        severity: 'medium',
        title: 'Oportunidad de Optimización de Costos',
        description: `La relación calidad/costo actual es ${costEfficiency.toFixed(2)}, indicando potencial para optimización.`,
        recommendation: 'Considere usar modelos más eficientes como gpt-4o-mini para operaciones que no requieren máxima calidad.',
        impact: {
          cost: avgCost * 0.3, // Potential 30% cost reduction
          performance: -0.05, // Slight performance trade-off
          quality: -0.02 // Minimal quality impact
        },
        detectedAt: new Date()
      })
    }

    return insights
  }

  // Detect performance anomalies
  private async checkPerformanceAnomalies(metrics: PerformanceMetrics, model: string): Promise<void> {
    const insights: PerformanceInsight[] = []

    // Response time anomaly
    if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
      insights.push({
        id: `anomaly-rt-${Date.now()}`,
        type: 'performance_degradation',
        severity: 'high',
        title: 'Tiempo de Respuesta Elevado',
        description: `El modelo ${model} tardó ${metrics.averageResponseTime}ms en responder, superando el umbral de ${this.alertThresholds.responseTime}ms.`,
        recommendation: 'Verifique la carga del modelo y considere implementar failover a modelos alternativos.',
        impact: {
          performance: metrics.averageResponseTime / this.alertThresholds.responseTime
        },
        detectedAt: new Date()
      })
    }

    // Quality score anomaly
    if (metrics.qualityScore < this.alertThresholds.qualityScore) {
      insights.push({
        id: `anomaly-quality-${Date.now()}`,
        type: 'quality_improvement',
        severity: 'medium',
        title: 'Calidad de Respuesta Degradada',
        description: `La calidad promedio ha bajado a ${(metrics.qualityScore * 100).toFixed(1)}%, por debajo del umbral del 70%.`,
        recommendation: 'Revise los prompts y considere ajustar los parámetros del modelo o cambiar a un modelo de mayor capacidad.',
        impact: {
          quality: this.alertThresholds.qualityScore - metrics.qualityScore
        },
        detectedAt: new Date()
      })
    }

    // Error rate anomaly
    if (metrics.errorRate > this.alertThresholds.errorRate) {
      insights.push({
        id: `anomaly-error-${Date.now()}`,
        type: 'anomaly_detection',
        severity: 'critical',
        title: 'Tasa de Error Elevada',
        description: `La tasa de error ha alcanzado ${(metrics.errorRate * 100).toFixed(1)}%, superando el umbral del 5%.`,
        recommendation: 'Implemente mecanismos de retry y failover inmediatamente. Revise la conectividad y estado de los proveedores.',
        impact: {
          performance: metrics.errorRate * 10 // High impact multiplier
        },
        detectedAt: new Date()
      })
    }

    // Store insights
    performanceInsights.push(...insights)
  }

  // Initialize A/B test
  async createABTest(config: ABTestConfig): Promise<string> {
    // Validate traffic percentages sum to 100
    const totalTraffic = config.variants.reduce((sum, v) => sum + v.trafficPercentage, 0)
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Los porcentajes de tráfico deben sumar 100%')
    }

    abTests.push(config)
    return config.testId
  }

  // Record A/B test result
  async recordABTestResult(testId: string, variant: string, result: Omit<ABTestResult, 'testId' | 'variant'>): Promise<void> {
    abTestResults.push({
      testId,
      variant,
      ...result
    })
  }

  // Analyze A/B test results
  async analyzeABTest(testId: string): Promise<{
    winner?: string
    results: ABTestResult[]
    confidence: number
    recommendation: string
  }> {
    const results = abTestResults.filter(r => r.testId === testId)

    if (results.length < 2) {
      return {
        results,
        confidence: 0,
        recommendation: 'Necesita más datos para análisis estadístico.'
      }
    }

    // Simple statistical analysis (in production, use proper statistical tests)
    const variants = [...new Set(results.map(r => r.variant))]
    const variantStats = variants.map(variant => {
      const variantResults = results.filter(r => r.variant === variant)
      const avgQuality = variantResults.reduce((sum, r) => sum + r.metrics.qualityScore, 0) / variantResults.length
      const avgCost = variantResults.reduce((sum, r) => sum + r.metrics.cost, 0) / variantResults.length
      const avgResponseTime = variantResults.reduce((sum, r) => sum + r.metrics.responseTime, 0) / variantResults.length

      return {
        variant,
        avgQuality,
        avgCost,
        avgResponseTime,
        sampleSize: variantResults.length,
        efficiency: avgQuality / avgCost
      }
    })

    // Find winner based on efficiency (quality/cost ratio)
    const winner = variantStats.reduce((best, current) =>
      current.efficiency > best.efficiency ? current : best
    )

    return {
      winner: winner.variant,
      results,
      confidence: Math.min(0.95, winner.sampleSize / 100), // Simplified confidence calculation
      recommendation: `La variante "${winner.variant}" muestra la mejor eficiencia con ${(winner.efficiency * 100).toFixed(1)}% de calidad por costo.`
    }
  }

  // Quality scoring for AI responses
  async calculateQualityScore(response: string, expectedContext: any, userFeedback?: number): Promise<number> {
    let score = 0.5 // Base score

    // Length appropriateness (not too short, not too long)
    const length = response.length
    if (length > 50 && length < 2000) {
      score += 0.1
    }

    // Contains relevant keywords from context
    if (expectedContext && typeof expectedContext === 'object') {
      const contextWords = Object.values(expectedContext).join(' ').toLowerCase()
      const responseWords = response.toLowerCase()
      const relevantWords = ['objetivo', 'progreso', 'meta', 'resultado', 'avance', 'completar']

      const relevanceScore = relevantWords.filter(word =>
        contextWords.includes(word) && responseWords.includes(word)
      ).length / relevantWords.length

      score += relevanceScore * 0.2
    }

    // User feedback integration
    if (userFeedback !== undefined) {
      score = (score * 0.7) + (userFeedback * 0.3) // Weight user feedback at 30%
    }

    // AI-based quality assessment
    try {
      const qualityPrompt = `
        Evalúa la calidad de esta respuesta de IA en una escala de 0 a 1:

        Respuesta: "${response}"

        Criterios:
        - Claridad y coherencia
        - Relevancia al contexto
        - Utilidad práctica
        - Tono profesional

        Responde solo con un número decimal entre 0 y 1.
      `

      const { text } = await generateText({
        model: ai('openai/gpt-4o-mini'),
        prompt: qualityPrompt,
        maxTokens: 10
      })

      const aiScore = parseFloat(text.trim())
      if (!isNaN(aiScore) && aiScore >= 0 && aiScore <= 1) {
        score = (score * 0.6) + (aiScore * 0.4) // Weight AI assessment at 40%
      }
    } catch (error) {
      console.warn('Failed to get AI quality assessment:', error)
    }

    return Math.max(0, Math.min(1, score))
  }

  // Benchmark models against each other
  async benchmarkModels(models: string[], testPrompts: string[]): Promise<ModelPerformance[]> {
    const results: ModelPerformance[] = []

    for (const model of models) {
      const modelMetrics: PerformanceMetrics[] = []

      for (const prompt of testPrompts) {
        const startTime = new Date()

        try {
          const { text, usage } = await generateText({
            model: ai(model),
            prompt,
            maxTokens: 200
          })

          const endTime = new Date()
          const responseTime = endTime.getTime() - startTime.getTime()

          // Estimate cost (simplified - in production, use actual pricing)
          const estimatedCost = this.estimateModelCost(model, usage?.totalTokens || 100)

          // Calculate quality score
          const qualityScore = await this.calculateQualityScore(text, { prompt })

          const metrics: PerformanceMetrics = {
            totalRequests: 1,
            averageResponseTime: responseTime,
            tokenUsage: {
              input: usage?.promptTokens || 50,
              output: usage?.completionTokens || 50,
              total: usage?.totalTokens || 100
            },
            costMetrics: {
              totalCost: estimatedCost,
              costPerRequest: estimatedCost,
              costPerToken: estimatedCost / (usage?.totalTokens || 100)
            },
            qualityScore,
            errorRate: 0,
            timestamp: new Date()
          }

          modelMetrics.push(metrics)
        } catch (error) {
          console.error(`Benchmark failed for model ${model}:`, error)

          const failureMetrics: PerformanceMetrics = {
            totalRequests: 1,
            averageResponseTime: 30000, // Penalty for failure
            tokenUsage: { input: 0, output: 0, total: 0 },
            costMetrics: { totalCost: 0, costPerRequest: 0, costPerToken: 0 },
            qualityScore: 0,
            errorRate: 1,
            timestamp: new Date()
          }

          modelMetrics.push(failureMetrics)
        }
      }

      // Aggregate metrics for this model
      const aggregated = this.aggregateMetrics(modelMetrics)

      // Calculate benchmark and reliability scores
      const benchmarkScore = this.calculateBenchmarkScore(aggregated)
      const reliabilityScore = 1 - aggregated.errorRate

      results.push({
        modelId: model,
        provider: this.extractProvider(model),
        metrics: aggregated,
        benchmarkScore,
        reliabilityScore
      })
    }

    modelPerformance.push(...results)
    return results
  }

  // Get current performance insights
  getPerformanceInsights(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceInsight[] {
    let insights = performanceInsights
      .filter(insight => !insight.resolvedAt)
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())

    if (severity) {
      insights = insights.filter(insight => insight.severity === severity)
    }

    return insights.slice(0, 20) // Return top 20 insights
  }

  // Resolve performance insight
  async resolveInsight(insightId: string): Promise<boolean> {
    const insight = performanceInsights.find(i => i.id === insightId)
    if (insight) {
      insight.resolvedAt = new Date()
      return true
    }
    return false
  }

  // Helper methods
  private groupMetricsByPeriod(metrics: PerformanceMetrics[], period: string): Record<string, PerformanceMetrics[]> {
    const grouped: Record<string, PerformanceMetrics[]> = {}

    metrics.forEach(metric => {
      let key: string
      const date = new Date(metric.timestamp)

      switch (period) {
        case 'hourly':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
          break
        case 'daily':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
          break
        case 'weekly':
          const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))
          key = `week-${week}`
          break
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth()}`
          break
        default:
          key = 'all'
      }

      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(metric)
    })

    return grouped
  }

  private aggregateMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        costMetrics: { totalCost: 0, costPerRequest: 0, costPerToken: 0 },
        qualityScore: 0,
        errorRate: 0,
        timestamp: new Date()
      }
    }

    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0)
    const totalResponseTime = metrics.reduce((sum, m) => sum + (m.averageResponseTime * m.totalRequests), 0)
    const totalInputTokens = metrics.reduce((sum, m) => sum + m.tokenUsage.input, 0)
    const totalOutputTokens = metrics.reduce((sum, m) => sum + m.tokenUsage.output, 0)
    const totalCost = metrics.reduce((sum, m) => sum + m.costMetrics.totalCost, 0)
    const totalQualityScore = metrics.reduce((sum, m) => sum + (m.qualityScore * m.totalRequests), 0)
    const totalErrors = metrics.reduce((sum, m) => sum + (m.errorRate * m.totalRequests), 0)

    const totalTokens = totalInputTokens + totalOutputTokens

    return {
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      tokenUsage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalTokens
      },
      costMetrics: {
        totalCost,
        costPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0
      },
      qualityScore: totalRequests > 0 ? totalQualityScore / totalRequests : 0,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      timestamp: new Date()
    }
  }

  private calculateBenchmarkScore(metrics: PerformanceMetrics): number {
    // Normalize and weight different factors
    const responseTimeScore = Math.max(0, 1 - (metrics.averageResponseTime / 10000)) // Penalty after 10s
    const costScore = Math.max(0, 1 - (metrics.costMetrics.costPerRequest / 0.10)) // Penalty after $0.10 per request
    const qualityScore = metrics.qualityScore
    const reliabilityScore = 1 - metrics.errorRate

    // Weighted average
    return (responseTimeScore * 0.25) + (costScore * 0.25) + (qualityScore * 0.35) + (reliabilityScore * 0.15)
  }

  private extractProvider(model: string): string {
    const parts = model.split('/')
    return parts.length > 1 ? parts[0] : 'unknown'
  }

  private estimateModelCost(model: string, tokens: number): number {
    // Simplified cost estimation (in production, use actual pricing APIs)
    const costPerThousandTokens: Record<string, number> = {
      'openai/gpt-4o': 0.015,
      'openai/gpt-4o-mini': 0.0015,
      'anthropic/claude-3-sonnet-20240229': 0.003,
      'anthropic/claude-3-haiku-20240307': 0.0005,
      'google/gemini-1.5-flash': 0.001,
      'default': 0.002
    }

    const cost = costPerThousandTokens[model] || costPerThousandTokens['default']
    return (tokens / 1000) * cost
  }

  private async flushMetrics(): Promise<void> {
    // In production, flush to database
    performanceData.push(...this.metricsBuffer)
    this.metricsBuffer = []
  }
}

// Export singleton instance
export const performanceAnalytics = PerformanceAnalytics.getInstance()