/**
 * Unified Performance Monitoring Service
 *
 * Single Source of Truth (SSOT) for all performance monitoring functionality.
 * Consolidates cost calculation, metrics collection, benchmarking, quality tracking,
 * and analytics into a single, cohesive service.
 *
 * Replaces:
 * - lib/ai/performance-analytics.ts
 * - lib/ai/benchmarking.ts (performance aspects)
 * - lib/ai/quality-metrics.ts (performance aspects)
 * - lib/ai/ab-testing.ts (cost calculation)
 * - lib/performance/connection-metrics.ts (integration point)
 */

import { getDrizzleDb } from '@/lib/database/client'

// ============================================================================
// CORE INTERFACES - Single Source of Truth
// ============================================================================

export interface PerformanceMetrics {
  requestId: string
  operation: string
  model: string
  provider: string
  userId?: string

  // Timing metrics
  startTime: Date
  endTime: Date
  duration: number

  // Token usage
  tokensInput: number
  tokensOutput: number
  totalTokens: number

  // Cost metrics
  cost: number
  costBreakdown: {
    inputCost: number
    outputCost: number
  }

  // Quality metrics
  qualityScore?: number
  qualityBreakdown?: QualityBreakdown

  // Status and error handling
  success: boolean
  error?: string
  statusCode?: number

  // Context and metadata
  sessionId?: string
  testId?: string // For A/B testing
  variantId?: string // For A/B testing
  metadata?: Record<string, any>

  // Computed metrics
  tokensPerSecond: number
  costPerToken: number
  efficiency: number // Quality/Cost ratio
}

export interface QualityBreakdown {
  relevance: number
  coherence: number
  completeness: number
  accuracy: number
  creativity: number
  safety: number
  overall: number
}

export interface PerformanceStats {
  timeRange: {
    start: Date
    end: Date
  }

  // Basic metrics
  totalRequests: number
  successRate: number
  errorRate: number

  // Latency metrics
  averageLatency: number
  medianLatency: number
  p95Latency: number
  p99Latency: number
  latencyDistribution: Record<string, number>

  // Cost metrics
  totalCost: number
  averageCost: number
  costPerToken: number
  costDistribution: Record<string, number>

  // Quality metrics
  averageQuality: number
  qualityDistribution: Record<string, number>

  // Efficiency metrics
  averageEfficiency: number
  tokensPerSecond: number

  // Trends
  trend: {
    direction: 'improving' | 'stable' | 'degrading'
    velocity: number
    confidence: number
  }
}

export interface ModelComparison {
  model: string
  provider: string
  stats: PerformanceStats
  rank: number
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendation: string
  confidence: number
}

export interface PerformanceAlert {
  id: string
  type: 'latency' | 'cost' | 'quality' | 'error_rate' | 'utilization'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  threshold: number
  actual: number
  impact: string
  recommendation: string
  detectedAt: Date
  resolvedAt?: Date
  metadata?: Record<string, any>
}

export interface BenchmarkConfig {
  id: string
  name: string
  description: string
  testCases: BenchmarkTestCase[]
  models: string[]
  criteria: QualityEvaluationCriteria
  minSampleSize: number
  maxDuration: number
}

export interface BenchmarkTestCase {
  id: string
  name: string
  category: 'text_generation' | 'chat_completion' | 'embedding' | 'analysis'
  prompt: string
  expectedLatency: number
  qualityCriteria: QualityEvaluationCriteria
  metadata?: Record<string, any>
}

export interface QualityEvaluationCriteria {
  weights: {
    relevance: number
    coherence: number
    completeness: number
    accuracy: number
    creativity: number
    safety: number
  }
  thresholds: {
    minimum: number
    good: number
    excellent: number
  }
  specificCriteria?: {
    minLength?: number
    maxLength?: number
    requiredElements?: string[]
    forbiddenElements?: string[]
    domainKnowledge?: string[]
  }
}

export interface BenchmarkResult {
  benchmarkId: string
  testCaseId: string
  model: string
  metrics: PerformanceMetrics
  rank: number
  passed: boolean
  issues: string[]
  timestamp: Date
}

// ============================================================================
// COST CALCULATION MODULE - Single Source of Truth
// ============================================================================

/**
 * Unified cost calculation based on Vercel AI Gateway pricing
 * Updated with latest model pricing as of 2024
 */
const MODEL_COSTS = {
  // OpenAI Models
  'openai/gpt-4o': { input: 2.5, output: 10.0 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
  'openai/gpt-4-turbo': { input: 5.0, output: 15.0 },
  'openai/gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Anthropic Models
  'anthropic/claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'anthropic/claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'anthropic/claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Google Models
  'google/gemini-pro': { input: 0.5, output: 1.5 },
  'google/gemini-pro-vision': { input: 0.5, output: 1.5 },

  // Embedding Models
  'openai/text-embedding-3-large': { input: 0.13, output: 0 },
  'openai/text-embedding-3-small': { input: 0.02, output: 0 },
  'openai/text-embedding-ada-002': { input: 0.1, output: 0 },

  // Other Models
  'mistral/mistral-large': { input: 4.0, output: 12.0 },
  'mistral/mistral-medium': { input: 2.7, output: 8.1 },
  'cohere/command-r-plus': { input: 3.0, output: 15.0 },
} as const

export class CostCalculator {
  /**
   * Calculate cost for a specific model and token usage
   */
  public static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { total: number; inputCost: number; outputCost: number } {
    const modelCost = MODEL_COSTS[model as keyof typeof MODEL_COSTS]

    if (!modelCost) {
      console.warn(`Cost data not available for model: ${model}`)
      return { total: 0, inputCost: 0, outputCost: 0 }
    }

    const inputCost = (inputTokens / 1_000_000) * modelCost.input
    const outputCost = (outputTokens / 1_000_000) * modelCost.output
    const total = inputCost + outputCost

    return { total, inputCost, outputCost }
  }

  /**
   * Estimate tokens from text (rough approximation)
   */
  public static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for most languages
    // More accurate for Spanish/English, may vary for other languages
    return Math.ceil(text.length / 4)
  }

  /**
   * Get all available models with their pricing
   */
  public static getAvailableModels(): Array<{
    model: string
    provider: string
    inputCost: number
    outputCost: number
    category: string
  }> {
    return Object.entries(MODEL_COSTS).map(([model, costs]) => ({
      model,
      provider: model.split('/')[0],
      inputCost: costs.input,
      outputCost: costs.output,
      category: model.includes('embedding') ? 'embedding' : 'text'
    }))
  }

  /**
   * Find most cost-effective model for given usage pattern
   */
  public static findMostCostEffective(
    inputTokens: number,
    outputTokens: number,
    category: 'text' | 'embedding' = 'text'
  ): { model: string; cost: number; savings: number } {
    const models = this.getAvailableModels()
      .filter(m => m.category === category)

    const costs = models.map(model => ({
      model: model.model,
      cost: this.calculateCost(model.model, inputTokens, outputTokens).total
    })).sort((a, b) => a.cost - b.cost)

    const cheapest = costs[0]
    const mostExpensive = costs[costs.length - 1]
    const savings = mostExpensive.cost - cheapest.cost

    return {
      model: cheapest.model,
      cost: cheapest.cost,
      savings
    }
  }
}

// ============================================================================
// METRICS COLLECTION SERVICE
// ============================================================================

export class MetricsCollector {
  private metrics: PerformanceMetrics[] = []
  private alerts: PerformanceAlert[] = []
  private readonly maxMetricsInMemory = 10000
  private readonly maxAlertsInMemory = 1000

  /**
   * Record performance metrics for an operation
   */
  public recordMetrics(data: {
    operation: string
    model: string
    provider: string
    startTime: Date
    endTime: Date
    tokensInput: number
    tokensOutput: number
    success: boolean
    error?: string
    qualityScore?: number
    qualityBreakdown?: QualityBreakdown
    userId?: string
    sessionId?: string
    testId?: string
    variantId?: string
    metadata?: Record<string, any>
  }): string {
    const requestId = this.generateRequestId()
    const duration = data.endTime.getTime() - data.startTime.getTime()
    const totalTokens = data.tokensInput + data.tokensOutput

    // Calculate cost
    const costData = CostCalculator.calculateCost(
      data.model,
      data.tokensInput,
      data.tokensOutput
    )

    // Calculate derived metrics
    const tokensPerSecond = duration > 0 ? (totalTokens / (duration / 1000)) : 0
    const costPerToken = totalTokens > 0 ? costData.total / totalTokens : 0
    const efficiency = data.qualityScore && costData.total > 0
      ? data.qualityScore / (costData.total * 1000) // Normalized efficiency score
      : 0

    const metrics: PerformanceMetrics = {
      requestId,
      operation: data.operation,
      model: data.model,
      provider: data.provider,
      userId: data.userId,
      startTime: data.startTime,
      endTime: data.endTime,
      duration,
      tokensInput: data.tokensInput,
      tokensOutput: data.tokensOutput,
      totalTokens,
      cost: costData.total,
      costBreakdown: {
        inputCost: costData.inputCost,
        outputCost: costData.outputCost
      },
      qualityScore: data.qualityScore,
      qualityBreakdown: data.qualityBreakdown,
      success: data.success,
      error: data.error,
      sessionId: data.sessionId,
      testId: data.testId,
      variantId: data.variantId,
      metadata: data.metadata,
      tokensPerSecond,
      costPerToken,
      efficiency
    }

    // Store metrics
    this.metrics.push(metrics)
    this.cleanupOldMetrics()

    // Check for alerts
    this.checkForAlerts(metrics)

    return requestId
  }

  /**
   * Get performance statistics for a time range and filters
   */
  public getStats(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
      testId?: string
    }
  ): PerformanceStats {
    const filteredMetrics = this.filterMetrics(startTime, endTime, filters)

    if (filteredMetrics.length === 0) {
      return this.getEmptyStats(startTime, endTime)
    }

    return this.calculateStats(filteredMetrics, startTime, endTime)
  }

  /**
   * Compare performance across models
   */
  public compareModels(
    startTime: Date,
    endTime: Date,
    operation?: string
  ): ModelComparison[] {
    const filters = operation ? { operation } : undefined
    const filteredMetrics = this.filterMetrics(startTime, endTime, filters)

    const modelGroups = this.groupByModel(filteredMetrics)
    const comparisons: ModelComparison[] = []

    // Calculate stats for each model
    modelGroups.forEach((metrics, model) => {
      const stats = this.calculateStats(metrics, startTime, endTime)
      const provider = model.split('/')[0]

      const comparison: ModelComparison = {
        model,
        provider,
        stats,
        rank: 0, // Will be assigned after scoring
        score: this.calculateModelScore(stats),
        strengths: this.identifyStrengths(stats),
        weaknesses: this.identifyWeaknesses(stats),
        recommendation: this.generateRecommendation(stats),
        confidence: this.calculateConfidence(metrics.length)
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

  /**
   * Get recent alerts
   */
  public getAlerts(
    severity?: PerformanceAlert['severity'],
    limit: number = 50
  ): PerformanceAlert[] {
    let filtered = [...this.alerts]

    if (severity) {
      filtered = filtered.filter(alert => alert.severity === severity)
    }

    return filtered
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, limit)
  }

  /**
   * Clear old metrics to free memory
   */
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory)
    }

    if (this.alerts.length > this.maxAlertsInMemory) {
      this.alerts = this.alerts.slice(-this.maxAlertsInMemory)
    }
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = []

    // High latency alert
    if (metrics.duration > 10000) { // 10 seconds
      alerts.push({
        id: this.generateAlertId(),
        type: 'latency',
        severity: metrics.duration > 30000 ? 'critical' : 'high',
        title: 'High Latency Detected',
        description: `Request took ${(metrics.duration / 1000).toFixed(1)} seconds`,
        threshold: 10000,
        actual: metrics.duration,
        impact: 'Poor user experience, potential timeout issues',
        recommendation: 'Consider using faster model or optimizing prompt',
        detectedAt: new Date(),
        metadata: { requestId: metrics.requestId, model: metrics.model }
      })
    }

    // High cost alert
    if (metrics.cost > 0.1) { // $0.10 per request
      alerts.push({
        id: this.generateAlertId(),
        type: 'cost',
        severity: metrics.cost > 1.0 ? 'critical' : 'medium',
        title: 'High Cost Per Request',
        description: `Request cost $${metrics.cost.toFixed(4)}`,
        threshold: 0.1,
        actual: metrics.cost,
        impact: 'Budget impact, unsustainable for high volume',
        recommendation: 'Consider more cost-effective model or reduce token usage',
        detectedAt: new Date(),
        metadata: { requestId: metrics.requestId, model: metrics.model }
      })
    }

    // Low quality alert
    if (metrics.qualityScore && metrics.qualityScore < 60) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'quality',
        severity: metrics.qualityScore < 40 ? 'high' : 'medium',
        title: 'Low Quality Response',
        description: `Quality score: ${metrics.qualityScore.toFixed(1)}`,
        threshold: 60,
        actual: metrics.qualityScore,
        impact: 'Poor user experience, reduced effectiveness',
        recommendation: 'Review prompts and model configuration',
        detectedAt: new Date(),
        metadata: { requestId: metrics.requestId, model: metrics.model }
      })
    }

    // Error alert
    if (!metrics.success) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'error_rate',
        severity: 'high',
        title: 'Request Failed',
        description: metrics.error || 'Unknown error occurred',
        threshold: 0,
        actual: 1,
        impact: 'Service degradation, user frustration',
        recommendation: 'Investigate error cause and implement retry logic',
        detectedAt: new Date(),
        metadata: { requestId: metrics.requestId, model: metrics.model, error: metrics.error }
      })
    }

    this.alerts.push(...alerts)
  }

  // Helper methods for calculations and data processing

  private filterMetrics(
    startTime: Date,
    endTime: Date,
    filters?: {
      operation?: string
      model?: string
      provider?: string
      userId?: string
      testId?: string
    }
  ): PerformanceMetrics[] {
    return this.metrics.filter(metric => {
      if (metric.startTime < startTime || metric.startTime > endTime) return false
      if (filters?.operation && metric.operation !== filters.operation) return false
      if (filters?.model && metric.model !== filters.model) return false
      if (filters?.provider && metric.provider !== filters.provider) return false
      if (filters?.userId && metric.userId !== filters.userId) return false
      if (filters?.testId && metric.testId !== filters.testId) return false
      return true
    })
  }

  private groupByModel(metrics: PerformanceMetrics[]): Map<string, PerformanceMetrics[]> {
    const groups = new Map<string, PerformanceMetrics[]>()

    metrics.forEach(metric => {
      if (!groups.has(metric.model)) {
        groups.set(metric.model, [])
      }
      groups.get(metric.model)!.push(metric)
    })

    return groups
  }

  private calculateStats(
    metrics: PerformanceMetrics[],
    startTime: Date,
    endTime: Date
  ): PerformanceStats {
    const successfulMetrics = metrics.filter(m => m.success)
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b)
    const costs = metrics.map(m => m.cost)
    const qualities = metrics.filter(m => m.qualityScore).map(m => m.qualityScore!)
    const efficiencies = metrics.filter(m => m.efficiency > 0).map(m => m.efficiency)

    return {
      timeRange: { start: startTime, end: endTime },
      totalRequests: metrics.length,
      successRate: (successfulMetrics.length / metrics.length) * 100,
      errorRate: ((metrics.length - successfulMetrics.length) / metrics.length) * 100,

      averageLatency: this.calculateMean(durations),
      medianLatency: this.calculateMedian(durations),
      p95Latency: this.calculatePercentile(durations, 95),
      p99Latency: this.calculatePercentile(durations, 99),
      latencyDistribution: this.createDistribution(durations, [1000, 3000, 5000, 10000]),

      totalCost: costs.reduce((sum, c) => sum + c, 0),
      averageCost: this.calculateMean(costs),
      costPerToken: this.calculateMean(metrics.map(m => m.costPerToken)),
      costDistribution: this.createDistribution(costs, [0.001, 0.01, 0.1, 1.0]),

      averageQuality: this.calculateMean(qualities),
      qualityDistribution: this.createDistribution(qualities, [40, 60, 80, 90]),

      averageEfficiency: this.calculateMean(efficiencies),
      tokensPerSecond: this.calculateMean(metrics.map(m => m.tokensPerSecond)),

      trend: this.calculateTrend(metrics)
    }
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.floor((percentile / 100) * sorted.length)
    return sorted[Math.min(index, sorted.length - 1)]
  }

  private createDistribution(values: number[], buckets: number[]): Record<string, number> {
    const distribution: Record<string, number> = {}

    buckets.forEach((bucket, i) => {
      const prevBucket = i === 0 ? 0 : buckets[i - 1]
      const key = `${prevBucket}-${bucket}`
      distribution[key] = values.filter(v => v >= prevBucket && v < bucket).length
    })

    // Add bucket for values above the highest threshold
    const highestBucket = buckets[buckets.length - 1]
    distribution[`${highestBucket}+`] = values.filter(v => v >= highestBucket).length

    return distribution
  }

  private calculateTrend(metrics: PerformanceMetrics[]): PerformanceStats['trend'] {
    if (metrics.length < 10) {
      return { direction: 'stable', velocity: 0, confidence: 0 }
    }

    const sorted = metrics.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))

    const firstQuality = this.calculateMean(
      firstHalf.filter(m => m.qualityScore).map(m => m.qualityScore!)
    )
    const secondQuality = this.calculateMean(
      secondHalf.filter(m => m.qualityScore).map(m => m.qualityScore!)
    )

    const change = secondQuality - firstQuality
    const velocity = change / (firstQuality || 1) // Percentage change

    let direction: 'improving' | 'stable' | 'degrading' = 'stable'
    if (Math.abs(velocity) > 0.1) { // 10% change threshold
      direction = velocity > 0 ? 'improving' : 'degrading'
    }

    return {
      direction,
      velocity: Math.abs(velocity),
      confidence: Math.min(metrics.length / 100, 1) // More data = higher confidence
    }
  }

  private calculateModelScore(stats: PerformanceStats): number {
    // Weighted score based on multiple factors
    const weights = {
      quality: 0.3,
      latency: 0.25,
      cost: 0.25,
      reliability: 0.2
    }

    const qualityScore = Math.min(stats.averageQuality / 100, 1)
    const latencyScore = Math.max(0, 1 - (stats.averageLatency / 10000)) // Normalize against 10s
    const costScore = Math.max(0, 1 - (stats.averageCost / 0.1)) // Normalize against $0.10
    const reliabilityScore = stats.successRate / 100

    return (
      qualityScore * weights.quality +
      latencyScore * weights.latency +
      costScore * weights.cost +
      reliabilityScore * weights.reliability
    ) * 100
  }

  private identifyStrengths(stats: PerformanceStats): string[] {
    const strengths: string[] = []

    if (stats.averageQuality > 85) strengths.push('High quality responses')
    if (stats.averageLatency < 2000) strengths.push('Fast response times')
    if (stats.averageCost < 0.01) strengths.push('Cost effective')
    if (stats.successRate > 98) strengths.push('High reliability')
    if (stats.averageEfficiency > 10) strengths.push('Excellent efficiency')

    return strengths.length > 0 ? strengths : ['Standard performance']
  }

  private identifyWeaknesses(stats: PerformanceStats): string[] {
    const weaknesses: string[] = []

    if (stats.averageQuality < 70) weaknesses.push('Quality needs improvement')
    if (stats.averageLatency > 8000) weaknesses.push('Slow response times')
    if (stats.averageCost > 0.05) weaknesses.push('High cost per request')
    if (stats.successRate < 95) weaknesses.push('Reliability issues')
    if (stats.errorRate > 5) weaknesses.push('High error rate')

    return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses']
  }

  private generateRecommendation(stats: PerformanceStats): string {
    if (stats.averageQuality > 85 && stats.averageLatency < 3000 && stats.averageCost < 0.02) {
      return 'Excellent overall performance - suitable for production use'
    }

    if (stats.averageCost > 0.05) {
      return 'Consider more cost-effective alternatives for high-volume usage'
    }

    if (stats.averageLatency > 8000) {
      return 'Optimize for faster response times in time-sensitive applications'
    }

    if (stats.averageQuality < 70) {
      return 'Review prompts and consider alternative models for better quality'
    }

    return 'Good performance with room for optimization'
  }

  private calculateConfidence(sampleSize: number): number {
    // Confidence based on sample size
    if (sampleSize < 10) return 0.3
    if (sampleSize < 50) return 0.6
    if (sampleSize < 100) return 0.8
    return 0.95
  }

  private getEmptyStats(startTime: Date, endTime: Date): PerformanceStats {
    return {
      timeRange: { start: startTime, end: endTime },
      totalRequests: 0,
      successRate: 0,
      errorRate: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      latencyDistribution: {},
      totalCost: 0,
      averageCost: 0,
      costPerToken: 0,
      costDistribution: {},
      averageQuality: 0,
      qualityDistribution: {},
      averageEfficiency: 0,
      tokensPerSecond: 0,
      trend: { direction: 'stable', velocity: 0, confidence: 0 }
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// ============================================================================
// INSTRUMENTATION HELPER
// ============================================================================

/**
 * Instrument AI operations with performance tracking
 */
export async function instrumentAIOperation<T>(
  operation: string,
  model: string,
  provider: string,
  aiFunction: () => Promise<T>,
  options?: {
    userId?: string
    sessionId?: string
    testId?: string
    variantId?: string
    metadata?: Record<string, any>
  }
): Promise<T & { requestId: string; metrics: PerformanceMetrics }> {
  const startTime = new Date()

  try {
    const result = await aiFunction()
    const endTime = new Date()

    // Extract token usage from result if available
    const tokensInput = (result as any)?.usage?.promptTokens || 0
    const tokensOutput = (result as any)?.usage?.completionTokens || 0

    const requestId = metricsCollector.recordMetrics({
      operation,
      model,
      provider,
      startTime,
      endTime,
      tokensInput,
      tokensOutput,
      success: true,
      userId: options?.userId,
      sessionId: options?.sessionId,
      testId: options?.testId,
      variantId: options?.variantId,
      metadata: options?.metadata
    })

    const metrics = metricsCollector.filterMetrics(startTime, endTime, {})[0]

    return { ...result, requestId, metrics }

  } catch (error) {
    const endTime = new Date()

    const requestId = metricsCollector.recordMetrics({
      operation,
      model,
      provider,
      startTime,
      endTime,
      tokensInput: 0,
      tokensOutput: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: options?.userId,
      sessionId: options?.sessionId,
      testId: options?.testId,
      variantId: options?.variantId,
      metadata: options?.metadata
    })

    // Re-throw with enhanced error information
    const enhancedError = new Error(error instanceof Error ? error.message : 'AI operation failed')
    ;(enhancedError as any).requestId = requestId
    throw enhancedError
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

export const metricsCollector = new MetricsCollector()

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  CostCalculator,
  MetricsCollector,
  metricsCollector,
  instrumentAIOperation
}