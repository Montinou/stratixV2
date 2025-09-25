import { z } from 'zod';

// Log level enumeration
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// Sync operation types
export type SyncOperation = 'profile_sync' | 'role_assignment' | 'company_assignment' | 'conflict_resolution' | 'batch_sync' | 'health_check';

// Error categories
export type ErrorCategory = 'network' | 'validation' | 'authorization' | 'data_integrity' | 'external_service' | 'system' | 'user_error';

// Sync log entry interface
export interface SyncLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  operation: SyncOperation;
  userId?: string;
  companyId?: string;
  message: string;
  details?: any;
  error?: SyncError;
  duration?: number;
  metadata?: Record<string, any>;
}

// Enhanced error interface
export interface SyncError {
  code: string;
  category: ErrorCategory;
  message: string;
  details?: any;
  stack?: string;
  retryable: boolean;
  retryCount?: number;
  originalError?: Error;
}

// Validation schemas
const syncLogSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  operation: z.enum(['profile_sync', 'role_assignment', 'company_assignment', 'conflict_resolution', 'batch_sync', 'health_check']),
  userId: z.string().optional(),
  companyId: z.string().optional(),
  message: z.string().min(1).max(1000),
  details: z.any().optional(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Comprehensive synchronization logging service
 * Handles structured logging, error tracking, and performance monitoring
 */
export class SyncLoggingService {
  private static logs: SyncLogEntry[] = [];
  private static errorStats: Record<string, number> = {};
  private static performanceMetrics: Record<SyncOperation, number[]> = {
    profile_sync: [],
    role_assignment: [],
    company_assignment: [],
    conflict_resolution: [],
    batch_sync: [],
    health_check: [],
  };

  /**
   * Create a structured log entry
   */
  static async log(
    level: LogLevel,
    operation: SyncOperation,
    message: string,
    options: {
      userId?: string;
      companyId?: string;
      details?: any;
      error?: Error | SyncError;
      duration?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const logEntry: SyncLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        operation,
        message,
        userId: options.userId,
        companyId: options.companyId,
        details: options.details,
        duration: options.duration,
        metadata: options.metadata,
      };

      // Process error if provided
      if (options.error) {
        logEntry.error = this.processError(options.error);
        
        // Update error statistics
        const errorCode = logEntry.error.code;
        this.errorStats[errorCode] = (this.errorStats[errorCode] || 0) + 1;
      }

      // Store performance metrics
      if (options.duration !== undefined) {
        this.performanceMetrics[operation].push(options.duration);
        
        // Keep only last 1000 measurements
        if (this.performanceMetrics[operation].length > 1000) {
          this.performanceMetrics[operation] = this.performanceMetrics[operation].slice(-1000);
        }
      }

      // Store log entry
      this.logs.push(logEntry);

      // Keep only last 10000 logs in memory
      if (this.logs.length > 10000) {
        this.logs = this.logs.slice(-10000);
      }

      // Output to console with structured format
      this.outputToConsole(logEntry);

      // TODO: In production, also send to external logging service
      // await this.sendToExternalLogger(logEntry);

    } catch (error) {
      // Fallback logging to prevent logging failures from breaking the system
      console.error('Logging service error:', error);
      console.log('Original log attempt:', { level, operation, message, options });
    }
  }

  /**
   * Convenience methods for different log levels
   */
  static async debug(operation: SyncOperation, message: string, options: any = {}) {
    return this.log('debug', operation, message, options);
  }

  static async info(operation: SyncOperation, message: string, options: any = {}) {
    return this.log('info', operation, message, options);
  }

  static async warn(operation: SyncOperation, message: string, options: any = {}) {
    return this.log('warn', operation, message, options);
  }

  static async error(operation: SyncOperation, message: string, options: any = {}) {
    return this.log('error', operation, message, options);
  }

  static async critical(operation: SyncOperation, message: string, options: any = {}) {
    return this.log('critical', operation, message, options);
  }

  /**
   * Log performance timing
   */
  static async logTiming(
    operation: SyncOperation,
    startTime: number,
    message: string,
    options: any = {}
  ) {
    const duration = Date.now() - startTime;
    return this.log('info', operation, message, { ...options, duration });
  }

  /**
   * Process error into structured format
   */
  private static processError(error: Error | SyncError): SyncError {
    if ('category' in error && 'retryable' in error) {
      // Already a SyncError
      return error as SyncError;
    }

    // Convert regular Error to SyncError
    const originalError = error as Error;
    
    // Determine error category and retryability based on error message/type
    let category: ErrorCategory = 'system';
    let retryable = false;
    let code = 'UNKNOWN_ERROR';

    if (originalError.message.includes('network') || originalError.message.includes('fetch')) {
      category = 'network';
      retryable = true;
      code = 'NETWORK_ERROR';
    } else if (originalError.message.includes('validation') || originalError.message.includes('invalid')) {
      category = 'validation';
      retryable = false;
      code = 'VALIDATION_ERROR';
    } else if (originalError.message.includes('unauthorized') || originalError.message.includes('forbidden')) {
      category = 'authorization';
      retryable = false;
      code = 'AUTH_ERROR';
    } else if (originalError.message.includes('not found') || originalError.message.includes('missing')) {
      category = 'data_integrity';
      retryable = false;
      code = 'DATA_NOT_FOUND';
    } else if (originalError.message.includes('timeout')) {
      category = 'network';
      retryable = true;
      code = 'TIMEOUT_ERROR';
    }

    return {
      code,
      category,
      message: originalError.message,
      stack: originalError.stack,
      retryable,
      originalError,
    };
  }

  /**
   * Output structured log to console
   */
  private static outputToConsole(logEntry: SyncLogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const level = logEntry.level.toUpperCase().padStart(8);
    const operation = logEntry.operation.toUpperCase().padEnd(18);
    
    let consoleMethod: 'log' | 'warn' | 'error' = 'log';
    if (logEntry.level === 'warn') consoleMethod = 'warn';
    if (logEntry.level === 'error' || logEntry.level === 'critical') consoleMethod = 'error';

    const logLine = `${timestamp} [${level}] ${operation} ${logEntry.message}`;
    
    if (logEntry.error || logEntry.details || logEntry.duration !== undefined) {
      console[consoleMethod](logLine, {
        ...(logEntry.userId && { userId: logEntry.userId }),
        ...(logEntry.companyId && { companyId: logEntry.companyId }),
        ...(logEntry.duration !== undefined && { duration: `${logEntry.duration}ms` }),
        ...(logEntry.details && { details: logEntry.details }),
        ...(logEntry.error && { error: logEntry.error }),
        ...(logEntry.metadata && { metadata: logEntry.metadata }),
      });
    } else {
      console[consoleMethod](logLine);
    }
  }

  /**
   * Get recent logs with filtering
   */
  static getLogs(options: {
    level?: LogLevel;
    operation?: SyncOperation;
    userId?: string;
    companyId?: string;
    since?: Date;
    limit?: number;
  } = {}): SyncLogEntry[] {
    let filteredLogs = [...this.logs];

    if (options.level) {
      const levelOrder = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
      const minLevel = levelOrder[options.level];
      filteredLogs = filteredLogs.filter(log => levelOrder[log.level] >= minLevel);
    }

    if (options.operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === options.operation);
    }

    if (options.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === options.userId);
    }

    if (options.companyId) {
      filteredLogs = filteredLogs.filter(log => log.companyId === options.companyId);
    }

    if (options.since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    return filteredLogs;
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    errorTrends: any[];
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {
      network: 0,
      validation: 0,
      authorization: 0,
      data_integrity: 0,
      external_service: 0,
      system: 0,
      user_error: 0,
    };

    // Count errors by category
    const errorLogs = this.logs.filter(log => log.error);
    errorLogs.forEach(log => {
      if (log.error?.category) {
        errorsByCategory[log.error.category]++;
      }
    });

    return {
      totalErrors: errorLogs.length,
      errorsByCode: { ...this.errorStats },
      errorsByCategory,
      errorTrends: [], // TODO: Implement error trend analysis
    };
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): {
    operationStats: Record<SyncOperation, {
      count: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      p95Duration: number;
    }>;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const operationStats: any = {};

    for (const [operation, durations] of Object.entries(this.performanceMetrics)) {
      if (durations.length === 0) {
        operationStats[operation] = {
          count: 0,
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          p95Duration: 0,
        };
        continue;
      }

      const sortedDurations = [...durations].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedDurations.length * 0.95);

      operationStats[operation] = {
        count: durations.length,
        averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p95Duration: sortedDurations[p95Index] || 0,
      };
    }

    // Determine overall health based on error rates and performance
    const recentErrors = this.logs.filter(log => 
      log.error && log.timestamp > new Date(Date.now() - 3600000) // Last hour
    ).length;
    const recentLogs = this.logs.filter(log => 
      log.timestamp > new Date(Date.now() - 3600000)
    ).length;

    const errorRate = recentLogs > 0 ? recentErrors / recentLogs : 0;
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 0.1) overallHealth = 'unhealthy';
    else if (errorRate > 0.05) overallHealth = 'degraded';

    return {
      operationStats,
      overallHealth,
    };
  }

  /**
   * Clear old logs (cleanup method)
   */
  static cleanup(options: { olderThan?: Date; keepLast?: number } = {}): number {
    const initialCount = this.logs.length;

    if (options.olderThan) {
      this.logs = this.logs.filter(log => log.timestamp >= options.olderThan!);
    }

    if (options.keepLast && options.keepLast > 0) {
      this.logs = this.logs.slice(-options.keepLast);
    }

    return initialCount - this.logs.length;
  }

  /**
   * Export logs for analysis
   */
  static exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      // TODO: Implement CSV export
      throw new Error('CSV export not implemented yet');
    }

    return JSON.stringify(this.logs, null, 2);
  }
}