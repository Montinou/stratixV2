/**
 * Performance Monitoring & Analytics System for Onboarding Infrastructure
 * Comprehensive monitoring, metrics collection, and analytics for the onboarding process
 * with Vercel Analytics integration and real-time performance tracking
 */

import { Analytics } from '@vercel/analytics';
import { track } from '@vercel/analytics/server';
import { onboardingCache } from '@/lib/cache/redis';
import { getCacheMetrics } from '@/lib/cache/edge-config';
import { dbHealthCheck } from './health-checks';
import { getRedisClient } from '@/lib/redis/client';

export interface OnboardingMetrics {
  sessionMetrics: SessionMetrics;
  performanceMetrics: PerformanceMetrics;
  userExperienceMetrics: UXMetrics;
  systemMetrics: SystemMetrics;
  aiMetrics: AIMetrics;
  conversionMetrics: ConversionMetrics;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  averageSessionDuration: number;
  averageStepsCompleted: number;
  sessionsByDevice: Record<string, number>;
  sessionsByLocation: Record<string, number>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  latencyPercentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  slowRequestCount: number;
  systemLoad: {
    cpu: number;
    memory: number;
    redis: number;
    database: number;
  };
}

export interface UXMetrics {
  stepCompletionRates: Record<number, number>;
  stepAbandonmentRates: Record<number, number>;
  averageTimePerStep: Record<number, number>;
  backNavigationRate: number;
  errorEncounters: Record<string, number>;
  userSatisfactionScore: number;
  helpRequestRate: number;
  featureUsageRates: Record<string, number>;
}

export interface SystemMetrics {
  infrastructure: {
    redisHealth: any;
    databaseHealth: any;
    edgeConfigHealth: any;
    vercelStatus: any;
  };
  caching: {
    l1HitRate: number;
    l2HitRate: number;
    l3HitRate: number;
    totalCacheSize: number;
    evictionRate: number;
  };
  api: {
    requestVolume: number;
    responseTime: number;
    errorCount: number;
    rateLimitHits: number;
  };
}

export interface AIMetrics {
  requestCount: number;
  responseTime: number;
  cacheHitRate: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  modelUsage: Record<string, number>;
  successRate: number;
  personalizationEffectiveness: number;
}

export interface ConversionMetrics {
  overallCompletionRate: number;
  stepwiseConversionRate: Record<number, number>;
  timeToComplete: number;
  dropOffPoints: Record<number, number>;
  recoveryRate: number;
  cohortAnalysis: {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
}

export interface PerformanceEvent {
  eventType: 'session_start' | 'step_complete' | 'step_error' | 'session_complete' | 'session_abandon' | 'ai_request' | 'cache_miss' | 'slow_response';
  sessionId: string;
  userId: string;
  timestamp: number;
  duration?: number;
  stepNumber?: number;
  data?: Record<string, any>;
  metadata?: {
    userAgent: string;
    location?: string;
    device?: string;
    source?: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
}

export class OnboardingAnalytics {
  private static instance: OnboardingAnalytics;
  private metrics: OnboardingMetrics;
  private events: PerformanceEvent[] = [];
  private alertRules: AlertRule[] = [];
  private metricBuffers = new Map<string, any[]>();
  private startTime = Date.now();

  private constructor() {
    this.initializeMetrics();
    this.setupDefaultAlerts();
    this.startMetricsCollection();
  }

  public static getInstance(): OnboardingAnalytics {
    if (!OnboardingAnalytics.instance) {
      OnboardingAnalytics.instance = new OnboardingAnalytics();
    }
    return OnboardingAnalytics.instance;
  }

  private initializeMetrics(): void {
    this.metrics = {
      sessionMetrics: {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        abandonedSessions: 0,
        averageSessionDuration: 0,
        averageStepsCompleted: 0,
        sessionsByDevice: {},
        sessionsByLocation: {}
      },
      performanceMetrics: {
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughput: 0,
        latencyPercentiles: { p50: 0, p90: 0, p95: 0, p99: 0 },
        slowRequestCount: 0,
        systemLoad: { cpu: 0, memory: 0, redis: 0, database: 0 }
      },
      userExperienceMetrics: {
        stepCompletionRates: {},
        stepAbandonmentRates: {},
        averageTimePerStep: {},
        backNavigationRate: 0,
        errorEncounters: {},
        userSatisfactionScore: 0,
        helpRequestRate: 0,
        featureUsageRates: {}
      },
      systemMetrics: {
        infrastructure: {
          redisHealth: null,
          databaseHealth: null,
          edgeConfigHealth: null,
          vercelStatus: null
        },
        caching: {
          l1HitRate: 0,
          l2HitRate: 0,
          l3HitRate: 0,
          totalCacheSize: 0,
          evictionRate: 0
        },
        api: {
          requestVolume: 0,
          responseTime: 0,
          errorCount: 0,
          rateLimitHits: 0
        }
      },
      aiMetrics: {
        requestCount: 0,
        responseTime: 0,
        cacheHitRate: 0,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0
        },
        modelUsage: {},
        successRate: 0,
        personalizationEffectiveness: 0
      },
      conversionMetrics: {
        overallCompletionRate: 0,
        stepwiseConversionRate: {},
        timeToComplete: 0,
        dropOffPoints: {},
        recoveryRate: 0,
        cohortAnalysis: {
          daily: {},
          weekly: {},
          monthly: {}
        }
      }
    };
  }

  /**
   * Event Tracking Methods
   */

  /**
   * Track onboarding session start
   */
  public async trackSessionStart(
    sessionId: string,
    userId: string,
    metadata: PerformanceEvent['metadata']
  ): Promise<void> {
    try {
      const event: PerformanceEvent = {
        eventType: 'session_start',
        sessionId,
        userId,
        timestamp: Date.now(),
        metadata
      };

      await this.recordEvent(event);
      this.metrics.sessionMetrics.totalSessions++;
      this.metrics.sessionMetrics.activeSessions++;

      // Track with Vercel Analytics
      await track('onboarding_session_start', {
        sessionId,
        userId,
        device: metadata?.device,
        location: metadata?.location,
        source: metadata?.source
      });

      console.debug(`Session start tracked: ${sessionId}`);
    } catch (error) {
      console.error('Failed to track session start:', error);
    }
  }

  /**
   * Track step completion
   */
  public async trackStepComplete(
    sessionId: string,
    userId: string,
    stepNumber: number,
    duration: number,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const event: PerformanceEvent = {
        eventType: 'step_complete',
        sessionId,
        userId,
        stepNumber,
        duration,
        timestamp: Date.now(),
        data
      };

      await this.recordEvent(event);

      // Update step metrics
      this.updateStepMetrics(stepNumber, duration, true);

      // Track with Vercel Analytics
      await track('onboarding_step_complete', {
        sessionId,
        userId,
        stepNumber,
        duration,
        stepName: data?.stepName
      });

      console.debug(`Step completion tracked: ${stepNumber} for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to track step completion:', error);
    }
  }

  /**
   * Track step error
   */
  public async trackStepError(
    sessionId: string,
    userId: string,
    stepNumber: number,
    error: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const event: PerformanceEvent = {
        eventType: 'step_error',
        sessionId,
        userId,
        stepNumber,
        timestamp: Date.now(),
        data: { error, ...data }
      };

      await this.recordEvent(event);

      // Update error metrics
      this.metrics.userExperienceMetrics.errorEncounters[error] =
        (this.metrics.userExperienceMetrics.errorEncounters[error] || 0) + 1;

      // Track with Vercel Analytics
      await track('onboarding_step_error', {
        sessionId,
        userId,
        stepNumber,
        error,
        errorType: data?.errorType
      });

      console.debug(`Step error tracked: ${error} at step ${stepNumber}`);
    } catch (error) {
      console.error('Failed to track step error:', error);
    }
  }

  /**
   * Track session completion
   */
  public async trackSessionComplete(
    sessionId: string,
    userId: string,
    totalDuration: number,
    completedSteps: number[]
  ): Promise<void> {
    try {
      const event: PerformanceEvent = {
        eventType: 'session_complete',
        sessionId,
        userId,
        duration: totalDuration,
        timestamp: Date.now(),
        data: { completedSteps, stepsCompleted: completedSteps.length }
      };

      await this.recordEvent(event);

      // Update session metrics
      this.metrics.sessionMetrics.completedSessions++;
      this.metrics.sessionMetrics.activeSessions = Math.max(0, this.metrics.sessionMetrics.activeSessions - 1);
      this.updateSessionDurationMetrics(totalDuration);
      this.updateCompletionMetrics(completedSteps);

      // Track with Vercel Analytics
      await track('onboarding_session_complete', {
        sessionId,
        userId,
        totalDuration,
        stepsCompleted: completedSteps.length,
        completionRate: (completedSteps.length / 5) * 100
      });

      console.debug(`Session completion tracked: ${sessionId}, duration: ${totalDuration}ms`);
    } catch (error) {
      console.error('Failed to track session completion:', error);
    }
  }

  /**
   * Track AI request metrics
   */
  public async trackAIRequest(
    sessionId: string,
    userId: string,
    model: string,
    duration: number,
    tokenUsage: AIMetrics['tokenUsage'],
    success: boolean,
    cached: boolean = false
  ): Promise<void> {
    try {
      const event: PerformanceEvent = {
        eventType: 'ai_request',
        sessionId,
        userId,
        duration,
        timestamp: Date.now(),
        data: { model, tokenUsage, success, cached }
      };

      await this.recordEvent(event);

      // Update AI metrics
      this.metrics.aiMetrics.requestCount++;
      this.metrics.aiMetrics.modelUsage[model] = (this.metrics.aiMetrics.modelUsage[model] || 0) + 1;

      if (success) {
        this.updateAIMetrics(duration, tokenUsage, cached);
      }

      // Track with Vercel Analytics
      await track('ai_request', {
        sessionId,
        userId,
        model,
        duration,
        success,
        cached,
        tokenUsage: tokenUsage.totalTokens
      });

      console.debug(`AI request tracked: ${model}, duration: ${duration}ms, cached: ${cached}`);
    } catch (error) {
      console.error('Failed to track AI request:', error);
    }
  }

  /**
   * Performance Monitoring Methods
   */

  /**
   * Record performance event
   */
  private async recordEvent(event: PerformanceEvent): Promise<void> {
    try {
      // Store in memory buffer
      this.events.push(event);

      // Keep only last 10000 events to prevent memory issues
      if (this.events.length > 10000) {
        this.events = this.events.slice(-5000);
      }

      // Cache event for persistence
      await onboardingCache.cachePersonalizedContent(
        'system',
        0,
        'ai_hints',
        event,
        'low'
      );

      // Check alert conditions
      await this.checkAlerts(event);
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }

  /**
   * Update step completion metrics
   */
  private updateStepMetrics(stepNumber: number, duration: number, completed: boolean): void {
    if (completed) {
      // Update completion rate
      const currentCount = this.metrics.userExperienceMetrics.stepCompletionRates[stepNumber] || 0;
      this.metrics.userExperienceMetrics.stepCompletionRates[stepNumber] = currentCount + 1;

      // Update average time per step
      const currentAvg = this.metrics.userExperienceMetrics.averageTimePerStep[stepNumber] || 0;
      const currentCompletions = currentCount + 1;
      this.metrics.userExperienceMetrics.averageTimePerStep[stepNumber] =
        ((currentAvg * currentCount) + duration) / currentCompletions;
    }
  }

  /**
   * Update session duration metrics
   */
  private updateSessionDurationMetrics(duration: number): void {
    const totalSessions = this.metrics.sessionMetrics.totalSessions;
    const currentAvg = this.metrics.sessionMetrics.averageSessionDuration;

    this.metrics.sessionMetrics.averageSessionDuration =
      ((currentAvg * (totalSessions - 1)) + duration) / totalSessions;
  }

  /**
   * Update completion metrics
   */
  private updateCompletionMetrics(completedSteps: number[]): void {
    const completionRate = (completedSteps.length / 5) * 100;
    const totalCompleted = this.metrics.sessionMetrics.completedSessions;
    const currentRate = this.metrics.conversionMetrics.overallCompletionRate;

    this.metrics.conversionMetrics.overallCompletionRate =
      ((currentRate * (totalCompleted - 1)) + completionRate) / totalCompleted;
  }

  /**
   * Update AI metrics
   */
  private updateAIMetrics(
    duration: number,
    tokenUsage: AIMetrics['tokenUsage'],
    cached: boolean
  ): void {
    const requestCount = this.metrics.aiMetrics.requestCount;
    const currentAvg = this.metrics.aiMetrics.responseTime;

    // Update average response time
    this.metrics.aiMetrics.responseTime =
      ((currentAvg * (requestCount - 1)) + duration) / requestCount;

    // Update token usage
    this.metrics.aiMetrics.tokenUsage.promptTokens += tokenUsage.promptTokens;
    this.metrics.aiMetrics.tokenUsage.completionTokens += tokenUsage.completionTokens;
    this.metrics.aiMetrics.tokenUsage.totalTokens += tokenUsage.totalTokens;
    this.metrics.aiMetrics.tokenUsage.cost += tokenUsage.cost;

    // Update cache hit rate
    if (cached) {
      const currentHitRate = this.metrics.aiMetrics.cacheHitRate;
      this.metrics.aiMetrics.cacheHitRate =
        ((currentHitRate * (requestCount - 1)) + 100) / requestCount;
    } else {
      const currentHitRate = this.metrics.aiMetrics.cacheHitRate;
      this.metrics.aiMetrics.cacheHitRate =
        (currentHitRate * (requestCount - 1)) / requestCount;
    }
  }

  /**
   * System Metrics Collection
   */

  /**
   * Collect system metrics
   */
  public async collectSystemMetrics(): Promise<void> {
    try {
      // Collect cache metrics
      await this.collectCacheMetrics();

      // Collect infrastructure health
      await this.collectInfrastructureHealth();

      // Collect performance metrics
      await this.collectPerformanceMetrics();

      console.debug('System metrics collected successfully');
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Collect cache metrics
   */
  private async collectCacheMetrics(): Promise<void> {
    try {
      // Edge Config metrics
      const edgeMetrics = getCacheMetrics();

      // Redis cache metrics
      const cacheStats = await onboardingCache.getCacheStats();

      this.metrics.systemMetrics.caching = {
        l1HitRate: cacheStats.stats?.l1?.hitRate || 0,
        l2HitRate: cacheStats.stats?.l2?.hitRate || 0,
        l3HitRate: cacheStats.stats?.l3?.hitRate || 0,
        totalCacheSize: cacheStats.stats?.l1?.size || 0,
        evictionRate: 0 // Calculate based on monitoring data
      };
    } catch (error) {
      console.error('Failed to collect cache metrics:', error);
    }
  }

  /**
   * Collect infrastructure health
   */
  private async collectInfrastructureHealth(): Promise<void> {
    try {
      // Redis health
      const redisHealth = await onboardingCache.healthCheck();

      // Database health
      const dbHealth = await dbHealthCheck.performHealthCheck();

      // Edge Config health (from cache metrics)
      const edgeHealth = getCacheMetrics();

      this.metrics.systemMetrics.infrastructure = {
        redisHealth: redisHealth,
        databaseHealth: dbHealth,
        edgeConfigHealth: edgeHealth,
        vercelStatus: { status: 'operational' } // Would integrate with Vercel API
      };
    } catch (error) {
      console.error('Failed to collect infrastructure health:', error);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Calculate metrics from events
      const recentEvents = this.events.filter(e =>
        e.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
      );

      if (recentEvents.length > 0) {
        const durations = recentEvents
          .filter(e => e.duration)
          .map(e => e.duration!)
          .sort((a, b) => a - b);

        if (durations.length > 0) {
          this.metrics.performanceMetrics.latencyPercentiles = {
            p50: this.percentile(durations, 0.5),
            p90: this.percentile(durations, 0.9),
            p95: this.percentile(durations, 0.95),
            p99: this.percentile(durations, 0.99)
          };

          this.metrics.performanceMetrics.averageResponseTime =
            durations.reduce((a, b) => a + b, 0) / durations.length;

          this.metrics.performanceMetrics.slowRequestCount =
            durations.filter(d => d > 2000).length;
        }

        // Calculate throughput (requests per minute)
        this.metrics.performanceMetrics.throughput =
          (recentEvents.length / 5) * 60;

        // Calculate error rate
        const errorEvents = recentEvents.filter(e => e.eventType === 'step_error');
        this.metrics.performanceMetrics.errorRate =
          (errorEvents.length / recentEvents.length) * 100;
      }
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Alert System
   */

  /**
   * Setup default alert rules
   */
  private setupDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'error_rate > threshold',
        threshold: 5, // 5%
        severity: 'high',
        enabled: true,
        notification: { email: ['alerts@example.com'] }
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        condition: 'avg_response_time > threshold',
        threshold: 2000, // 2 seconds
        severity: 'medium',
        enabled: true,
        notification: { email: ['alerts@example.com'] }
      },
      {
        id: 'high_abandonment_rate',
        name: 'High Session Abandonment',
        condition: 'abandonment_rate > threshold',
        threshold: 50, // 50%
        severity: 'medium',
        enabled: true,
        notification: { email: ['alerts@example.com'] }
      },
      {
        id: 'cache_performance',
        name: 'Low Cache Hit Rate',
        condition: 'cache_hit_rate < threshold',
        threshold: 70, // 70%
        severity: 'low',
        enabled: true,
        notification: { email: ['alerts@example.com'] }
      }
    ];
  }

  /**
   * Check alert conditions
   */
  private async checkAlerts(event: PerformanceEvent): Promise<void> {
    try {
      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        const shouldAlert = await this.evaluateAlertCondition(rule, event);
        if (shouldAlert) {
          await this.sendAlert(rule, event);
        }
      }
    } catch (error) {
      console.error('Failed to check alerts:', error);
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(rule: AlertRule, event: PerformanceEvent): Promise<boolean> {
    try {
      switch (rule.id) {
        case 'high_error_rate':
          return this.metrics.performanceMetrics.errorRate > rule.threshold;

        case 'slow_response_time':
          return this.metrics.performanceMetrics.averageResponseTime > rule.threshold;

        case 'high_abandonment_rate':
          const totalSessions = this.metrics.sessionMetrics.totalSessions;
          const abandonmentRate = totalSessions > 0
            ? (this.metrics.sessionMetrics.abandonedSessions / totalSessions) * 100
            : 0;
          return abandonmentRate > rule.threshold;

        case 'cache_performance':
          return this.metrics.systemMetrics.caching.l2HitRate < rule.threshold;

        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to evaluate alert condition:', error);
      return false;
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(rule: AlertRule, event: PerformanceEvent): Promise<void> {
    try {
      const alertData = {
        rule: rule.name,
        severity: rule.severity,
        threshold: rule.threshold,
        currentValue: await this.getCurrentMetricValue(rule.id),
        event,
        timestamp: new Date().toISOString()
      };

      console.warn(`ALERT: ${rule.name}`, alertData);

      // Track alert with Vercel Analytics
      await track('system_alert', {
        alertId: rule.id,
        severity: rule.severity,
        ...alertData
      });

      // Here you would implement actual notification sending
      // (Slack, email, webhook, etc.)
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Get current metric value for alert
   */
  private async getCurrentMetricValue(alertId: string): Promise<number> {
    switch (alertId) {
      case 'high_error_rate':
        return this.metrics.performanceMetrics.errorRate;
      case 'slow_response_time':
        return this.metrics.performanceMetrics.averageResponseTime;
      case 'high_abandonment_rate':
        const totalSessions = this.metrics.sessionMetrics.totalSessions;
        return totalSessions > 0
          ? (this.metrics.sessionMetrics.abandonedSessions / totalSessions) * 100
          : 0;
      case 'cache_performance':
        return this.metrics.systemMetrics.caching.l2HitRate;
      default:
        return 0;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const index = (values.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return values[lower];
    }

    return values[lower] * (upper - index) + values[upper] * (index - lower);
  }

  /**
   * Start automatic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60 * 1000);

    // Process event buffers every 30 seconds
    setInterval(() => {
      this.processEventBuffers();
    }, 30 * 1000);
  }

  /**
   * Process event buffers
   */
  private processEventBuffers(): void {
    try {
      // Process any buffered metrics
      for (const [key, buffer] of this.metricBuffers) {
        if (buffer.length > 0) {
          console.debug(`Processing ${buffer.length} buffered events for ${key}`);
          // Process buffer based on key type
          this.metricBuffers.set(key, []);
        }
      }
    } catch (error) {
      console.error('Failed to process event buffers:', error);
    }
  }

  /**
   * Public API Methods
   */

  /**
   * Get current metrics
   */
  public getMetrics(): OnboardingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  public getRecentEvents(minutes: number = 5): PerformanceEvent[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.events.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Export metrics for external systems
   */
  public async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    try {
      if (format === 'json') {
        return JSON.stringify(this.metrics, null, 2);
      }

      // Prometheus format
      const prometheus = this.convertToPrometheus(this.metrics);
      return prometheus;
    } catch (error) {
      console.error('Failed to export metrics:', error);
      return '';
    }
  }

  /**
   * Convert metrics to Prometheus format
   */
  private convertToPrometheus(metrics: OnboardingMetrics): string {
    const lines: string[] = [];

    // Session metrics
    lines.push(`onboarding_total_sessions ${metrics.sessionMetrics.totalSessions}`);
    lines.push(`onboarding_active_sessions ${metrics.sessionMetrics.activeSessions}`);
    lines.push(`onboarding_completed_sessions ${metrics.sessionMetrics.completedSessions}`);
    lines.push(`onboarding_average_duration ${metrics.sessionMetrics.averageSessionDuration}`);

    // Performance metrics
    lines.push(`onboarding_response_time ${metrics.performanceMetrics.averageResponseTime}`);
    lines.push(`onboarding_error_rate ${metrics.performanceMetrics.errorRate}`);
    lines.push(`onboarding_cache_hit_rate ${metrics.performanceMetrics.cacheHitRate}`);

    // AI metrics
    lines.push(`onboarding_ai_requests ${metrics.aiMetrics.requestCount}`);
    lines.push(`onboarding_ai_response_time ${metrics.aiMetrics.responseTime}`);
    lines.push(`onboarding_ai_tokens_total ${metrics.aiMetrics.tokenUsage.totalTokens}`);

    return lines.join('\n');
  }

  /**
   * Health check for analytics system
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const checks = {
        eventBufferSize: this.events.length,
        metricsCollectionRunning: true,
        alertsConfigured: this.alertRules.length,
        systemMetricsHealth: this.metrics.systemMetrics.infrastructure
      };

      const isHealthy =
        this.events.length < 8000 && // Event buffer not too large
        checks.alertsConfigured > 0; // Alerts are configured

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: checks
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const analytics = OnboardingAnalytics.getInstance();