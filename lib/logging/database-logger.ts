import { Pool, QueryResult } from 'pg';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface DatabaseOperation {
  operation: string;
  query?: string;
  params?: any[];
  duration?: number;
  rows?: number;
  connectionId?: string;
  timestamp: Date;
}

export interface LogContext {
  operation: DatabaseOperation;
  level: LogLevel;
  error?: Error;
  metadata?: Record<string, any>;
}

export class DatabaseLogger {
  private static instance: DatabaseLogger;
  private readonly enabledLevels: Set<LogLevel>;

  private constructor() {
    // Configure which log levels are enabled based on environment
    const logLevel = process.env.LOG_LEVEL || 'info';
    this.enabledLevels = this.getEnabledLevels(logLevel);
  }

  public static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }

  private getEnabledLevels(logLevel: string): Set<LogLevel> {
    const levels = new Set<LogLevel>();
    const levelOrder = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const startIndex = levelOrder.indexOf(logLevel as LogLevel);
    
    if (startIndex >= 0) {
      for (let i = startIndex; i < levelOrder.length; i++) {
        levels.add(levelOrder[i]);
      }
    } else {
      // Default to info and above if invalid log level
      levels.add(LogLevel.INFO);
      levels.add(LogLevel.WARN);
      levels.add(LogLevel.ERROR);
      levels.add(LogLevel.CRITICAL);
    }
    
    return levels;
  }

  private formatLogEntry(context: LogContext): string {
    const {
      operation: { operation, query, params, duration, rows, connectionId, timestamp },
      level,
      error,
      metadata = {}
    } = context;

    const logEntry = {
      timestamp: timestamp.toISOString(),
      level,
      operation,
      ...(query && { query: this.sanitizeQuery(query) }),
      ...(params && { paramCount: params.length }),
      ...(duration !== undefined && { duration: `${duration}ms` }),
      ...(rows !== undefined && { rowsAffected: rows }),
      ...(connectionId && { connectionId }),
      ...(error && { 
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }),
      ...metadata
    };

    return JSON.stringify(logEntry);
  }

  private sanitizeQuery(query: string): string {
    // Remove or mask sensitive information in queries
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }

  public log(context: LogContext): void {
    if (!this.enabledLevels.has(context.level)) {
      return;
    }

    const logMessage = this.formatLogEntry(context);
    
    switch (context.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        break;
    }
  }

  public logQuery(operation: string, query: string, params?: any[], startTime?: number): void {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    this.log({
      operation: {
        operation,
        query,
        params,
        duration,
        timestamp: new Date()
      },
      level: LogLevel.INFO
    });
  }

  public logQueryResult(operation: string, result: QueryResult, startTime?: number): void {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    this.log({
      operation: {
        operation,
        duration,
        rows: result.rowCount || 0,
        timestamp: new Date()
      },
      level: LogLevel.DEBUG
    });
  }

  public logError(operation: string, error: Error, query?: string, params?: any[]): void {
    this.log({
      operation: {
        operation,
        query,
        params,
        timestamp: new Date()
      },
      level: LogLevel.ERROR,
      error
    });
  }

  public logConnectionEvent(event: string, metadata?: Record<string, any>): void {
    this.log({
      operation: {
        operation: `connection_${event}`,
        timestamp: new Date()
      },
      level: event === 'error' ? LogLevel.ERROR : LogLevel.INFO,
      metadata
    });
  }

  public logPoolMetrics(pool: Pool): void {
    const metrics = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };

    this.log({
      operation: {
        operation: 'pool_metrics',
        timestamp: new Date()
      },
      level: LogLevel.DEBUG,
      metadata: { poolMetrics: metrics }
    });
  }

  public logTransaction(operation: string, stage: 'begin' | 'commit' | 'rollback', connectionId?: string): void {
    this.log({
      operation: {
        operation: `transaction_${stage}`,
        connectionId,
        timestamp: new Date()
      },
      level: stage === 'rollback' ? LogLevel.WARN : LogLevel.INFO
    });
  }

  public logPerformanceMetrics(operation: string, metrics: {
    queryTime?: number;
    connectionTime?: number;
    totalTime?: number;
    cacheHit?: boolean;
  }): void {
    this.log({
      operation: {
        operation,
        timestamp: new Date()
      },
      level: LogLevel.INFO,
      metadata: { performanceMetrics: metrics }
    });
  }
}

// Export singleton instance
export const dbLogger = DatabaseLogger.getInstance();

// Utility function to measure execution time
export function measureExecutionTime<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    
    try {
      dbLogger.log({
        operation: {
          operation: `${operation}_start`,
          timestamp: new Date()
        },
        level: LogLevel.DEBUG
      });

      const result = await fn();
      const duration = Date.now() - startTime;

      dbLogger.log({
        operation: {
          operation: `${operation}_complete`,
          duration,
          timestamp: new Date()
        },
        level: LogLevel.INFO
      });

      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      dbLogger.logError(`${operation}_failed`, error as Error);
      dbLogger.log({
        operation: {
          operation: `${operation}_failed`,
          duration,
          timestamp: new Date()
        },
        level: LogLevel.ERROR,
        error: error as Error
      });

      reject(error);
    }
  });
}