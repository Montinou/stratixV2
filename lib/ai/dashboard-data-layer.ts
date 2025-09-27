import { performanceAnalytics } from './performance-analytics'
import { qualityTracker } from './quality-metrics'
import { modelBenchmarking } from './benchmarking'
import { abTesting } from './ab-testing'
import { alertingSystem } from './alerting-system'
import type { PerformanceStats } from './performance-analytics'
import type { QualityTrend, QualityComparison } from './quality-metrics'
import type { BenchmarkResult, ModelBenchmarkSummary } from './benchmarking'
import type { ABTest } from './ab-testing'
import type { Alert, AlertSeverity } from './alerting-system'

// Dashboard data interfaces
export interface DashboardData {
  overview: OverviewData
  performance: PerformanceData
  quality: QualityData
  costs: CostData
  benchmarks: BenchmarkData
  abTests: ABTestData
  alerts: AlertData
  recommendations: RecommendationData
  metadata: DashboardMetadata
}

export interface OverviewData {
  kpis: KeyPerformanceIndicators
  trends: TrendData
  healthScore: HealthScore
  quickStats: QuickStats
  recentActivity: ActivityItem[]
}

export interface KeyPerformanceIndicators {
  totalRequests: {
    value: number
    change: number
    period: string
  }
  averageLatency: {
    value: number
    change: number
    unit: 'ms'
    status: 'good' | 'warning' | 'critical'
  }
  successRate: {
    value: number
    change: number
    unit: '%'
    status: 'good' | 'warning' | 'critical'
  }
  qualityScore: {
    value: number
    change: number
    unit: '%'
    status: 'good' | 'warning' | 'critical'
  }
  totalCost: {
    value: number
    change: number
    unit: '$'
    projected: {
      daily: number
      monthly: number
    }
  }
}

export interface TrendData {
  requests: TimeSeriesPoint[]
  latency: TimeSeriesPoint[]
  quality: TimeSeriesPoint[]
  cost: TimeSeriesPoint[]
  errors: TimeSeriesPoint[]
}

export interface TimeSeriesPoint {
  timestamp: Date
  value: number
  label?: string
}

export interface HealthScore {
  overall: number
  components: {
    performance: number
    quality: number
    reliability: number
    cost: number
  }
  status: 'healthy' | 'warning' | 'critical'
  lastUpdated: Date
}

export interface QuickStats {
  activeModels: number
  runningTests: number
  activeAlerts: number
  topOperation: string
  topModel: string
}

export interface ActivityItem {
  id: string
  type: 'alert' | 'test' | 'benchmark' | 'optimization'
  title: string
  description: string
  timestamp: Date
  severity?: AlertSeverity
  status?: string
}

export interface PerformanceData {
  summary: PerformanceStats
  modelComparison: ModelPerformanceComparison[]
  operationBreakdown: OperationBreakdown[]
  latencyDistribution: DistributionData
  throughputMetrics: ThroughputMetrics
  anomalies: AnomalyData[]
}

export interface ModelPerformanceComparison {
  model: string
  provider: string
  metrics: {
    averageLatency: number
    successRate: number
    qualityScore: number
    cost: number
    requests: number
  }
  trend: 'up' | 'down' | 'stable'
  rank: number
}

export interface OperationBreakdown {
  operation: string
  requests: number
  successRate: number
  averageLatency: number
  averageQuality: number
  cost: number
  trend: 'up' | 'down' | 'stable'
}

export interface DistributionData {
  buckets: Array<{
    range: string
    count: number
    percentage: number
  }>
  percentiles: {
    p50: number
    p75: number
    p90: number
    p95: number
    p99: number
  }
}

export interface ThroughputMetrics {
  requestsPerSecond: number
  requestsPerMinute: number
  requestsPerHour: number
  peakThroughput: {
    value: number
    timestamp: Date
  }
}

export interface AnomalyData {
  id: string
  type: string
  description: string
  severity: string
  timestamp: Date
  affectedOperations: string[]
  impact: string
}

export interface QualityData {
  summary: QualitySummary
  trends: QualityTrend[]
  modelComparison: QualityComparison[]
  categoryBreakdown: CategoryBreakdown[]
  userFeedback: UserFeedbackSummary
}

export interface QualitySummary {
  averageScore: number
  change: number
  distribution: {
    excellent: number // 90-100
    good: number      // 75-89
    fair: number      // 60-74
    poor: number      // <60
  }
  topIssues: string[]
}

export interface CategoryBreakdown {
  category: string
  score: number
  samples: number
  trend: 'up' | 'down' | 'stable'
}

export interface UserFeedbackSummary {
  totalFeedback: number
  averageRating: number
  helpfulPercentage: number
  recentComments: Array<{
    comment: string
    rating: number
    timestamp: Date
  }>
}

export interface CostData {
  summary: CostSummary
  breakdown: CostBreakdown
  trends: TimeSeriesPoint[]
  optimization: CostOptimization
  forecasting: CostForecast
}

export interface CostSummary {
  total: number
  change: number
  averagePerRequest: number
  dailyBurn: number
  monthlyProjection: number
}

export interface CostBreakdown {
  byModel: Array<{
    model: string
    cost: number
    percentage: number
    requests: number
  }>
  byOperation: Array<{
    operation: string
    cost: number
    percentage: number
    requests: number
  }>
  byProvider: Array<{
    provider: string
    cost: number
    percentage: number
  }>
}

export interface CostOptimization {
  potentialSavings: number
  recommendations: Array<{
    type: string
    description: string
    impact: string
    effort: 'low' | 'medium' | 'high'
  }>
}

export interface CostForecast {
  nextWeek: number
  nextMonth: number
  nextQuarter: number
  confidence: number
}

export interface BenchmarkData {
  summary: BenchmarkSummary
  modelRankings: ModelBenchmarkSummary[]
  recentResults: BenchmarkResult[]
  categoryPerformance: CategoryPerformance[]
  improvements: ImprovementOpportunity[]
}

export interface BenchmarkSummary {
  totalBenchmarks: number
  modelsEvaluated: number
  averageScore: number
  lastRunDate: Date
  topPerformer: string
}

export interface CategoryPerformance {
  category: string
  leader: string
  leaderScore: number
  averageScore: number
  samples: number
}

export interface ImprovementOpportunity {
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  category: string
}

export interface ABTestData {
  summary: ABTestSummary
  activeTests: ABTest[]
  completedTests: ABTest[]
  results: ABTestResults[]
  insights: ABTestInsight[]
}

export interface ABTestSummary {
  totalTests: number
  activeTests: number
  completedTests: number
  significantResults: number
  averageConfidence: number
}

export interface ABTestResults {
  testId: string
  testName: string
  status: string
  confidence: number
  winningVariant?: string
  improvement: string
  completedAt: Date
}

export interface ABTestInsight {
  insight: string
  impact: string
  recommendation: string
}

export interface AlertData {
  summary: AlertSummary
  activeAlerts: Alert[]
  alertHistory: Alert[]
  statistics: AlertStatistics
}

export interface AlertSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  resolved24h: number
}

export interface AlertStatistics {
  mttr: number // Mean Time To Resolution in minutes
  alertsPerDay: number
  topAlertTypes: Array<{
    type: string
    count: number
  }>
  resolutionTrend: 'improving' | 'degrading' | 'stable'
}

export interface RecommendationData {
  performance: RecommendationItem[]
  quality: RecommendationItem[]
  cost: RecommendationItem[]
  general: RecommendationItem[]
}

export interface RecommendationItem {
  id: string
  type: string
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  category: string
  priority: number
  estimatedSavings?: string
  implementationGuide?: string
}

export interface DashboardMetadata {
  generatedAt: Date
  timeRange: {
    start: Date
    end: Date
  }
  dataFreshness: {
    performance: Date
    quality: Date
    alerts: Date
    costs: Date
  }
  version: string
  userId?: string
}

export interface DashboardFilters {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom'
  operation?: string
  model?: string
  provider?: string
  customRange?: {
    start: Date
    end: Date
  }
}

export class DashboardDataLayer {
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map()
  private readonly defaultCacheTTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Start cache cleanup
    setInterval(() => this.cleanupCache(), 60 * 1000) // Cleanup every minute
  }

  /**
   * Get comprehensive dashboard data
   */
  public async getDashboardData(
    filters: DashboardFilters,
    userId?: string
  ): Promise<DashboardData> {
    const cacheKey = this.generateCacheKey('dashboard', filters, userId)
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    const { startTime, endTime } = this.parseTimeRange(filters)

    // Build filter object for data sources
    const dataFilters = {
      ...(filters.operation && { operation: filters.operation }),
      ...(filters.model && { model: filters.model }),
      ...(filters.provider && { provider: filters.provider }),
      ...(userId && { userId })
    }

    // Gather data from all sources in parallel
    const [
      overview,
      performance,
      quality,
      costs,
      benchmarks,
      abTests,
      alerts,
      recommendations
    ] = await Promise.all([
      this.getOverviewData(startTime, endTime, dataFilters),
      this.getPerformanceData(startTime, endTime, dataFilters),
      this.getQualityData(startTime, endTime, dataFilters),
      this.getCostData(startTime, endTime, dataFilters),
      this.getBenchmarkData(startTime, endTime, dataFilters),
      this.getABTestData(startTime, endTime, dataFilters),
      this.getAlertData(startTime, endTime, dataFilters),
      this.getRecommendationData(startTime, endTime, dataFilters)
    ])

    const dashboardData: DashboardData = {
      overview,
      performance,
      quality,
      costs,
      benchmarks,
      abTests,
      alerts,
      recommendations,
      metadata: {
        generatedAt: new Date(),
        timeRange: { start: startTime, end: endTime },
        dataFreshness: {
          performance: new Date(),
          quality: new Date(),
          alerts: new Date(),
          costs: new Date()
        },
        version: '1.0.0',
        userId
      }
    }

    this.setCache(cacheKey, dashboardData, this.defaultCacheTTL)
    return dashboardData
  }

  /**
   * Get overview data
   */
  private async getOverviewData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<OverviewData> {
    const stats = performanceAnalytics.getPerformanceStats(startTime, endTime, filters)
    const previousPeriod = this.getPreviousPeriod(startTime, endTime)
    const previousStats = performanceAnalytics.getPerformanceStats(
      previousPeriod.start,
      previousPeriod.end,
      filters
    )

    // Calculate changes
    const requestsChange = this.calculateChange(stats.totalRequests, previousStats.totalRequests)
    const latencyChange = this.calculateChange(stats.averageLatency, previousStats.averageLatency)
    const successRateChange = this.calculateChange(stats.successRate, previousStats.successRate)
    const qualityChange = this.calculateChange(stats.qualityScore, previousStats.qualityScore)
    const costChange = this.calculateChange(stats.totalCost, previousStats.totalCost)

    const kpis: KeyPerformanceIndicators = {
      totalRequests: {
        value: stats.totalRequests,
        change: requestsChange,
        period: this.formatTimeRange(startTime, endTime)
      },
      averageLatency: {
        value: Math.round(stats.averageLatency),
        change: latencyChange,
        unit: 'ms',
        status: this.getLatencyStatus(stats.averageLatency)
      },
      successRate: {
        value: Math.round(stats.successRate * 100) / 100,
        change: successRateChange,
        unit: '%',
        status: this.getSuccessRateStatus(stats.successRate)
      },
      qualityScore: {
        value: Math.round(stats.qualityScore * 100) / 100,
        change: qualityChange,
        unit: '%',
        status: this.getQualityStatus(stats.qualityScore)
      },
      totalCost: {
        value: Math.round(stats.totalCost * 10000) / 10000,
        change: costChange,
        unit: '$',
        projected: {
          daily: this.projectDailyCost(stats.totalCost, startTime, endTime),
          monthly: this.projectMonthlyCost(stats.totalCost, startTime, endTime)
        }
      }
    }

    const trends = await this.generateTrendData(startTime, endTime, filters)
    const healthScore = this.calculateHealthScore(stats)
    const quickStats = await this.getQuickStats(filters)
    const recentActivity = await this.getRecentActivity(5)

    return {
      kpis,
      trends,
      healthScore,
      quickStats,
      recentActivity
    }
  }

  /**
   * Get performance data
   */
  private async getPerformanceData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<PerformanceData> {
    const summary = performanceAnalytics.getPerformanceStats(startTime, endTime, filters)
    const anomalies = performanceAnalytics.detectAnomalies(24)

    // Get model comparison data
    const modelComparison = await this.getModelPerformanceComparison(startTime, endTime, filters)
    const operationBreakdown = await this.getOperationBreakdown(startTime, endTime, filters)
    const latencyDistribution = this.generateLatencyDistribution(startTime, endTime, filters)
    const throughputMetrics = this.calculateThroughputMetrics(startTime, endTime, filters)

    return {
      summary,
      modelComparison,
      operationBreakdown,
      latencyDistribution,
      throughputMetrics,
      anomalies: anomalies.map(a => ({
        id: `anomaly_${Date.now()}`,
        type: a.type,
        description: a.description,
        severity: a.severity,
        timestamp: a.detectedAt,
        affectedOperations: a.affectedOperations,
        impact: 'performance'
      }))
    }
  }

  /**
   * Get quality data
   */
  private async getQualityData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<QualityData> {
    const qualityMetrics = qualityTracker.getQualityMetrics({
      startDate: startTime,
      endDate: endTime,
      ...filters
    })

    const avgQuality = qualityMetrics.length > 0
      ? qualityMetrics.reduce((sum, m) => sum + m.scores.overall, 0) / qualityMetrics.length
      : 0

    const previousPeriod = this.getPreviousPeriod(startTime, endTime)
    const previousQualityMetrics = qualityTracker.getQualityMetrics({
      startDate: previousPeriod.start,
      endDate: previousPeriod.end,
      ...filters
    })

    const previousAvgQuality = previousQualityMetrics.length > 0
      ? previousQualityMetrics.reduce((sum, m) => sum + m.scores.overall, 0) / previousQualityMetrics.length
      : 0

    const qualityChange = this.calculateChange(avgQuality, previousAvgQuality)

    const distribution = this.calculateQualityDistribution(qualityMetrics)
    const trends = qualityTracker.getQualityTrends(startTime, endTime, filters)
    const modelComparison = qualityTracker.compareModelQuality(startTime, endTime, filters.operation)

    const summary: QualitySummary = {
      averageScore: avgQuality,
      change: qualityChange,
      distribution,
      topIssues: this.extractTopQualityIssues(qualityMetrics)
    }

    return {
      summary,
      trends,
      modelComparison,
      categoryBreakdown: this.generateCategoryBreakdown(qualityMetrics),
      userFeedback: this.generateUserFeedbackSummary(qualityMetrics)
    }
  }

  /**
   * Get cost data
   */
  private async getCostData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<CostData> {
    const stats = performanceAnalytics.getPerformanceStats(startTime, endTime, filters)
    const previousPeriod = this.getPreviousPeriod(startTime, endTime)
    const previousStats = performanceAnalytics.getPerformanceStats(
      previousPeriod.start,
      previousPeriod.end,
      filters
    )

    const costChange = this.calculateChange(stats.totalCost, previousStats.totalCost)

    const summary: CostSummary = {
      total: stats.totalCost,
      change: costChange,
      averagePerRequest: stats.averageCost,
      dailyBurn: this.projectDailyCost(stats.totalCost, startTime, endTime),
      monthlyProjection: this.projectMonthlyCost(stats.totalCost, startTime, endTime)
    }

    const breakdown = await this.generateCostBreakdown(startTime, endTime, filters)
    const trends = await this.generateCostTrends(startTime, endTime, filters)
    const optimization = this.generateCostOptimization(startTime, endTime, filters)
    const forecasting = this.generateCostForecast(stats, startTime, endTime)

    return {
      summary,
      breakdown,
      trends,
      optimization,
      forecasting
    }
  }

  /**
   * Get benchmark data
   */
  private async getBenchmarkData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<BenchmarkData> {
    const results = modelBenchmarking.getBenchmarkResults({
      startDate: startTime,
      endDate: endTime,
      ...(filters.model && { model: filters.model })
    })

    const summary: BenchmarkSummary = {
      totalBenchmarks: results.length,
      modelsEvaluated: new Set(results.map(r => r.model)).size,
      averageScore: results.length > 0
        ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
        : 0,
      lastRunDate: results.length > 0
        ? new Date(Math.max(...results.map(r => r.timestamp.getTime())))
        : new Date(),
      topPerformer: this.getTopPerformer(results)
    }

    return {
      summary,
      modelRankings: [], // Would be populated from actual benchmark summaries
      recentResults: results.slice(-10),
      categoryPerformance: this.generateCategoryPerformance(results),
      improvements: this.generateImprovementOpportunities(results)
    }
  }

  /**
   * Get A/B test data
   */
  private async getABTestData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<ABTestData> {
    const allTests = abTesting.getTests()
    const activeTests = allTests.filter(t => t.status === 'active')
    const completedTests = allTests.filter(t =>
      t.status === 'completed' &&
      t.endDate &&
      t.endDate >= startTime &&
      t.endDate <= endTime
    )

    const summary: ABTestSummary = {
      totalTests: allTests.length,
      activeTests: activeTests.length,
      completedTests: completedTests.length,
      significantResults: completedTests.filter(t =>
        t.results?.status === 'significant' || t.results?.status === 'highly_significant'
      ).length,
      averageConfidence: this.calculateAverageConfidence(completedTests)
    }

    return {
      summary,
      activeTests,
      completedTests,
      results: this.generateABTestResults(completedTests),
      insights: this.generateABTestInsights(completedTests)
    }
  }

  /**
   * Get alert data
   */
  private async getAlertData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<AlertData> {
    const activeAlerts = alertingSystem.getActiveAlerts()
    const alertHistory = alertingSystem.getAlertHistory(startTime, endTime)
    const statistics = alertingSystem.getAlertStatistics(startTime, endTime)

    const summary: AlertSummary = {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length,
      resolved24h: alertHistory.filter(a =>
        a.status === 'resolved' &&
        a.resolvedAt &&
        a.resolvedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    }

    return {
      summary,
      activeAlerts,
      alertHistory,
      statistics: {
        mttr: statistics.mttr,
        alertsPerDay: statistics.total / this.getDaysDifference(startTime, endTime),
        topAlertTypes: Object.entries(statistics.byType).map(([type, count]) => ({
          type,
          count
        })).sort((a, b) => b.count - a.count).slice(0, 5),
        resolutionTrend: this.calculateResolutionTrend(alertHistory)
      }
    }
  }

  /**
   * Get recommendation data
   */
  private async getRecommendationData(
    startTime: Date,
    endTime: Date,
    filters: any
  ): Promise<RecommendationData> {
    const performanceRecs = performanceAnalytics.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'latency'
    )

    const costRecs = performanceAnalytics.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'cost'
    )

    const qualityRecs = performanceAnalytics.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'quality'
    )

    return {
      performance: this.formatRecommendations(performanceRecs, 'performance'),
      quality: this.formatRecommendations(qualityRecs, 'quality'),
      cost: this.formatRecommendations(costRecs, 'cost'),
      general: this.generateGeneralRecommendations(startTime, endTime, filters)
    }
  }

  // Helper methods

  private parseTimeRange(filters: DashboardFilters): { startTime: Date; endTime: Date } {
    const endTime = new Date()
    let startTime: Date

    if (filters.timeRange === 'custom' && filters.customRange) {
      return {
        startTime: filters.customRange.start,
        endTime: filters.customRange.end
      }
    }

    switch (filters.timeRange) {
      case '1h':
        startTime = new Date(endTime.getTime() - 60 * 60 * 1000)
        break
      case '6h':
        startTime = new Date(endTime.getTime() - 6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
    }

    return { startTime, endTime }
  }

  private getPreviousPeriod(startTime: Date, endTime: Date): { start: Date; end: Date } {
    const duration = endTime.getTime() - startTime.getTime()
    return {
      start: new Date(startTime.getTime() - duration),
      end: new Date(startTime.getTime())
    }
  }

  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  private getLatencyStatus(latency: number): 'good' | 'warning' | 'critical' {
    if (latency < 2000) return 'good'
    if (latency < 5000) return 'warning'
    return 'critical'
  }

  private getSuccessRateStatus(rate: number): 'good' | 'warning' | 'critical' {
    if (rate >= 99) return 'good'
    if (rate >= 95) return 'warning'
    return 'critical'
  }

  private getQualityStatus(score: number): 'good' | 'warning' | 'critical' {
    if (score >= 85) return 'good'
    if (score >= 70) return 'warning'
    return 'critical'
  }

  private formatTimeRange(startTime: Date, endTime: Date): string {
    const duration = endTime.getTime() - startTime.getTime()
    const days = Math.floor(duration / (24 * 60 * 60 * 1000))
    const hours = Math.floor(duration / (60 * 60 * 1000))

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    return `${Math.floor(duration / (60 * 1000))}m`
  }

  private projectDailyCost(totalCost: number, startTime: Date, endTime: Date): number {
    const duration = endTime.getTime() - startTime.getTime()
    const days = duration / (24 * 60 * 60 * 1000)
    return totalCost / days
  }

  private projectMonthlyCost(totalCost: number, startTime: Date, endTime: Date): number {
    return this.projectDailyCost(totalCost, startTime, endTime) * 30
  }

  // Cache management

  private generateCacheKey(type: string, filters: any, userId?: string): string {
    const filterStr = JSON.stringify(filters)
    const userStr = userId || 'anonymous'
    return `${type}_${userStr}_${Buffer.from(filterStr).toString('base64')}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp.getTime() > cached.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Placeholder implementations for complex data generation
  // These would be fully implemented based on actual requirements

  private async generateTrendData(startTime: Date, endTime: Date, filters: any): Promise<TrendData> {
    // Generate sample trend data - replace with actual implementation
    const points: TimeSeriesPoint[] = []
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000))

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      points.push({
        timestamp,
        value: Math.floor(Math.random() * 100) + 50
      })
    }

    return {
      requests: points,
      latency: points.map(p => ({ ...p, value: p.value * 20 })),
      quality: points.map(p => ({ ...p, value: Math.min(100, p.value + 30) })),
      cost: points.map(p => ({ ...p, value: p.value * 0.01 })),
      errors: points.map(p => ({ ...p, value: Math.max(0, 10 - p.value / 10) }))
    }
  }

  private calculateHealthScore(stats: PerformanceStats): HealthScore {
    const performance = Math.min(100, Math.max(0, 100 - (stats.averageLatency / 100)))
    const quality = stats.qualityScore
    const reliability = stats.successRate
    const cost = Math.min(100, Math.max(0, 100 - (stats.totalCost * 1000)))

    const overall = (performance + quality + reliability + cost) / 4

    return {
      overall: Math.round(overall),
      components: {
        performance: Math.round(performance),
        quality: Math.round(quality),
        reliability: Math.round(reliability),
        cost: Math.round(cost)
      },
      status: overall >= 80 ? 'healthy' : overall >= 60 ? 'warning' : 'critical',
      lastUpdated: new Date()
    }
  }

  private async getQuickStats(filters: any): Promise<QuickStats> {
    return {
      activeModels: 4, // Replace with actual count
      runningTests: 2, // Replace with actual count
      activeAlerts: alertingSystem.getActiveAlerts().length,
      topOperation: 'generate_okr',
      topModel: 'openai/gpt-4o-mini'
    }
  }

  private async getRecentActivity(limit: number): Promise<ActivityItem[]> {
    // Combine recent alerts, tests, and other activities
    const activities: ActivityItem[] = []

    // Add recent alerts
    const recentAlerts = alertingSystem.getActiveAlerts().slice(0, 3)
    recentAlerts.forEach(alert => {
      activities.push({
        id: alert.id,
        type: 'alert',
        title: alert.title,
        description: alert.description,
        timestamp: alert.createdAt,
        severity: alert.severity
      })
    })

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  // Additional helper methods would be implemented here
  // Following the same pattern as above

  private async getModelPerformanceComparison(startTime: Date, endTime: Date, filters: any): Promise<ModelPerformanceComparison[]> {
    // Mock implementation
    return [
      {
        model: 'openai/gpt-4o-mini',
        provider: 'openai',
        metrics: {
          averageLatency: 1800,
          successRate: 98.5,
          qualityScore: 85.2,
          cost: 0.0008,
          requests: 1500
        },
        trend: 'up',
        rank: 1
      }
    ]
  }

  private async getOperationBreakdown(startTime: Date, endTime: Date, filters: any): Promise<OperationBreakdown[]> {
    // Mock implementation
    return [
      {
        operation: 'generate_okr',
        requests: 1250,
        successRate: 98.2,
        averageLatency: 2300,
        averageQuality: 88.5,
        cost: 1.85,
        trend: 'up'
      }
    ]
  }

  private generateLatencyDistribution(startTime: Date, endTime: Date, filters: any): DistributionData {
    // Mock implementation
    return {
      buckets: [
        { range: '0-1s', count: 450, percentage: 45 },
        { range: '1-2s', count: 300, percentage: 30 },
        { range: '2-5s', count: 200, percentage: 20 },
        { range: '5s+', count: 50, percentage: 5 }
      ],
      percentiles: {
        p50: 1200,
        p75: 2100,
        p90: 3500,
        p95: 4800,
        p99: 8200
      }
    }
  }

  private calculateThroughputMetrics(startTime: Date, endTime: Date, filters: any): ThroughputMetrics {
    // Mock implementation
    const totalRequests = 1000
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000

    return {
      requestsPerSecond: totalRequests / durationSeconds,
      requestsPerMinute: (totalRequests / durationSeconds) * 60,
      requestsPerHour: (totalRequests / durationSeconds) * 3600,
      peakThroughput: {
        value: 50,
        timestamp: new Date()
      }
    }
  }

  private calculateQualityDistribution(qualityMetrics: any[]): any {
    const excellent = qualityMetrics.filter(m => m.scores.overall >= 90).length
    const good = qualityMetrics.filter(m => m.scores.overall >= 75 && m.scores.overall < 90).length
    const fair = qualityMetrics.filter(m => m.scores.overall >= 60 && m.scores.overall < 75).length
    const poor = qualityMetrics.filter(m => m.scores.overall < 60).length

    return { excellent, good, fair, poor }
  }

  private extractTopQualityIssues(qualityMetrics: any[]): string[] {
    // Mock implementation
    return ['Respuestas incompletas', 'Falta de coherencia', 'Información desactualizada']
  }

  private generateCategoryBreakdown(qualityMetrics: any[]): CategoryBreakdown[] {
    // Mock implementation
    return [
      { category: 'text_generation', score: 87.5, samples: 250, trend: 'up' },
      { category: 'analysis', score: 91.2, samples: 180, trend: 'stable' },
      { category: 'chat_completion', score: 85.8, samples: 320, trend: 'up' }
    ]
  }

  private generateUserFeedbackSummary(qualityMetrics: any[]): UserFeedbackSummary {
    // Mock implementation
    return {
      totalFeedback: 45,
      averageRating: 4.2,
      helpfulPercentage: 87,
      recentComments: [
        { comment: 'Muy útil y preciso', rating: 5, timestamp: new Date() },
        { comment: 'Podría ser más específico', rating: 3, timestamp: new Date() }
      ]
    }
  }

  private async generateCostBreakdown(startTime: Date, endTime: Date, filters: any): Promise<CostBreakdown> {
    // Mock implementation
    return {
      byModel: [
        { model: 'openai/gpt-4o-mini', cost: 2.45, percentage: 65, requests: 1500 },
        { model: 'anthropic/claude-3-haiku-20240307', cost: 1.20, percentage: 32, requests: 800 }
      ],
      byOperation: [
        { operation: 'generate_okr', cost: 1.85, percentage: 49, requests: 1250 },
        { operation: 'analyze_performance', cost: 1.25, percentage: 33, requests: 890 }
      ],
      byProvider: [
        { provider: 'openai', cost: 2.60, percentage: 69 },
        { provider: 'anthropic', cost: 1.20, percentage: 31 }
      ]
    }
  }

  private async generateCostTrends(startTime: Date, endTime: Date, filters: any): Promise<TimeSeriesPoint[]> {
    // Mock implementation - generate hourly cost data
    const points: TimeSeriesPoint[] = []
    const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000))

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      points.push({
        timestamp,
        value: Math.random() * 0.1 + 0.05 // Random cost between 0.05 and 0.15
      })
    }

    return points
  }

  private generateCostOptimization(startTime: Date, endTime: Date, filters: any): CostOptimization {
    // Mock implementation
    return {
      potentialSavings: 0.85,
      recommendations: [
        {
          type: 'model_optimization',
          description: 'Cambiar a gpt-4o-mini para tareas simples',
          impact: '22% de reducción de costos',
          effort: 'low'
        },
        {
          type: 'caching',
          description: 'Implementar cache para requests repetitivos',
          impact: '12% de reducción de costos',
          effort: 'medium'
        }
      ]
    }
  }

  private generateCostForecast(stats: PerformanceStats, startTime: Date, endTime: Date): CostForecast {
    const dailyCost = this.projectDailyCost(stats.totalCost, startTime, endTime)

    return {
      nextWeek: dailyCost * 7,
      nextMonth: dailyCost * 30,
      nextQuarter: dailyCost * 90,
      confidence: 85
    }
  }

  private getTopPerformer(results: BenchmarkResult[]): string {
    if (results.length === 0) return 'N/A'

    const modelScores = results.reduce((acc, result) => {
      if (!acc[result.model]) {
        acc[result.model] = []
      }
      acc[result.model].push(result.qualityScore)
      return acc
    }, {} as Record<string, number[]>)

    let topModel = ''
    let highestAvg = 0

    Object.entries(modelScores).forEach(([model, scores]) => {
      const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
      if (avg > highestAvg) {
        highestAvg = avg
        topModel = model
      }
    })

    return topModel
  }

  private generateCategoryPerformance(results: BenchmarkResult[]): CategoryPerformance[] {
    // Mock implementation
    return [
      {
        category: 'text_generation',
        leader: 'openai/gpt-4o',
        leaderScore: 91.5,
        averageScore: 87.2,
        samples: 25
      }
    ]
  }

  private generateImprovementOpportunities(results: BenchmarkResult[]): ImprovementOpportunity[] {
    // Mock implementation
    return [
      {
        description: 'Optimizar prompts para mejores resultados',
        impact: 'medium',
        effort: 'low',
        category: 'quality'
      }
    ]
  }

  private calculateAverageConfidence(tests: ABTest[]): number {
    const testsWithResults = tests.filter(t => t.results)
    if (testsWithResults.length === 0) return 0

    const totalConfidence = testsWithResults.reduce((sum, test) => sum + test.results!.confidence, 0)
    return totalConfidence / testsWithResults.length
  }

  private generateABTestResults(tests: ABTest[]): ABTestResults[] {
    return tests.map(test => ({
      testId: test.id,
      testName: test.name,
      status: test.status,
      confidence: test.results?.confidence || 0,
      winningVariant: test.results?.winningVariant,
      improvement: test.results?.winningVariant ? '15% improvement' : 'No significant difference',
      completedAt: test.endDate || new Date()
    }))
  }

  private generateABTestInsights(tests: ABTest[]): ABTestInsight[] {
    // Mock implementation
    return [
      {
        insight: 'GPT-4o-mini shows better performance for simple tasks',
        impact: 'Cost reduction opportunity',
        recommendation: 'Implement model routing based on task complexity'
      }
    ]
  }

  private getDaysDifference(startTime: Date, endTime: Date): number {
    return Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000))
  }

  private calculateResolutionTrend(alerts: Alert[]): 'improving' | 'degrading' | 'stable' {
    // Simple implementation - could be more sophisticated
    const recentAlerts = alerts.filter(a => a.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    const resolvedRecent = recentAlerts.filter(a => a.status === 'resolved').length

    if (recentAlerts.length === 0) return 'stable'

    const resolutionRate = resolvedRecent / recentAlerts.length
    if (resolutionRate > 0.8) return 'improving'
    if (resolutionRate < 0.5) return 'degrading'
    return 'stable'
  }

  private formatRecommendations(recs: any[], category: string): RecommendationItem[] {
    return recs.map((rec, index) => ({
      id: `${category}_${index}`,
      type: rec.type,
      title: rec.description,
      description: rec.implementation || rec.description,
      impact: rec.priority === 'high' ? 'high' : rec.priority === 'low' ? 'low' : 'medium',
      effort: rec.priority === 'high' ? 'low' : 'medium',
      category,
      priority: rec.priority === 'high' ? 3 : rec.priority === 'low' ? 1 : 2,
      estimatedSavings: rec.expectedImpact
    }))
  }

  private generateGeneralRecommendations(startTime: Date, endTime: Date, filters: any): RecommendationItem[] {
    // Mock implementation
    return [
      {
        id: 'general_1',
        type: 'monitoring',
        title: 'Implementar monitoreo proactivo',
        description: 'Configurar alertas para detectar problemas antes de que afecten a los usuarios',
        impact: 'high',
        effort: 'medium',
        category: 'general',
        priority: 3
      }
    ]
  }
}

// Export singleton instance
export const dashboardDataLayer = new DashboardDataLayer()

// Export utility functions
export async function getDashboardOverview(
  filters: DashboardFilters,
  userId?: string
): Promise<OverviewData> {
  const data = await dashboardDataLayer.getDashboardData(filters, userId)
  return data.overview
}

export async function getPerformanceInsights(
  filters: DashboardFilters,
  userId?: string
): Promise<PerformanceData> {
  const data = await dashboardDataLayer.getDashboardData(filters, userId)
  return data.performance
}

export async function getCostInsights(
  filters: DashboardFilters,
  userId?: string
): Promise<CostData> {
  const data = await dashboardDataLayer.getDashboardData(filters, userId)
  return data.costs
}