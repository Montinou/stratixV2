import { Pool, QueryResult } from 'pg';
import { dbLogger, LogLevel } from '../logging/database-logger';
import { DatabaseErrorHandler, DatabaseError, DatabaseErrorCode } from '../errors/database-errors';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  responseTime: number;
  message?: string;
  metadata?: Record<string, any>;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  usedConnections: number;
  utilizationPercentage: number;
  status: HealthStatus;
}

export interface DatabaseMetrics {
  connectionPool: ConnectionPoolMetrics;
  queryPerformance: QueryPerformanceMetrics;
  availability: AvailabilityMetrics;
  lastHealthCheck: Date;
  overallStatus: HealthStatus;
}

export interface QueryPerformanceMetrics {
  averageQueryTime: number;
  slowQueryCount: number;
  failedQueryCount: number;
  totalQueries: number;
  successRate: number;
}

export interface AvailabilityMetrics {
  uptime: number;
  lastDowntime?: Date;
  downtimeCount: number;
  connectionFailures: number;
  lastConnectionFailure?: Date;
}

export class DatabaseHealthCheck {
  private static instance: DatabaseHealthCheck;
  private pool: Pool | null = null;
  private metrics: DatabaseMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly slowQueryThreshold: number;
  private readonly unhealthyThresholds = {
    poolUtilization: 90, // percentage
    avgQueryTime: 5000, // milliseconds
    failureRate: 10 // percentage
  };

  private constructor() {
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10);
    this.initializeMetrics();
  }

  public static getInstance(): DatabaseHealthCheck {
    if (!DatabaseHealthCheck.instance) {
      DatabaseHealthCheck.instance = new DatabaseHealthCheck();
    }
    return DatabaseHealthCheck.instance;
  }

  private initializeMetrics(): void {
    this.metrics = {
      connectionPool: {
        totalConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        usedConnections: 0,
        utilizationPercentage: 0,
        status: HealthStatus.UNKNOWN
      },
      queryPerformance: {
        averageQueryTime: 0,
        slowQueryCount: 0,
        failedQueryCount: 0,
        totalQueries: 0,
        successRate: 100
      },
      availability: {
        uptime: 0,
        downtimeCount: 0,
        connectionFailures: 0
      },
      lastHealthCheck: new Date(),
      overallStatus: HealthStatus.UNKNOWN
    };
  }

  public setPool(pool: Pool): void {
    this.pool = pool;
    this.setupPoolEventListeners();
  }

  private setupPoolEventListeners(): void {
    if (!this.pool) return;

    this.pool.on('connect', (client) => {
      dbLogger.logConnectionEvent('connect', {
        totalCount: this.pool?.totalCount,
        idleCount: this.pool?.idleCount
      });
    });

    this.pool.on('remove', (client) => {
      dbLogger.logConnectionEvent('remove', {
        totalCount: this.pool?.totalCount,
        idleCount: this.pool?.idleCount
      });
    });

    this.pool.on('error', (err) => {
      this.metrics.availability.connectionFailures++;
      this.metrics.availability.lastConnectionFailure = new Date();
      
      dbLogger.logConnectionEvent('error', {
        error: err.message,
        connectionFailures: this.metrics.availability.connectionFailures
      });
    });
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await this.checkDatabaseConnection();
      await this.updatePoolMetrics();
      await this.checkQueryPerformance();
      
      const responseTime = Date.now() - startTime;
      const overallStatus = this.calculateOverallStatus();
      
      this.metrics.lastHealthCheck = new Date();
      this.metrics.overallStatus = overallStatus;

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date(),
        responseTime,
        message: this.getStatusMessage(overallStatus),
        metadata: {
          connectionPool: this.metrics.connectionPool,
          queryPerformance: this.metrics.queryPerformance,
          availability: this.metrics.availability
        }
      };

      dbLogger.log({
        operation: {
          operation: 'health_check',
          duration: responseTime,
          timestamp: new Date()
        },
        level: overallStatus === HealthStatus.HEALTHY ? LogLevel.DEBUG : LogLevel.WARN,
        metadata: { healthCheckResult: result }
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime,
        message: `Health check failed: ${(error as Error).message}`,
        metadata: { error: (error as Error).message }
      };

      dbLogger.logError('health_check_failed', error as Error);
      
      return result;
    }
  }

  private async checkDatabaseConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const context = DatabaseErrorHandler.createContext('health_check_connection');
    
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1 as health_check');
      } finally {
        client.release();
      }
    } catch (error) {
      throw DatabaseErrorHandler.handleError(error as Error, context);
    }
  }

  private async updatePoolMetrics(): Promise<void> {
    if (!this.pool) return;

    const totalConnections = this.pool.totalCount;
    const idleConnections = this.pool.idleCount;
    const waitingClients = this.pool.waitingCount;
    const usedConnections = totalConnections - idleConnections;
    const utilizationPercentage = totalConnections > 0 
      ? Math.round((usedConnections / totalConnections) * 100) 
      : 0;

    this.metrics.connectionPool = {
      totalConnections,
      idleConnections,
      waitingClients,
      usedConnections,
      utilizationPercentage,
      status: this.getPoolHealthStatus(utilizationPercentage, waitingClients)
    };

    dbLogger.logPoolMetrics(this.pool);
  }

  private getPoolHealthStatus(utilizationPercentage: number, waitingClients: number): HealthStatus {
    if (utilizationPercentage >= this.unhealthyThresholds.poolUtilization || waitingClients > 0) {
      return HealthStatus.UNHEALTHY;
    }
    if (utilizationPercentage >= 70) {
      return HealthStatus.DEGRADED;
    }
    return HealthStatus.HEALTHY;
  }

  private async checkQueryPerformance(): Promise<void> {
    // This would typically query performance statistics from the database
    // For now, we'll use the metrics we've been collecting
    const totalQueries = this.metrics.queryPerformance.totalQueries;
    const failedQueries = this.metrics.queryPerformance.failedQueryCount;
    
    if (totalQueries > 0) {
      this.metrics.queryPerformance.successRate = 
        Math.round(((totalQueries - failedQueries) / totalQueries) * 100);
    }
  }

  private calculateOverallStatus(): HealthStatus {
    const poolStatus = this.metrics.connectionPool.status;
    const successRate = this.metrics.queryPerformance.successRate;
    const avgQueryTime = this.metrics.queryPerformance.averageQueryTime;

    // If pool is unhealthy, overall status is unhealthy
    if (poolStatus === HealthStatus.UNHEALTHY) {
      return HealthStatus.UNHEALTHY;
    }

    // Check query performance thresholds
    if (successRate < (100 - this.unhealthyThresholds.failureRate) ||
        avgQueryTime > this.unhealthyThresholds.avgQueryTime) {
      return HealthStatus.UNHEALTHY;
    }

    // Check for degraded performance
    if (poolStatus === HealthStatus.DEGRADED ||
        successRate < 95 ||
        avgQueryTime > this.slowQueryThreshold) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  private getStatusMessage(status: HealthStatus): string {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'Database is operating normally';
      case HealthStatus.DEGRADED:
        return 'Database is experiencing reduced performance';
      case HealthStatus.UNHEALTHY:
        return 'Database is experiencing critical issues';
      default:
        return 'Database status unknown';
    }
  }

  public recordQueryMetrics(duration: number, success: boolean): void {
    this.metrics.queryPerformance.totalQueries++;
    
    if (success) {
      // Update running average
      const totalQueries = this.metrics.queryPerformance.totalQueries;
      const currentAvg = this.metrics.queryPerformance.averageQueryTime;
      this.metrics.queryPerformance.averageQueryTime = 
        ((currentAvg * (totalQueries - 1)) + duration) / totalQueries;
        
      if (duration > this.slowQueryThreshold) {
        this.metrics.queryPerformance.slowQueryCount++;
      }
    } else {
      this.metrics.queryPerformance.failedQueryCount++;
    }
  }

  public getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  public startPeriodicHealthChecks(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        dbLogger.logError('periodic_health_check_failed', error as Error);
      }
    }, intervalMs);

    dbLogger.log({
      operation: {
        operation: 'health_check_scheduler_started',
        timestamp: new Date()
      },
      level: LogLevel.INFO,
      metadata: { intervalMs }
    });
  }

  public stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      
      dbLogger.log({
        operation: {
          operation: 'health_check_scheduler_stopped',
          timestamp: new Date()
        },
        level: LogLevel.INFO
      });
    }
  }

  public async generateHealthReport(): Promise<{
    summary: string;
    status: HealthStatus;
    details: DatabaseMetrics;
    recommendations: string[];
  }> {
    const healthCheck = await this.performHealthCheck();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (this.metrics.connectionPool.utilizationPercentage > 80) {
      recommendations.push('Consider increasing connection pool size');
    }

    if (this.metrics.queryPerformance.averageQueryTime > this.slowQueryThreshold) {
      recommendations.push('Investigate slow queries and consider query optimization');
    }

    if (this.metrics.queryPerformance.successRate < 95) {
      recommendations.push('High failure rate detected - review error logs and fix failing queries');
    }

    if (this.metrics.availability.connectionFailures > 0) {
      recommendations.push('Connection failures detected - check network and database server health');
    }

    return {
      summary: this.generateSummary(),
      status: healthCheck.status,
      details: this.metrics,
      recommendations
    };
  }

  private generateSummary(): string {
    const pool = this.metrics.connectionPool;
    const perf = this.metrics.queryPerformance;
    
    return `Connection Pool: ${pool.usedConnections}/${pool.totalConnections} used (${pool.utilizationPercentage}%), ` +
           `Query Performance: ${perf.successRate}% success rate, ${perf.averageQueryTime.toFixed(2)}ms avg response time`;
  }
}

// Export singleton instance
export const dbHealthCheck = DatabaseHealthCheck.getInstance();

// Utility functions for monitoring
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const result = await dbHealthCheck.performHealthCheck();
    return result.status !== HealthStatus.UNHEALTHY;
  } catch {
    return false;
  }
}

export function isHealthy(status: HealthStatus): boolean {
  return status === HealthStatus.HEALTHY;
}

export function isDegraded(status: HealthStatus): boolean {
  return status === HealthStatus.DEGRADED;
}

export function isUnhealthy(status: HealthStatus): boolean {
  return status === HealthStatus.UNHEALTHY;
}