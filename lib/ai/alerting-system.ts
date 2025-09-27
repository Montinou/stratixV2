import { performanceAnalytics } from './performance-analytics'
import { qualityTracker } from './quality-metrics'
import { abTesting } from './ab-testing'
import type { AIPerformanceMetrics } from './performance-analytics'

// Alerting interfaces
export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  source: AlertSource
  metrics: AlertMetrics
  threshold: AlertThreshold
  status: AlertStatus
  createdAt: Date
  resolvedAt?: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
  resolution?: string
  metadata?: Record<string, any>
}

export type AlertType =
  | 'performance_degradation'
  | 'cost_spike'
  | 'quality_drop'
  | 'error_rate_high'
  | 'anomaly_detected'
  | 'ab_test_concern'
  | 'model_failure'
  | 'threshold_breach'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed'

export interface AlertSource {
  component: 'performance' | 'quality' | 'cost' | 'ab_test' | 'anomaly_detector'
  operation?: string
  model?: string
  testId?: string
}

export interface AlertMetrics {
  currentValue: number
  previousValue?: number
  changePercentage?: number
  thresholdValue: number
  measurementUnit: string
  timeWindow: string
}

export interface AlertThreshold {
  id: string
  name: string
  type: AlertType
  conditions: AlertCondition[]
  severity: AlertSeverity
  enabled: boolean
  cooldownPeriod: number // minutes
  notificationChannels: NotificationChannel[]
}

export interface AlertCondition {
  metric: string
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'change_gt' | 'change_lt'
  value: number
  timeWindow: string // e.g., '5m', '1h', '1d'
  minimumDataPoints?: number
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'console'
  config: Record<string, any>
  enabled: boolean
}

export interface AnomalyDetectionConfig {
  algorithm: 'iqr' | 'zscore' | 'moving_average' | 'seasonal'
  sensitivity: 'low' | 'medium' | 'high'
  minDataPoints: number
  lookbackWindow: string
  seasonalityPeriod?: string
}

export interface PerformanceBaseline {
  operation: string
  model?: string
  metrics: {
    averageLatency: number
    averageQuality: number
    averageCost: number
    successRate: number
  }
  calculatedAt: Date
  sampleSize: number
  validUntil: Date
}

// Default alert thresholds
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    id: 'high_latency',
    name: 'Latencia Alta',
    type: 'performance_degradation',
    conditions: [
      {
        metric: 'average_latency',
        operator: 'gt',
        value: 10000, // 10 seconds
        timeWindow: '15m',
        minimumDataPoints: 5
      }
    ],
    severity: 'high',
    enabled: true,
    cooldownPeriod: 30,
    notificationChannels: [
      { type: 'console', config: {}, enabled: true }
    ]
  },
  {
    id: 'cost_spike',
    name: 'Pico de Costos',
    type: 'cost_spike',
    conditions: [
      {
        metric: 'total_cost',
        operator: 'change_gt',
        value: 200, // 200% increase
        timeWindow: '1h',
        minimumDataPoints: 3
      }
    ],
    severity: 'critical',
    enabled: true,
    cooldownPeriod: 60,
    notificationChannels: [
      { type: 'console', config: {}, enabled: true }
    ]
  },
  {
    id: 'quality_degradation',
    name: 'Degradación de Calidad',
    type: 'quality_drop',
    conditions: [
      {
        metric: 'average_quality',
        operator: 'lt',
        value: 70,
        timeWindow: '30m',
        minimumDataPoints: 10
      }
    ],
    severity: 'medium',
    enabled: true,
    cooldownPeriod: 45,
    notificationChannels: [
      { type: 'console', config: {}, enabled: true }
    ]
  },
  {
    id: 'error_rate_spike',
    name: 'Tasa de Error Alta',
    type: 'error_rate_high',
    conditions: [
      {
        metric: 'error_rate',
        operator: 'gt',
        value: 10, // 10%
        timeWindow: '10m',
        minimumDataPoints: 5
      }
    ],
    severity: 'high',
    enabled: true,
    cooldownPeriod: 20,
    notificationChannels: [
      { type: 'console', config: {}, enabled: true }
    ]
  }
]

export class AlertingSystem {
  private alerts: Alert[] = []
  private thresholds: AlertThreshold[] = [...DEFAULT_ALERT_THRESHOLDS]
  private baselines: PerformanceBaseline[] = []
  private suppressedAlerts: Set<string> = new Set()
  private lastAlertTime: Map<string, Date> = new Map()

  constructor() {
    // Start monitoring
    this.startPeriodicMonitoring()
  }

  /**
   * Start periodic monitoring for alerts
   */
  private startPeriodicMonitoring(): void {
    // Check every 5 minutes
    setInterval(() => {
      this.checkAllThresholds()
    }, 5 * 60 * 1000)

    // Check for anomalies every 10 minutes
    setInterval(() => {
      this.detectAnomalies()
    }, 10 * 60 * 1000)

    // Update baselines every hour
    setInterval(() => {
      this.updateBaselines()
    }, 60 * 60 * 1000)
  }

  /**
   * Check all enabled alert thresholds
   */
  private async checkAllThresholds(): Promise<void> {
    for (const threshold of this.thresholds) {
      if (!threshold.enabled) continue

      try {
        await this.checkThreshold(threshold)
      } catch (error) {
        console.error(`Error checking threshold ${threshold.id}:`, error)
      }
    }
  }

  /**
   * Check a specific alert threshold
   */
  private async checkThreshold(threshold: AlertThreshold): Promise<void> {
    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(threshold.id)
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - lastAlert.getTime()
      const cooldownMs = threshold.cooldownPeriod * 60 * 1000
      if (timeSinceLastAlert < cooldownMs) {
        return // Still in cooldown
      }
    }

    const endTime = new Date()
    const startTime = this.parseTimeWindow(threshold.conditions[0].timeWindow, endTime)

    // Get metrics for evaluation
    const metrics = await this.getMetricsForThreshold(threshold, startTime, endTime)

    for (const condition of threshold.conditions) {
      const triggered = await this.evaluateCondition(condition, metrics, startTime, endTime)

      if (triggered) {
        await this.triggerAlert(threshold, condition, metrics)
        this.lastAlertTime.set(threshold.id, new Date())
        break // Only trigger once per threshold check
      }
    }
  }

  /**
   * Evaluate a specific alert condition
   */
  private async evaluateCondition(
    condition: AlertCondition,
    metrics: any,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const currentValue = metrics[condition.metric]
    if (currentValue === undefined) return false

    // Check minimum data points requirement
    if (condition.minimumDataPoints && metrics.dataPoints < condition.minimumDataPoints) {
      return false
    }

    switch (condition.operator) {
      case 'gt':
        return currentValue > condition.value
      case 'lt':
        return currentValue < condition.value
      case 'gte':
        return currentValue >= condition.value
      case 'lte':
        return currentValue <= condition.value
      case 'eq':
        return currentValue === condition.value
      case 'ne':
        return currentValue !== condition.value
      case 'change_gt':
      case 'change_lt':
        const previousValue = await this.getPreviousValue(
          condition.metric,
          startTime,
          condition.timeWindow
        )
        if (previousValue === null) return false

        const changePercentage = ((currentValue - previousValue) / previousValue) * 100
        if (condition.operator === 'change_gt') {
          return changePercentage > condition.value
        } else {
          return changePercentage < -condition.value
        }
      default:
        return false
    }
  }

  /**
   * Get metrics for threshold evaluation
   */
  private async getMetricsForThreshold(
    threshold: AlertThreshold,
    startTime: Date,
    endTime: Date
  ): Promise<any> {
    const stats = performanceAnalytics.getPerformanceStats(startTime, endTime)
    const qualityMetrics = qualityTracker.getQualityMetrics({
      startDate: startTime,
      endDate: endTime
    })

    const avgQuality = qualityMetrics.length > 0
      ? qualityMetrics.reduce((sum, m) => sum + m.scores.overall, 0) / qualityMetrics.length
      : 0

    return {
      average_latency: stats.averageLatency,
      average_quality: avgQuality,
      total_cost: stats.totalCost,
      average_cost: stats.averageCost,
      success_rate: stats.successRate,
      error_rate: 100 - stats.successRate,
      total_requests: stats.totalRequests,
      dataPoints: stats.totalRequests
    }
  }

  /**
   * Get previous value for change-based conditions
   */
  private async getPreviousValue(
    metric: string,
    currentStartTime: Date,
    timeWindow: string
  ): Promise<number | null> {
    const windowMs = this.parseTimeWindowToMs(timeWindow)
    const previousEndTime = new Date(currentStartTime.getTime())
    const previousStartTime = new Date(currentStartTime.getTime() - windowMs)

    const metrics = await this.getMetricsForThreshold(
      {} as AlertThreshold, // Not used in this context
      previousStartTime,
      previousEndTime
    )

    return metrics[metric] || null
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    threshold: AlertThreshold,
    condition: AlertCondition,
    metrics: any
  ): Promise<void> {
    const alertId = this.generateAlertId()
    const currentValue = metrics[condition.metric]

    const alert: Alert = {
      id: alertId,
      type: threshold.type,
      severity: threshold.severity,
      title: threshold.name,
      description: this.generateAlertDescription(threshold, condition, currentValue),
      source: {
        component: this.getComponentFromThreshold(threshold)
      },
      metrics: {
        currentValue,
        thresholdValue: condition.value,
        measurementUnit: this.getMetricUnit(condition.metric),
        timeWindow: condition.timeWindow
      },
      threshold,
      status: 'active',
      createdAt: new Date()
    }

    this.alerts.push(alert)

    // Send notifications
    await this.sendNotifications(alert)

    console.log(`🚨 Alert triggered: ${alert.title} - ${alert.description}`)
  }

  /**
   * Detect anomalies in performance metrics
   */
  private async detectAnomalies(): Promise<void> {
    const config: AnomalyDetectionConfig = {
      algorithm: 'iqr',
      sensitivity: 'medium',
      minDataPoints: 20,
      lookbackWindow: '24h'
    }

    const endTime = new Date()
    const startTime = this.parseTimeWindow(config.lookbackWindow, endTime)

    const anomalies = performanceAnalytics.detectAnomalies(24, {
      latencyMultiplier: this.getSensitivityMultiplier(config.sensitivity),
      errorRateThreshold: 5.0,
      costMultiplier: this.getSensitivityMultiplier(config.sensitivity)
    })

    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await this.createAnomalyAlert(anomaly)
      }
    }
  }

  /**
   * Create alert from detected anomaly
   */
  private async createAnomalyAlert(anomaly: any): Promise<void> {
    const alertId = this.generateAlertId()

    const alert: Alert = {
      id: alertId,
      type: 'anomaly_detected',
      severity: anomaly.severity as AlertSeverity,
      title: `Anomalía Detectada: ${anomaly.type}`,
      description: anomaly.description,
      source: {
        component: 'anomaly_detector'
      },
      metrics: {
        currentValue: 0, // Anomalies don't have single metric values
        thresholdValue: 0,
        measurementUnit: 'detection',
        timeWindow: '24h'
      },
      threshold: {} as AlertThreshold, // Anomalies don't use thresholds
      status: 'active',
      createdAt: new Date(),
      metadata: {
        anomalyType: anomaly.type,
        affectedOperations: anomaly.affectedOperations,
        recommendation: anomaly.recommendation
      }
    }

    this.alerts.push(alert)
    await this.sendNotifications(alert)
  }

  /**
   * Update performance baselines
   */
  private async updateBaselines(): Promise<void> {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days

    // Get unique operations
    const operations = ['generate_okr', 'analyze_performance', 'generate_insights', 'chat_completion']

    for (const operation of operations) {
      const stats = performanceAnalytics.getPerformanceStats(startTime, endTime, { operation })

      if (stats.totalRequests < 10) continue // Not enough data

      const qualityMetrics = qualityTracker.getQualityMetrics({
        operation,
        startDate: startTime,
        endDate: endTime
      })

      const avgQuality = qualityMetrics.length > 0
        ? qualityMetrics.reduce((sum, m) => sum + m.scores.overall, 0) / qualityMetrics.length
        : 0

      const baseline: PerformanceBaseline = {
        operation,
        metrics: {
          averageLatency: stats.averageLatency,
          averageQuality: avgQuality,
          averageCost: stats.averageCost,
          successRate: stats.successRate
        },
        calculatedAt: new Date(),
        sampleSize: stats.totalRequests,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Valid for 7 days
      }

      // Replace existing baseline for this operation
      this.baselines = this.baselines.filter(b => b.operation !== operation)
      this.baselines.push(baseline)
    }

    console.log(`Updated ${this.baselines.length} performance baselines`)
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert || alert.status !== 'active') return false

    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date()
    alert.acknowledgedBy = acknowledgedBy

    return true
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string, resolution: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) return false

    alert.status = 'resolved'
    alert.resolvedAt = new Date()
    alert.resolution = resolution

    return true
  }

  /**
   * Suppress alerts for a specific threshold
   */
  public suppressAlerts(thresholdId: string, durationMinutes: number): void {
    this.suppressedAlerts.add(thresholdId)

    // Auto-remove suppression after duration
    setTimeout(() => {
      this.suppressedAlerts.delete(thresholdId)
    }, durationMinutes * 60 * 1000)
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(filters?: {
    severity?: AlertSeverity
    type?: AlertType
    component?: string
  }): Alert[] {
    let filtered = this.alerts.filter(a => a.status === 'active')

    if (filters?.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity)
    }
    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type)
    }
    if (filters?.component) {
      filtered = filtered.filter(a => a.source.component === filters.component)
    }

    return filtered.sort((a, b) => {
      // Sort by severity then by time
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }

  /**
   * Get alert history
   */
  public getAlertHistory(
    startTime: Date,
    endTime: Date,
    filters?: {
      severity?: AlertSeverity
      type?: AlertType
      status?: AlertStatus
    }
  ): Alert[] {
    let filtered = this.alerts.filter(a =>
      a.createdAt >= startTime && a.createdAt <= endTime
    )

    if (filters?.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity)
    }
    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type)
    }
    if (filters?.status) {
      filtered = filtered.filter(a => a.status === filters.status)
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Get alert statistics
   */
  public getAlertStatistics(
    startTime: Date,
    endTime: Date
  ): {
    total: number
    bySeverity: Record<AlertSeverity, number>
    byType: Record<string, number>
    byStatus: Record<AlertStatus, number>
    mttr: number // Mean Time To Resolution
  } {
    const alerts = this.getAlertHistory(startTime, endTime)

    const bySeverity: Record<AlertSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    }
    const byType: Record<string, number> = {}
    const byStatus: Record<AlertStatus, number> = {
      active: 0, acknowledged: 0, resolved: 0, suppressed: 0
    }

    let totalResolutionTime = 0
    let resolvedCount = 0

    alerts.forEach(alert => {
      bySeverity[alert.severity]++
      byType[alert.type] = (byType[alert.type] || 0) + 1
      byStatus[alert.status]++

      if (alert.status === 'resolved' && alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.createdAt.getTime()
        resolvedCount++
      }
    })

    const mttr = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (60 * 1000) : 0 // in minutes

    return {
      total: alerts.length,
      bySeverity,
      byType,
      byStatus,
      mttr
    }
  }

  /**
   * Create custom alert threshold
   */
  public createThreshold(threshold: Omit<AlertThreshold, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const newThreshold: AlertThreshold = { ...threshold, id }
    this.thresholds.push(newThreshold)
    return id
  }

  /**
   * Update alert threshold
   */
  public updateThreshold(id: string, updates: Partial<AlertThreshold>): boolean {
    const threshold = this.thresholds.find(t => t.id === id)
    if (!threshold) return false

    Object.assign(threshold, updates)
    return true
  }

  /**
   * Delete alert threshold
   */
  public deleteThreshold(id: string): boolean {
    const index = this.thresholds.findIndex(t => t.id === id)
    if (index === -1) return false

    this.thresholds.splice(index, 1)
    return true
  }

  /**
   * Get all thresholds
   */
  public getThresholds(): AlertThreshold[] {
    return [...this.thresholds]
  }

  /**
   * Get performance baselines
   */
  public getBaselines(): PerformanceBaseline[] {
    return this.baselines.filter(b => b.validUntil > new Date())
  }

  // Private helper methods

  private parseTimeWindow(timeWindow: string, endTime: Date): Date {
    const match = timeWindow.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid time window format: ${timeWindow}`)

    const value = parseInt(match[1])
    const unit = match[2]

    let milliseconds: number
    switch (unit) {
      case 's': milliseconds = value * 1000; break
      case 'm': milliseconds = value * 60 * 1000; break
      case 'h': milliseconds = value * 60 * 60 * 1000; break
      case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break
      default: throw new Error(`Invalid time unit: ${unit}`)
    }

    return new Date(endTime.getTime() - milliseconds)
  }

  private parseTimeWindowToMs(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([smhd])$/)
    if (!match) throw new Error(`Invalid time window format: ${timeWindow}`)

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 's': return value * 1000
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: throw new Error(`Invalid time unit: ${unit}`)
    }
  }

  private generateAlertDescription(
    threshold: AlertThreshold,
    condition: AlertCondition,
    currentValue: number
  ): string {
    const metric = condition.metric.replace('_', ' ')
    const unit = this.getMetricUnit(condition.metric)

    switch (condition.operator) {
      case 'gt':
        return `${metric} (${currentValue}${unit}) excede el umbral de ${condition.value}${unit}`
      case 'lt':
        return `${metric} (${currentValue}${unit}) está por debajo del umbral de ${condition.value}${unit}`
      case 'change_gt':
        return `${metric} ha aumentado más del ${condition.value}% en ${condition.timeWindow}`
      case 'change_lt':
        return `${metric} ha disminuido más del ${condition.value}% en ${condition.timeWindow}`
      default:
        return `${metric} ha superado el umbral configurado`
    }
  }

  private getComponentFromThreshold(threshold: AlertThreshold): any {
    switch (threshold.type) {
      case 'performance_degradation':
      case 'error_rate_high':
        return 'performance'
      case 'quality_drop':
        return 'quality'
      case 'cost_spike':
        return 'cost'
      case 'ab_test_concern':
        return 'ab_test'
      default:
        return 'performance'
    }
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case 'average_latency': return 'ms'
      case 'total_cost':
      case 'average_cost': return '$'
      case 'average_quality':
      case 'success_rate':
      case 'error_rate': return '%'
      case 'total_requests': return ''
      default: return ''
    }
  }

  private getSensitivityMultiplier(sensitivity: 'low' | 'medium' | 'high'): number {
    switch (sensitivity) {
      case 'low': return 3.0
      case 'medium': return 2.0
      case 'high': return 1.5
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    for (const channel of alert.threshold.notificationChannels || []) {
      if (!channel.enabled) continue

      try {
        await this.sendNotification(alert, channel)
      } catch (error) {
        console.error(`Failed to send notification via ${channel.type}:`, error)
      }
    }
  }

  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`)
        break
      case 'email':
        // Implement email notification
        console.log(`📧 Email notification: ${alert.title}`)
        break
      case 'webhook':
        // Implement webhook notification
        console.log(`🔗 Webhook notification: ${alert.title}`)
        break
      case 'slack':
        // Implement Slack notification
        console.log(`💬 Slack notification: ${alert.title}`)
        break
      case 'teams':
        // Implement Teams notification
        console.log(`👥 Teams notification: ${alert.title}`)
        break
    }
  }
}

// Export singleton instance
export const alertingSystem = new AlertingSystem()

// Helper functions for external use
export function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  description: string,
  metrics?: Partial<AlertMetrics>
): string {
  const alert: Alert = {
    id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    type,
    severity,
    title,
    description,
    source: { component: 'performance' },
    metrics: {
      currentValue: 0,
      thresholdValue: 0,
      measurementUnit: '',
      timeWindow: '1h',
      ...metrics
    },
    threshold: {} as AlertThreshold,
    status: 'active',
    createdAt: new Date()
  }

  alertingSystem['alerts'].push(alert)
  return alert.id
}

export function getActiveAlertsCount(): number {
  return alertingSystem.getActiveAlerts().length
}

export function getCriticalAlertsCount(): number {
  return alertingSystem.getActiveAlerts({ severity: 'critical' }).length
}