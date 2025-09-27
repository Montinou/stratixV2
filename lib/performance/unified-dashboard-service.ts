/**
 * Unified Performance Dashboard Service
 *
 * Provides a comprehensive dashboard API that aggregates data from all
 * performance monitoring services into a single, cohesive interface.
 *
 * Integrates:
 * - unified-performance-service.ts (metrics and cost data)
 * - unified-benchmarking-service.ts (benchmark results)
 * - unified-quality-service.ts (quality assessments)
 * - connection-metrics.ts (database performance)
 */

import { metricsCollector } from './unified-performance-service'
import { benchmarkingService } from './unified-benchmarking-service'
import { qualityService } from './unified-quality-service'
import { poolMetricsCollector } from './connection-metrics'
import type {
  PerformanceStats,
  ModelComparison,
  PerformanceAlert
} from './unified-performance-service'
import type {
  BenchmarkSummary,
  ModelRanking,
  BenchmarkInsight
} from './unified-benchmarking-service'
import type {
  QualityTrend,
  ModelQualityComparison,
  QualityAlert
} from './unified-quality-service'
import type {
  PerformanceAlert as ConnectionAlert,
  PoolMetrics
} from './connection-metrics'

// ============================================================================
// DASHBOARD INTERFACES
// ============================================================================

export interface DashboardData {
  overview: DashboardOverview
  performance: PerformanceInsights
  quality: QualityInsights
  cost: CostInsights
  benchmarks: BenchmarkInsights
  infrastructure: InfrastructureInsights
  alerts: AlertsSummary
  recommendations: DashboardRecommendation[]
  lastUpdated: Date
}

export interface DashboardOverview {
  timeRange: {
    start: Date
    end: Date
  }
  totalRequests: number
  successRate: number
  averageLatency: number
  totalCost: number
  averageQuality: number
  topModel: string
  trend: {
    requests: number
    latency: number
    cost: number
    quality: number
  }
}

export interface PerformanceInsights {
  stats: PerformanceStats
  modelComparisons: ModelComparison[]
  latencyTrends: TimeSeries[]
  throughputTrends: TimeSeries[]
  bottlenecks: PerformanceBottleneck[]
}

export interface QualityInsights {
  overallScore: number
  scoreDistribution: Record<string, number>
  modelComparisons: ModelQualityComparison[]
  trends: QualityTrend[]
  topIssues: QualityIssueAnalysis[]
}

export interface CostInsights {
  totalCost: number
  costPerRequest: number
  costByModel: CostBreakdown[]
  costTrends: TimeSeries[]
  costOptimization: CostOptimization[]
  projectedMonthlyCost: number
}

export interface BenchmarkInsights {
  recentExecutions: BenchmarkExecutionSummary[]
  modelRankings: ModelRanking[]
  performanceMatrix: BenchmarkMatrix
  insights: BenchmarkInsight[]
}

export interface InfrastructureInsights {
  database: DatabaseMetrics
  connectionPool: PoolMetrics
  systemHealth: SystemHealthStatus
  resourceUtilization: ResourceMetrics
}

export interface AlertsSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  recent: DashboardAlert[]
  trends: AlertTrend[]
}

export interface DashboardRecommendation {
  id: string
  type: 'cost' | 'performance' | 'quality' | 'infrastructure' | 'security'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  expectedImprovement: string
  actionItems: string[]
  metadata?: Record<string, any>
}

export interface TimeSeries {
  timestamp: Date
  value: number
  label?: string
}

export interface PerformanceBottleneck {
  type: 'latency' | 'throughput' | 'error_rate' | 'cost'
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  affectedOperations: string[]
  affectedModels: string[]
  recommendation: string
}

export interface QualityIssueAnalysis {
  type: string
  frequency: number
  impact: number
  affectedModels: string[]
  trend: 'increasing' | 'stable' | 'decreasing'
  recommendation: string
}

export interface CostBreakdown {
  model: string
  provider: string
  totalCost: number
  percentage: number
  costPerRequest: number
  requestCount: number
  trend: number
}

export interface CostOptimization {
  type: 'model_switch' | 'usage_optimization' | 'batch_processing'
  description: string
  potentialSavings: number
  implementationEffort: 'low' | 'medium' | 'high'
  riskLevel: 'low' | 'medium' | 'high'
}

export interface BenchmarkExecutionSummary {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  topModel: string
  averageScore: number
  testsRun: number
}

export interface BenchmarkMatrix {
  models: string[]
  testCases: string[]
  scores: Record<string, Record<string, number>>
  rankings: Record<string, number>
}

export interface DatabaseMetrics {
  connectionCount: number
  queryLatency: number
  queryThroughput: number
  errorRate: number
  poolUtilization: number
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'critical'
  components: {
    api: 'healthy' | 'warning' | 'critical'
    database: 'healthy' | 'warning' | 'critical'
    aiGateway: 'healthy' | 'warning' | 'critical'
    monitoring: 'healthy' | 'warning' | 'critical'
  }
  uptime: number
  lastHealthCheck: Date
}

export interface ResourceMetrics {
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
  networkLatency: number
}

export interface DashboardAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  source: 'performance' | 'quality' | 'infrastructure' | 'cost'
  detectedAt: Date
  resolvedAt?: Date
}

export interface AlertTrend {
  period: string
  count: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// ============================================================================
// UNIFIED DASHBOARD SERVICE
// ============================================================================

export class UnifiedDashboardService {
  /**
   * Get comprehensive dashboard data for a time range
   */
  public async getDashboardData(
    startTime: Date,
    endTime: Date,
    filters?: {
      userId?: string
      operation?: string
      model?: string
    }
  ): Promise<DashboardData> {
    // Collect data from all services in parallel
    const [
      performanceStats,
      qualityStats,
      recentBenchmarks,
      connectionMetrics,
      performanceAlerts,
      qualityAlerts
    ] = await Promise.all([
      this.getPerformanceData(startTime, endTime, filters),
      this.getQualityData(startTime, endTime, filters),
      this.getBenchmarkData(),
      this.getInfrastructureData(),
      this.getPerformanceAlerts(),
      this.getQualityAlerts()
    ])

    const overview = this.buildOverview(performanceStats, qualityStats, startTime, endTime)
    const costInsights = this.buildCostInsights(performanceStats, startTime, endTime)
    const recommendations = this.generateRecommendations(
      performanceStats,
      qualityStats,
      recentBenchmarks,
      connectionMetrics,
      [...performanceAlerts, ...qualityAlerts]
    )

    return {
      overview,
      performance: performanceStats,
      quality: qualityStats,
      cost: costInsights,
      benchmarks: recentBenchmarks,
      infrastructure: connectionMetrics,
      alerts: this.consolidateAlerts([...performanceAlerts, ...qualityAlerts]),
      recommendations,
      lastUpdated: new Date()
    }
  }

  /**
   * Get real-time system health status
   */
  public async getSystemHealth(): Promise<SystemHealthStatus> {
    const [
      performanceHealth,
      qualityHealth,
      infrastructureHealth
    ] = await Promise.all([
      this.checkPerformanceHealth(),
      this.checkQualityHealth(),
      this.checkInfrastructureHealth()
    ])

    const overallHealth = this.determineOverallHealth([
      performanceHealth,
      qualityHealth,
      infrastructureHealth
    ])

    return {
      overall: overallHealth,
      components: {
        api: performanceHealth,
        database: infrastructureHealth,
        aiGateway: this.checkAIGatewayHealth(),
        monitoring: 'healthy' // Assume monitoring is healthy if we can get data
      },
      uptime: this.calculateUptime(),
      lastHealthCheck: new Date()
    }
  }

  /**
   * Get cost analysis and optimization recommendations
   */
  public async getCostAnalysis(
    startTime: Date,
    endTime: Date,
    projectionDays: number = 30
  ): Promise<CostInsights> {
    const performanceStats = await this.getPerformanceData(startTime, endTime)
    return this.buildCostInsights(performanceStats, startTime, endTime, projectionDays)
  }

  /**
   * Get quality analysis and improvement recommendations
   */
  public async getQualityAnalysis(
    startTime: Date,
    endTime: Date
  ): Promise<QualityInsights> {
    return this.getQualityData(startTime, endTime)
  }

  /**
   * Get performance bottleneck analysis
   */
  public async getBottleneckAnalysis(
    startTime: Date,
    endTime: Date
  ): Promise<PerformanceBottleneck[]> {
    const performanceStats = await this.getPerformanceData(startTime, endTime)
    return performanceStats.bottlenecks
  }

  /**
   * Get trending metrics for dashboard charts
   */
  public async getTrendingMetrics(
    startTime: Date,
    endTime: Date,
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    latency: TimeSeries[]
    cost: TimeSeries[]
    quality: TimeSeries[]
    throughput: TimeSeries[]
  }> {
    // Generate time series data based on stored metrics
    const timePoints = this.generateTimePoints(startTime, endTime, granularity)

    return {
      latency: await this.buildLatencyTimeSeries(timePoints),
      cost: await this.buildCostTimeSeries(timePoints),
      quality: await this.buildQualityTimeSeries(timePoints),
      throughput: await this.buildThroughputTimeSeries(timePoints)
    }
  }

  // ========================================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ========================================================================

  private async getPerformanceData(
    startTime: Date,
    endTime: Date,
    filters?: { userId?: string; operation?: string; model?: string }
  ): Promise<PerformanceInsights> {
    const stats = metricsCollector.getStats(startTime, endTime, filters)
    const modelComparisons = metricsCollector.compareModels(startTime, endTime, filters?.operation)

    return {
      stats,
      modelComparisons,
      latencyTrends: await this.buildLatencyTrends(startTime, endTime),
      throughputTrends: await this.buildThroughputTrends(startTime, endTime),
      bottlenecks: this.identifyBottlenecks(stats, modelComparisons)
    }
  }

  private async getQualityData(
    startTime: Date,
    endTime: Date,
    filters?: { userId?: string; operation?: string; model?: string }
  ): Promise<QualityInsights> {
    const qualityStats = qualityService.getQualityStats(startTime, endTime, filters)
    const modelComparisons = qualityService.compareModels(startTime, endTime, filters?.operation)
    const trends = qualityService.getQualityTrends(startTime, endTime)

    return {
      overallScore: qualityStats.averageScore,
      scoreDistribution: qualityStats.scoreDistribution,
      modelComparisons,
      trends,
      topIssues: this.analyzeQualityIssues(qualityStats.topIssues)
    }
  }

  private async getBenchmarkData(): Promise<BenchmarkInsights> {
    const executions = benchmarkingService.getResults()
    const recentExecutions = executions.slice(0, 5) // Get 5 most recent

    // Get default benchmark suite rankings
    const rankings = benchmarkingService.compareModels('okr_comprehensive_v1')
    const insights = benchmarkingService.generateInsights('okr_comprehensive_v1')

    return {
      recentExecutions: recentExecutions.map(exec => ({
        id: exec.benchmarkId,
        name: 'OKR Benchmark',
        status: 'completed',
        startedAt: exec.timestamp,
        completedAt: exec.timestamp,
        topModel: exec.model,
        averageScore: exec.metrics.qualityScore || 0,
        testsRun: 1
      })),
      modelRankings: rankings,
      performanceMatrix: this.buildBenchmarkMatrix(executions),
      insights
    }
  }

  private async getInfrastructureData(): Promise<InfrastructureInsights> {
    const poolMetrics = poolMetricsCollector.getPerformanceSummary()

    return {
      database: {
        connectionCount: poolMetrics.currentMetrics?.totalConnections || 0,
        queryLatency: 0, // Would need to implement query latency tracking
        queryThroughput: 0, // Would need to implement throughput tracking
        errorRate: 0, // Would need to implement error rate tracking
        poolUtilization: poolMetrics.currentMetrics?.utilizationRate || 0
      },
      connectionPool: poolMetrics.currentMetrics || {
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        utilizationRate: 0,
        timestamp: new Date()
      },
      systemHealth: await this.getSystemHealth(),
      resourceUtilization: {
        memoryUsage: 0, // Would need to implement system metrics
        cpuUsage: 0,
        diskUsage: 0,
        networkLatency: 0
      }
    }
  }

  private async getPerformanceAlerts(): Promise<PerformanceAlert[]> {
    return metricsCollector.getAlerts()
  }

  private async getQualityAlerts(): Promise<QualityAlert[]> {
    return qualityService.getAlerts()
  }

  private buildOverview(
    performanceStats: PerformanceInsights,
    qualityStats: QualityInsights,
    startTime: Date,
    endTime: Date
  ): DashboardOverview {
    const stats = performanceStats.stats

    return {
      timeRange: { start: startTime, end: endTime },
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
      averageLatency: stats.averageLatency,
      totalCost: stats.totalCost,
      averageQuality: qualityStats.overallScore,
      topModel: performanceStats.modelComparisons[0]?.model || 'N/A',
      trend: {
        requests: this.calculateTrend('requests', stats),
        latency: this.calculateTrend('latency', stats),
        cost: this.calculateTrend('cost', stats),
        quality: this.calculateTrend('quality', qualityStats)
      }
    }
  }

  private buildCostInsights(
    performanceStats: PerformanceInsights,
    startTime: Date,
    endTime: Date,
    projectionDays: number = 30
  ): CostInsights {
    const stats = performanceStats.stats
    const modelComparisons = performanceStats.modelComparisons

    const costByModel = modelComparisons.map(comparison => ({
      model: comparison.model,
      provider: comparison.provider,
      totalCost: comparison.stats.totalCost,
      percentage: (comparison.stats.totalCost / stats.totalCost) * 100,
      costPerRequest: comparison.stats.averageCost,
      requestCount: comparison.stats.totalRequests,
      trend: comparison.stats.trend.velocity
    }))

    const dailyCost = stats.totalCost / this.getDaysBetween(startTime, endTime)
    const projectedMonthlyCost = dailyCost * projectionDays

    return {
      totalCost: stats.totalCost,
      costPerRequest: stats.averageCost,
      costByModel,
      costTrends: [], // Would be populated with actual time series data
      costOptimization: this.generateCostOptimizations(modelComparisons),
      projectedMonthlyCost
    }
  }

  private consolidateAlerts(
    alerts: (PerformanceAlert | QualityAlert | ConnectionAlert)[]
  ): AlertsSummary {
    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const recentAlerts = alerts
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .slice(0, 10)
      .map(alert => ({
        id: alert.id || 'unknown',
        type: alert.type,
        severity: alert.severity,
        title: alert.title || alert.message || 'Alert',
        description: alert.description || 'No description available',
        source: this.determineAlertSource(alert),
        detectedAt: alert.detectedAt,
        resolvedAt: 'resolvedAt' in alert ? alert.resolvedAt : undefined
      }))

    return {
      total: alerts.length,
      critical: alertsByType.critical || 0,
      high: alertsByType.high || 0,
      medium: alertsByType.medium || 0,
      low: alertsByType.low || 0,
      recent: recentAlerts,
      trends: [] // Would be populated with historical alert trends
    }
  }

  private generateRecommendations(
    performanceStats: PerformanceInsights,
    qualityStats: QualityInsights,
    benchmarkStats: BenchmarkInsights,
    infrastructureStats: InfrastructureInsights,
    alerts: any[]
  ): DashboardRecommendation[] {
    const recommendations: DashboardRecommendation[] = []

    // Performance recommendations
    if (performanceStats.stats.averageLatency > 5000) {
      recommendations.push({
        id: 'reduce_latency',
        type: 'performance',
        priority: 'high',
        title: 'Reduce Average Latency',
        description: `Average latency of ${performanceStats.stats.averageLatency.toFixed(0)}ms is above recommended threshold`,
        impact: 'Improved user experience and reduced timeout risks',
        effort: 'medium',
        expectedImprovement: '30-50% latency reduction',
        actionItems: [
          'Consider switching to faster models for time-sensitive operations',
          'Implement response caching for repeated queries',
          'Optimize prompt engineering to reduce token usage'
        ]
      })
    }

    // Cost recommendations
    if (performanceStats.stats.averageCost > 0.02) {
      recommendations.push({
        id: 'optimize_costs',
        type: 'cost',
        priority: 'medium',
        title: 'Optimize AI Operation Costs',
        description: `Average cost per request of $${performanceStats.stats.averageCost.toFixed(4)} is high`,
        impact: 'Significant cost savings for high-volume operations',
        effort: 'low',
        expectedImprovement: '25-40% cost reduction',
        actionItems: [
          'Switch to more cost-effective models for non-critical operations',
          'Implement request batching where possible',
          'Review and optimize prompt lengths'
        ]
      })
    }

    // Quality recommendations
    if (qualityStats.overallScore < 75) {
      recommendations.push({
        id: 'improve_quality',
        type: 'quality',
        priority: 'high',
        title: 'Improve Response Quality',
        description: `Average quality score of ${qualityStats.overallScore.toFixed(1)} is below target`,
        impact: 'Better user satisfaction and more effective AI assistance',
        effort: 'medium',
        expectedImprovement: '15-25 point quality score increase',
        actionItems: [
          'Review and enhance prompt templates',
          'Implement quality feedback loops',
          'Consider using higher-quality models for critical operations'
        ]
      })
    }

    // Infrastructure recommendations
    if (infrastructureStats.connectionPool.utilizationRate > 80) {
      recommendations.push({
        id: 'scale_database',
        type: 'infrastructure',
        priority: 'medium',
        title: 'Scale Database Connections',
        description: `Connection pool utilization at ${infrastructureStats.connectionPool.utilizationRate.toFixed(1)}%`,
        impact: 'Prevent connection bottlenecks and improve reliability',
        effort: 'low',
        expectedImprovement: 'Reduced connection wait times',
        actionItems: [
          'Increase connection pool size',
          'Implement connection pooling optimizations',
          'Monitor connection usage patterns'
        ]
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  // Helper methods for data processing

  private identifyBottlenecks(
    stats: PerformanceStats,
    modelComparisons: ModelComparison[]
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []

    // Latency bottlenecks
    if (stats.averageLatency > 8000) {
      bottlenecks.push({
        type: 'latency',
        description: `High average latency of ${(stats.averageLatency / 1000).toFixed(1)} seconds`,
        impact: 'high',
        affectedOperations: [], // Would be populated with actual data
        affectedModels: modelComparisons.filter(m => m.stats.averageLatency > 8000).map(m => m.model),
        recommendation: 'Consider faster models or prompt optimization'
      })
    }

    // Error rate bottlenecks
    if (stats.errorRate > 5) {
      bottlenecks.push({
        type: 'error_rate',
        description: `High error rate of ${stats.errorRate.toFixed(1)}%`,
        impact: 'critical',
        affectedOperations: [],
        affectedModels: modelComparisons.filter(m => m.stats.successRate < 95).map(m => m.model),
        recommendation: 'Investigate error patterns and implement retry logic'
      })
    }

    return bottlenecks
  }

  private analyzeQualityIssues(topIssues: any[]): QualityIssueAnalysis[] {
    return topIssues.map(issue => ({
      type: issue.type,
      frequency: issue.count,
      impact: issue.percentage,
      affectedModels: issue.models,
      trend: 'stable' as const, // Would be calculated from historical data
      recommendation: this.getQualityIssueRecommendation(issue.type)
    }))
  }

  private buildBenchmarkMatrix(executions: any[]): BenchmarkMatrix {
    const models = [...new Set(executions.map(e => e.model))]
    const testCases = [...new Set(executions.map(e => e.testCaseId))]

    const scores: Record<string, Record<string, number>> = {}
    const rankings: Record<string, number> = {}

    models.forEach(model => {
      scores[model] = {}
      testCases.forEach(testCase => {
        const execution = executions.find(e => e.model === model && e.testCaseId === testCase)
        scores[model][testCase] = execution?.metrics?.qualityScore || 0
      })
    })

    // Calculate rankings
    models.forEach((model, index) => {
      rankings[model] = index + 1
    })

    return { models, testCases, scores, rankings }
  }

  private generateCostOptimizations(modelComparisons: ModelComparison[]): CostOptimization[] {
    const optimizations: CostOptimization[] = []

    // Find expensive models with cheaper alternatives
    const expensiveModels = modelComparisons.filter(m => m.stats.averageCost > 0.01)

    expensiveModels.forEach(expensiveModel => {
      const cheaperAlternatives = modelComparisons.filter(
        m => m.stats.averageCost < expensiveModel.stats.averageCost * 0.7 &&
             m.stats.averageLatency < expensiveModel.stats.averageLatency * 1.2
      )

      if (cheaperAlternatives.length > 0) {
        const potential = cheaperAlternatives[0]
        const savings = (expensiveModel.stats.averageCost - potential.stats.averageCost) *
                       expensiveModel.stats.totalRequests

        optimizations.push({
          type: 'model_switch',
          description: `Switch from ${expensiveModel.model} to ${potential.model}`,
          potentialSavings: savings,
          implementationEffort: 'low',
          riskLevel: 'low'
        })
      }
    })

    return optimizations
  }

  private async buildLatencyTrends(startTime: Date, endTime: Date): Promise<TimeSeries[]> {
    // In a real implementation, this would query historical data
    return []
  }

  private async buildThroughputTrends(startTime: Date, endTime: Date): Promise<TimeSeries[]> {
    // In a real implementation, this would query historical data
    return []
  }

  private async buildLatencyTimeSeries(timePoints: Date[]): Promise<TimeSeries[]> {
    return timePoints.map(timestamp => ({
      timestamp,
      value: Math.random() * 5000 + 1000 // Simulated data
    }))
  }

  private async buildCostTimeSeries(timePoints: Date[]): Promise<TimeSeries[]> {
    return timePoints.map(timestamp => ({
      timestamp,
      value: Math.random() * 0.05 + 0.01 // Simulated data
    }))
  }

  private async buildQualityTimeSeries(timePoints: Date[]): Promise<TimeSeries[]> {
    return timePoints.map(timestamp => ({
      timestamp,
      value: Math.random() * 30 + 70 // Simulated data
    }))
  }

  private async buildThroughputTimeSeries(timePoints: Date[]): Promise<TimeSeries[]> {
    return timePoints.map(timestamp => ({
      timestamp,
      value: Math.random() * 100 + 50 // Simulated data
    }))
  }

  private async checkPerformanceHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    const recentAlerts = metricsCollector.getAlerts('critical', 5)
    if (recentAlerts.length > 2) return 'critical'

    const warningAlerts = metricsCollector.getAlerts('high', 10)
    if (warningAlerts.length > 5) return 'warning'

    return 'healthy'
  }

  private async checkQualityHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    const recentAlerts = qualityService.getAlerts('critical', 5)
    if (recentAlerts.length > 2) return 'critical'

    const warningAlerts = qualityService.getAlerts('high', 10)
    if (warningAlerts.length > 5) return 'warning'

    return 'healthy'
  }

  private async checkInfrastructureHealth(): Promise<'healthy' | 'warning' | 'critical'> {
    const summary = poolMetricsCollector.getPerformanceSummary()
    const utilization = summary.currentMetrics?.utilizationRate || 0

    if (utilization > 90) return 'critical'
    if (utilization > 75) return 'warning'
    return 'healthy'
  }

  private checkAIGatewayHealth(): 'healthy' | 'warning' | 'critical' {
    // In a real implementation, this would check AI gateway connectivity
    return 'healthy'
  }

  private determineOverallHealth(
    healthStatuses: ('healthy' | 'warning' | 'critical')[]
  ): 'healthy' | 'warning' | 'critical' {
    if (healthStatuses.includes('critical')) return 'critical'
    if (healthStatuses.includes('warning')) return 'warning'
    return 'healthy'
  }

  private calculateUptime(): number {
    // In a real implementation, this would track actual uptime
    return 99.9
  }

  private determineAlertSource(alert: any): 'performance' | 'quality' | 'infrastructure' | 'cost' {
    if ('cost' in alert || alert.type === 'cost') return 'cost'
    if ('qualityScore' in alert || alert.type?.includes('quality')) return 'quality'
    if ('utilizationRate' in alert || alert.type?.includes('connection')) return 'infrastructure'
    return 'performance'
  }

  private calculateTrend(metric: string, data: any): number {
    // In a real implementation, this would calculate actual trends
    return Math.random() * 20 - 10 // -10% to +10%
  }

  private getDaysBetween(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  private generateTimePoints(
    startTime: Date,
    endTime: Date,
    granularity: 'hour' | 'day' | 'week'
  ): Date[] {
    const points: Date[] = []
    const current = new Date(startTime)
    const interval = granularity === 'hour' ? 3600000 :
                    granularity === 'day' ? 86400000 :
                    604800000 // week

    while (current <= endTime) {
      points.push(new Date(current))
      current.setTime(current.getTime() + interval)
    }

    return points
  }

  private getQualityIssueRecommendation(issueType: string): string {
    const recommendations = {
      'irrelevant': 'Improve prompt specificity and context',
      'incoherent': 'Review response structure and logical flow',
      'incomplete': 'Ensure comprehensive coverage of all query aspects',
      'inaccurate': 'Implement fact-checking and verification processes',
      'unsafe': 'Strengthen content filtering and safety guidelines',
      'repetitive': 'Enhance content variety and avoid redundancy'
    }
    return recommendations[issueType as keyof typeof recommendations] || 'Review and optimize response quality'
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const dashboardService = new UnifiedDashboardService()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get dashboard data for the last 24 hours
 */
export async function getDashboardOverview(userId?: string): Promise<DashboardData> {
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)

  return dashboardService.getDashboardData(startTime, endTime, { userId })
}

/**
 * Get real-time system status
 */
export async function getSystemStatus(): Promise<SystemHealthStatus> {
  return dashboardService.getSystemHealth()
}

/**
 * Get cost analysis for the last 7 days
 */
export async function getCostOverview(): Promise<CostInsights> {
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000)

  return dashboardService.getCostAnalysis(startTime, endTime)
}

export default dashboardService