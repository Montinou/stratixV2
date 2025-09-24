import { Pool } from 'pg';
import { performanceConfig } from '../database/pool-config';

// Connection pool metrics interface
export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  utilizationRate: number;
  timestamp: Date;
}

// Performance alerts interface
export interface PerformanceAlert {
  type: 'connection' | 'query' | 'pool';
  severity: 'warning' | 'critical';
  message: string;
  threshold: number;
  actual: number;
  timestamp: Date;
}

// Pool metrics collector
export class ConnectionPoolMetrics {
  private pool: Pool | null = null;
  private metrics: PoolMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly maxMetricsHistory = 100;
  private readonly maxAlertsHistory = 50;

  // Set the pool to monitor
  public setPool(pool: Pool): void {
    this.pool = pool;
  }

  // Collect current pool metrics
  public collectMetrics(): PoolMetrics | null {
    if (!this.pool) {
      return null;
    }

    const metrics: PoolMetrics = {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      utilizationRate: this.calculateUtilizationRate(),
      timestamp: new Date()
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance alerts
    this.checkPerformanceThresholds(metrics);

    return metrics;
  }

  // Calculate pool utilization rate
  private calculateUtilizationRate(): number {
    if (!this.pool || this.pool.totalCount === 0) {
      return 0;
    }
    return ((this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount) * 100;
  }

  // Check performance thresholds and generate alerts
  private checkPerformanceThresholds(metrics: PoolMetrics): void {
    const thresholds = performanceConfig.poolThresholds;
    const utilizationDecimal = metrics.utilizationRate / 100;

    // Check high utilization
    if (utilizationDecimal > thresholds.highUtilization) {
      const severity = utilizationDecimal > thresholds.criticalUtilization ? 'critical' : 'warning';
      this.addAlert({
        type: 'pool',
        severity,
        message: `Pool utilization is ${metrics.utilizationRate.toFixed(1)}%`,
        threshold: thresholds.highUtilization * 100,
        actual: metrics.utilizationRate,
        timestamp: new Date()
      });
    }

    // Check waiting clients
    if (metrics.waitingClients > 0) {
      this.addAlert({
        type: 'connection',
        severity: metrics.waitingClients > 5 ? 'critical' : 'warning',
        message: `${metrics.waitingClients} clients waiting for connections`,
        threshold: 0,
        actual: metrics.waitingClients,
        timestamp: new Date()
      });
    }
  }

  // Add performance alert
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }

    // Log alert
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    console[logLevel](`PERFORMANCE ALERT [${alert.type.toUpperCase()}]:`, {
      message: alert.message,
      severity: alert.severity,
      threshold: alert.threshold,
      actual: alert.actual,
      timestamp: alert.timestamp
    });
  }

  // Get recent metrics
  public getRecentMetrics(count: number = 10): PoolMetrics[] {
    return this.metrics.slice(-count);
  }

  // Get recent alerts
  public getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  // Get performance summary
  public getPerformanceSummary(): {
    currentMetrics: PoolMetrics | null;
    averageUtilization: number;
    peakUtilization: number;
    totalAlerts: number;
    criticalAlerts: number;
    recentAlerts: PerformanceAlert[];
  } {
    const currentMetrics = this.collectMetrics();
    const utilizationRates = this.metrics.map(m => m.utilizationRate);
    
    return {
      currentMetrics,
      averageUtilization: utilizationRates.length > 0 
        ? utilizationRates.reduce((sum, rate) => sum + rate, 0) / utilizationRates.length 
        : 0,
      peakUtilization: utilizationRates.length > 0 ? Math.max(...utilizationRates) : 0,
      totalAlerts: this.alerts.length,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
      recentAlerts: this.getRecentAlerts(5)
    };
  }

  // Clear all metrics and alerts
  public clearHistory(): void {
    this.metrics = [];
    this.alerts = [];
  }
}

// Performance monitoring scheduler
export class PerformanceMonitoringScheduler {
  private metricsCollector: ConnectionPoolMetrics;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(metricsCollector: ConnectionPoolMetrics) {
    this.metricsCollector = metricsCollector;
  }

  // Start periodic metrics collection
  public start(intervalMs: number = performanceConfig.metricsIntervalMs): void {
    if (this.isRunning) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.metricsCollector.collectMetrics();
    }, intervalMs);
    
    this.isRunning = true;
    console.log(`Performance monitoring started with ${intervalMs}ms interval`);
  }

  // Stop metrics collection
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Performance monitoring stopped');
  }

  // Get monitoring status
  public getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: performanceConfig.metricsIntervalMs
    };
  }
}

// Global metrics collector instance
export const poolMetricsCollector = new ConnectionPoolMetrics();
export const performanceScheduler = new PerformanceMonitoringScheduler(poolMetricsCollector);

// Utility function to get comprehensive performance report
export function getComprehensivePerformanceReport() {
  return {
    poolMetrics: poolMetricsCollector.getPerformanceSummary(),
    monitoringStatus: performanceScheduler.getStatus(),
    timestamp: new Date()
  };
}

// Export default instance for easy access
export default poolMetricsCollector;