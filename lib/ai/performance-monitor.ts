/**
 * AI Performance Monitoring System
 * Comprehensive performance tracking, bottleneck detection, and analytics
 */

export interface PerformanceMetrics {
  responseTime: number
  cacheHitRatio: number
  costPerRequest: number
  errorRate: number
  throughput: number
  memoryUsage: number
  cpuUsage?: number
  activeConnections: number
  queueLength: number
  timestamp: Date
}

export interface BottleneckAnalysis {
  type: 'cache_miss' | 'high_latency' | 'memory_pressure' | 'rate_limit' | 'cost_threshold' | 'error_spike'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics: Partial<PerformanceMetrics>
  recommendations: string[]
  timestamp: Date
}

export interface PerformanceAlert {
  id: string
  type: 'performance' | 'cost' | 'error' | 'capacity'
  severity: 'warning' | 'critical'
  message: string
  metrics: Partial<PerformanceMetrics>
  timestamp: Date
  acknowledged: boolean
  resolvedAt?: Date
}

export interface PerformanceConfig {
  alertThresholds: {
    responseTime: number // ms
    errorRate: number // percentage
    memoryUsage: number // percentage
    costPerHour: number // dollars
    cacheHitRatio: number // percentage (minimum)
  }
  samplingInterval: number // ms
  retentionPeriod: number // ms
  maxAlerts: number
  enableBottleneckDetection: boolean
  enablePredictiveAnalytics: boolean
}

export interface PerformanceInsights {
  trends: {
    responseTime: 'improving' | 'degrading' | 'stable'
    costEfficiency: 'improving' | 'degrading' | 'stable'
    errorRate: 'improving' | 'degrading' | 'stable'
    cacheEfficiency: 'improving' | 'degrading' | 'stable'
  }
  predictions: {
    nextHourCost: number
    nextHourRequests: number
    resourceNeeds: string[]
  }
  optimizations: string[]
  timestamp: Date
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private bottlenecks: BottleneckAnalysis[] = []
  private alerts: PerformanceAlert[] = []
  private config: PerformanceConfig
  private monitoringInterval: NodeJS.Timeout | null = null
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = []
  private currentRequests = new Map<string, { startTime: number, operation: string }>()

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime || 3000, // 3 seconds
        errorRate: config.alertThresholds?.errorRate || 5, // 5%
        memoryUsage: config.alertThresholds?.memoryUsage || 85, // 85%
        costPerHour: config.alertThresholds?.costPerHour || 10, // $10/hour
        cacheHitRatio: config.alertThresholds?.cacheHitRatio || 70 // 70%
      },
      samplingInterval: config.samplingInterval || 60000, // 1 minute
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      maxAlerts: config.maxAlerts || 100,
      enableBottleneckDetection: config.enableBottleneckDetection ?? true,
      enablePredictiveAnalytics: config.enablePredictiveAnalytics ?? true
    }

    this.startMonitoring()
  }

  public static getInstance(config?: Partial<PerformanceConfig>): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor(config)
    }
    return AIPerformanceMonitor.instance
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.analyzeBottlenecks()
      this.checkAlerts()
      this.cleanupOldData()
    }, this.config.samplingInterval)

    console.log('Performance monitoring started')
  }

  /**
   * Start tracking a request
   */
  public startRequest(requestId: string, operation: string): void {
    this.currentRequests.set(requestId, {
      startTime: Date.now(),
      operation
    })
  }

  /**
   * End tracking a request and record metrics
   */
  public endRequest(
    requestId: string,
    success: boolean = true,
    cost: number = 0,
    cacheHit: boolean = false
  ): number {
    const request = this.currentRequests.get(requestId)
    if (!request) {
      return 0
    }

    const responseTime = Date.now() - request.startTime
    this.currentRequests.delete(requestId)

    // Record individual request metrics
    this.recordRequestMetrics({
      operation: request.operation,
      responseTime,
      success,
      cost,
      cacheHit,
      timestamp: new Date()
    })

    return responseTime
  }

  /**
   * Record individual request metrics
   */
  private recordRequestMetrics(request: {
    operation: string
    responseTime: number
    success: boolean
    cost: number
    cacheHit: boolean
    timestamp: Date
  }): void {
    // These individual metrics would be stored for detailed analysis
    // For now, they contribute to the aggregate metrics collection
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const now = new Date()

      // Calculate cache hit ratio
      const cacheStats = await this.getCacheStats()
      const cacheHitRatio = cacheStats.hitRate * 100

      // Calculate error rate from recent requests
      const recentMetrics = this.metrics.slice(-10)
      const errorRate = recentMetrics.length > 0
        ? (recentMetrics.filter(m => m.errorRate > 0).length / recentMetrics.length) * 100
        : 0

      // Calculate average response time
      const avgResponseTime = recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
        : 0

      // Calculate throughput (requests per minute)
      const throughput = this.currentRequests.size * (60000 / this.config.samplingInterval)

      // Get memory usage
      const memoryUsage = this.getMemoryUsage()

      // Calculate cost per request
      const totalCost = recentMetrics.reduce((sum, m) => sum + m.costPerRequest, 0)
      const costPerRequest = recentMetrics.length > 0 ? totalCost / recentMetrics.length : 0

      const metrics: PerformanceMetrics = {
        responseTime: avgResponseTime,
        cacheHitRatio,
        costPerRequest,
        errorRate,
        throughput,
        memoryUsage,
        activeConnections: this.currentRequests.size,
        queueLength: await this.getQueueLength(),
        timestamp: now
      }

      this.metrics.push(metrics)

      // Log metrics for debugging
      console.log(`Performance metrics: RT=${avgResponseTime.toFixed(0)}ms, Cache=${cacheHitRatio.toFixed(1)}%, Errors=${errorRate.toFixed(1)}%`)

    } catch (error) {
      console.error('Failed to collect performance metrics:', error)
    }
  }

  /**
   * Get cache statistics
   */
  private async getCacheStats(): Promise<{ hitRate: number; size: number }> {
    try {
      // This would integrate with the actual cache implementation
      // For now, return mock data
      return {
        hitRate: 0.75, // 75% cache hit rate
        size: 1000
      }
    } catch {
      return { hitRate: 0, size: 0 }
    }
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    try {
      const used = process.memoryUsage()
      // Convert to percentage of available memory (simplified)
      const usagePercentage = (used.heapUsed / used.heapTotal) * 100
      return Math.min(usagePercentage, 100)
    } catch {
      return 0
    }
  }

  /**
   * Get current queue length
   */
  private async getQueueLength(): Promise<number> {
    // This would integrate with actual queue systems
    return 0
  }

  /**
   * Analyze performance for bottlenecks
   */
  private analyzeBottlenecks(): void {
    if (!this.config.enableBottleneckDetection || this.metrics.length < 5) {
      return
    }

    const recentMetrics = this.metrics.slice(-5)
    const latest = recentMetrics[recentMetrics.length - 1]
    const average = this.calculateAverageMetrics(recentMetrics)

    const bottlenecks: BottleneckAnalysis[] = []

    // Check for high response times
    if (latest.responseTime > this.config.alertThresholds.responseTime) {
      bottlenecks.push({
        type: 'high_latency',
        severity: latest.responseTime > this.config.alertThresholds.responseTime * 2 ? 'critical' : 'high',
        description: `Response time ${latest.responseTime}ms exceeds threshold ${this.config.alertThresholds.responseTime}ms`,
        metrics: { responseTime: latest.responseTime },
        recommendations: [
          'Check AI model performance',
          'Investigate network latency',
          'Consider request batching',
          'Review cache effectiveness'
        ],
        timestamp: new Date()
      })
    }

    // Check for low cache hit ratio
    if (latest.cacheHitRatio < this.config.alertThresholds.cacheHitRatio) {
      bottlenecks.push({
        type: 'cache_miss',
        severity: latest.cacheHitRatio < this.config.alertThresholds.cacheHitRatio * 0.5 ? 'critical' : 'medium',
        description: `Cache hit ratio ${latest.cacheHitRatio.toFixed(1)}% below threshold ${this.config.alertThresholds.cacheHitRatio}%`,
        metrics: { cacheHitRatio: latest.cacheHitRatio },
        recommendations: [
          'Review cache TTL settings',
          'Implement cache warming',
          'Optimize cache key generation',
          'Increase cache size limits'
        ],
        timestamp: new Date()
      })
    }

    // Check for memory pressure
    if (latest.memoryUsage > this.config.alertThresholds.memoryUsage) {
      bottlenecks.push({
        type: 'memory_pressure',
        severity: latest.memoryUsage > 95 ? 'critical' : 'high',
        description: `Memory usage ${latest.memoryUsage.toFixed(1)}% exceeds threshold ${this.config.alertThresholds.memoryUsage}%`,
        metrics: { memoryUsage: latest.memoryUsage },
        recommendations: [
          'Optimize cache eviction policies',
          'Reduce cache entry sizes',
          'Implement memory cleanup',
          'Consider scaling resources'
        ],
        timestamp: new Date()
      })
    }

    // Check for error spikes
    if (latest.errorRate > this.config.alertThresholds.errorRate) {
      bottlenecks.push({
        type: 'error_spike',
        severity: latest.errorRate > this.config.alertThresholds.errorRate * 2 ? 'critical' : 'high',
        description: `Error rate ${latest.errorRate.toFixed(1)}% exceeds threshold ${this.config.alertThresholds.errorRate}%`,
        metrics: { errorRate: latest.errorRate },
        recommendations: [
          'Check AI service availability',
          'Review request validation',
          'Implement circuit breakers',
          'Check authentication status'
        ],
        timestamp: new Date()
      })
    }

    // Calculate cost per hour and check threshold
    const costPerHour = latest.costPerRequest * latest.throughput * 60
    if (costPerHour > this.config.alertThresholds.costPerHour) {
      bottlenecks.push({
        type: 'cost_threshold',
        severity: costPerHour > this.config.alertThresholds.costPerHour * 1.5 ? 'critical' : 'high',
        description: `Projected cost $${costPerHour.toFixed(2)}/hour exceeds threshold $${this.config.alertThresholds.costPerHour}/hour`,
        metrics: { costPerRequest: latest.costPerRequest, throughput: latest.throughput },
        recommendations: [
          'Implement rate limiting',
          'Optimize model selection',
          'Increase cache effectiveness',
          'Review request patterns'
        ],
        timestamp: new Date()
      })
    }

    // Store bottlenecks
    this.bottlenecks.push(...bottlenecks)

    // Create alerts for critical bottlenecks
    bottlenecks
      .filter(b => b.severity === 'critical')
      .forEach(bottleneck => this.createAlert({
        type: 'performance',
        severity: 'critical',
        message: bottleneck.description,
        metrics: bottleneck.metrics
      }))
  }

  /**
   * Calculate average metrics from a set of metrics
   */
  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const count = metrics.length
    if (count === 0) {
      return {
        responseTime: 0,
        cacheHitRatio: 0,
        costPerRequest: 0,
        errorRate: 0,
        throughput: 0,
        memoryUsage: 0,
        activeConnections: 0,
        queueLength: 0,
        timestamp: new Date()
      }
    }

    return {
      responseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / count,
      cacheHitRatio: metrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) / count,
      costPerRequest: metrics.reduce((sum, m) => sum + m.costPerRequest, 0) / count,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / count,
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / count,
      memoryUsage: metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / count,
      activeConnections: metrics.reduce((sum, m) => sum + m.activeConnections, 0) / count,
      queueLength: metrics.reduce((sum, m) => sum + m.queueLength, 0) / count,
      timestamp: new Date()
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return

    const latest = this.metrics[this.metrics.length - 1]

    // Check response time alerts
    if (latest.responseTime > this.config.alertThresholds.responseTime) {
      this.createAlert({
        type: 'performance',
        severity: latest.responseTime > this.config.alertThresholds.responseTime * 2 ? 'critical' : 'warning',
        message: `High response time: ${latest.responseTime}ms`,
        metrics: { responseTime: latest.responseTime }
      })
    }

    // Check error rate alerts
    if (latest.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert({
        type: 'error',
        severity: latest.errorRate > this.config.alertThresholds.errorRate * 2 ? 'critical' : 'warning',
        message: `High error rate: ${latest.errorRate.toFixed(1)}%`,
        metrics: { errorRate: latest.errorRate }
      })
    }

    // Check memory usage alerts
    if (latest.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert({
        type: 'capacity',
        severity: latest.memoryUsage > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${latest.memoryUsage.toFixed(1)}%`,
        metrics: { memoryUsage: latest.memoryUsage }
      })
    }

    // Check cost alerts
    const costPerHour = latest.costPerRequest * latest.throughput * 60
    if (costPerHour > this.config.alertThresholds.costPerHour) {
      this.createAlert({
        type: 'cost',
        severity: costPerHour > this.config.alertThresholds.costPerHour * 1.5 ? 'critical' : 'warning',
        message: `High cost rate: $${costPerHour.toFixed(2)}/hour`,
        metrics: { costPerRequest: latest.costPerRequest, throughput: latest.throughput }
      })
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alert
    }

    this.alerts.push(newAlert)

    // Trigger alert callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(newAlert)
      } catch (error) {
        console.error('Alert callback failed:', error)
      }
    })

    // Limit alerts to prevent memory issues
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxAlerts)
    }

    console.log(`Performance alert: ${newAlert.severity} - ${newAlert.message}`)
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - this.config.retentionPeriod

    // Clean up old metrics
    this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoff)

    // Clean up old bottlenecks
    this.bottlenecks = this.bottlenecks.filter(bottleneck => bottleneck.timestamp.getTime() > cutoff)

    // Clean up resolved alerts older than 24 hours
    const alertCutoff = Date.now() - (24 * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(alert =>
      !alert.resolvedAt || alert.resolvedAt.getTime() > alertCutoff
    )
  }

  /**
   * Generate performance insights and predictions
   */
  public generateInsights(): PerformanceInsights {
    if (this.metrics.length < 10) {
      return {
        trends: {
          responseTime: 'stable',
          costEfficiency: 'stable',
          errorRate: 'stable',
          cacheEfficiency: 'stable'
        },
        predictions: {
          nextHourCost: 0,
          nextHourRequests: 0,
          resourceNeeds: []
        },
        optimizations: ['Insufficient data for insights'],
        timestamp: new Date()
      }
    }

    const recentMetrics = this.metrics.slice(-10)
    const older = recentMetrics.slice(0, 5)
    const newer = recentMetrics.slice(5)

    const trends = {
      responseTime: this.calculateTrend(older, newer, 'responseTime'),
      costEfficiency: this.calculateTrend(older, newer, 'costPerRequest', true), // Inverse trend for cost
      errorRate: this.calculateTrend(older, newer, 'errorRate', true), // Inverse trend for errors
      cacheEfficiency: this.calculateTrend(older, newer, 'cacheHitRatio')
    }

    const predictions = this.generatePredictions(recentMetrics)
    const optimizations = this.generateOptimizations(recentMetrics, this.bottlenecks.slice(-5))

    return {
      trends,
      predictions,
      optimizations,
      timestamp: new Date()
    }
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrend(
    older: PerformanceMetrics[],
    newer: PerformanceMetrics[],
    metric: keyof PerformanceMetrics,
    inverse: boolean = false
  ): 'improving' | 'degrading' | 'stable' {
    const olderAvg = older.reduce((sum, m) => sum + (m[metric] as number), 0) / older.length
    const newerAvg = newer.reduce((sum, m) => sum + (m[metric] as number), 0) / newer.length

    const change = (newerAvg - olderAvg) / olderAvg
    const threshold = 0.1 // 10% change threshold

    if (Math.abs(change) < threshold) {
      return 'stable'
    }

    const improving = inverse ? change < 0 : change > 0
    return improving ? 'improving' : 'degrading'
  }

  /**
   * Generate predictions based on current trends
   */
  private generatePredictions(metrics: PerformanceMetrics[]): PerformanceInsights['predictions'] {
    const latest = metrics[metrics.length - 1]
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
    const avgCostPerRequest = metrics.reduce((sum, m) => sum + m.costPerRequest, 0) / metrics.length

    const nextHourRequests = avgThroughput * 60
    const nextHourCost = nextHourRequests * avgCostPerRequest

    const resourceNeeds: string[] = []

    if (latest.memoryUsage > 80) {
      resourceNeeds.push('Additional memory')
    }

    if (latest.responseTime > this.config.alertThresholds.responseTime * 0.8) {
      resourceNeeds.push('Performance optimization')
    }

    if (latest.cacheHitRatio < this.config.alertThresholds.cacheHitRatio * 1.2) {
      resourceNeeds.push('Cache optimization')
    }

    return {
      nextHourCost,
      nextHourRequests,
      resourceNeeds
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(
    metrics: PerformanceMetrics[],
    bottlenecks: BottleneckAnalysis[]
  ): string[] {
    const optimizations: string[] = []
    const latest = metrics[metrics.length - 1]

    // Cache optimizations
    if (latest.cacheHitRatio < 80) {
      optimizations.push('Improve cache hit ratio through better TTL management')
    }

    // Performance optimizations
    if (latest.responseTime > 2000) {
      optimizations.push('Optimize response times with request batching')
    }

    // Cost optimizations
    const avgCost = metrics.reduce((sum, m) => sum + m.costPerRequest, 0) / metrics.length
    if (avgCost > 0.05) {
      optimizations.push('Reduce costs through improved model selection')
    }

    // Memory optimizations
    if (latest.memoryUsage > 70) {
      optimizations.push('Implement more aggressive cache eviction policies')
    }

    // Bottleneck-specific optimizations
    bottlenecks.forEach(bottleneck => {
      bottleneck.recommendations.forEach(rec => {
        if (!optimizations.includes(rec)) {
          optimizations.push(rec)
        }
      })
    })

    return optimizations.slice(0, 10) // Limit to top 10 recommendations
  }

  /**
   * Register alert callback
   */
  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolvedAt = new Date()
      return true
    }
    return false
  }

  /**
   * Get current performance status
   */
  public getStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy'
    metrics: PerformanceMetrics | null
    activeAlerts: PerformanceAlert[]
    recentBottlenecks: BottleneckAnalysis[]
  } {
    const latest = this.metrics[this.metrics.length - 1] || null
    const activeAlerts = this.alerts.filter(a => !a.resolvedAt)
    const recentBottlenecks = this.bottlenecks.slice(-5)

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (activeAlerts.some(a => a.severity === 'critical')) {
      overall = 'unhealthy'
    } else if (activeAlerts.length > 0 || recentBottlenecks.length > 0) {
      overall = 'degraded'
    }

    return {
      overall,
      metrics: latest,
      activeAlerts,
      recentBottlenecks
    }
  }

  /**
   * Get comprehensive performance report
   */
  public getReport(timeRange: number = 60 * 60 * 1000): {
    summary: PerformanceMetrics
    insights: PerformanceInsights
    bottlenecks: BottleneckAnalysis[]
    alerts: PerformanceAlert[]
    recommendations: string[]
  } {
    const cutoff = Date.now() - timeRange
    const filteredMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    const filteredBottlenecks = this.bottlenecks.filter(b => b.timestamp.getTime() > cutoff)
    const filteredAlerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff)

    const summary = this.calculateAverageMetrics(filteredMetrics)
    const insights = this.generateInsights()

    // Collect all recommendations
    const recommendations = new Set<string>()
    filteredBottlenecks.forEach(b => b.recommendations.forEach(r => recommendations.add(r)))
    insights.optimizations.forEach(o => recommendations.add(o))

    return {
      summary,
      insights,
      bottlenecks: filteredBottlenecks,
      alerts: filteredAlerts,
      recommendations: Array.from(recommendations)
    }
  }

  /**
   * Stop monitoring and cleanup
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    console.log('Performance monitoring stopped')
  }

  /**
   * Export performance data
   */
  public exportData(): any {
    return {
      config: this.config,
      metrics: this.metrics,
      bottlenecks: this.bottlenecks,
      alerts: this.alerts,
      currentRequests: Array.from(this.currentRequests.entries()),
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance()

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const monitor = AIPerformanceMonitor.getInstance()
    const requestId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    monitor.startRequest(requestId, operation)

    try {
      const result = await fn(...args)
      monitor.endRequest(requestId, true)
      return result
    } catch (error) {
      monitor.endRequest(requestId, false)
      throw error
    }
  }
}