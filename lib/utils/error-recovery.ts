import { Pool, PoolClient } from 'pg';
import { dbLogger, LogLevel, measureExecutionTime } from '../logging/database-logger';
import { DatabaseError, DatabaseErrorCode, DatabaseErrorHandler } from '../errors/database-errors';
import { dbHealthCheck, HealthStatus } from '../monitoring/health-checks';

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: DatabaseError) => boolean;
  recover: (context: RecoveryContext) => Promise<boolean>;
  priority: number; // Lower numbers have higher priority
}

export interface RecoveryContext {
  error: DatabaseError;
  pool: Pool;
  operation: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}

export interface RecoveryResult {
  success: boolean;
  strategyUsed?: string;
  recoveryTime: number;
  message: string;
  newPoolCreated?: boolean;
}

export class DatabaseRecoveryManager {
  private static instance: DatabaseRecoveryManager;
  private strategies: RecoveryStrategy[] = [];
  private pool: Pool | null = null;
  private isRecovering = false;
  private recoveryHistory: Array<{
    timestamp: Date;
    error: string;
    strategy: string;
    success: boolean;
    duration: number;
  }> = [];

  private constructor() {
    this.registerDefaultStrategies();
  }

  public static getInstance(): DatabaseRecoveryManager {
    if (!DatabaseRecoveryManager.instance) {
      DatabaseRecoveryManager.instance = new DatabaseRecoveryManager();
    }
    return DatabaseRecoveryManager.instance;
  }

  public setPool(pool: Pool): void {
    this.pool = pool;
  }

  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
    
    dbLogger.log({
      operation: {
        operation: 'recovery_strategy_registered',
        timestamp: new Date()
      },
      level: LogLevel.INFO,
      metadata: { 
        strategyName: strategy.name,
        priority: strategy.priority,
        totalStrategies: this.strategies.length 
      }
    });
  }

  public async attemptRecovery(
    error: DatabaseError,
    operation: string,
    maxRetries: number = 3
  ): Promise<RecoveryResult> {
    if (this.isRecovering) {
      return {
        success: false,
        recoveryTime: 0,
        message: 'Recovery already in progress'
      };
    }

    this.isRecovering = true;
    const startTime = Date.now();

    try {
      return await measureExecutionTime(
        'database_recovery',
        () => this.executeRecovery(error, operation, maxRetries)
      );
    } finally {
      this.isRecovering = false;
    }
  }

  private async executeRecovery(
    error: DatabaseError,
    operation: string,
    maxRetries: number
  ): Promise<RecoveryResult> {
    const startTime = Date.now();

    if (!this.pool) {
      return {
        success: false,
        recoveryTime: Date.now() - startTime,
        message: 'No database pool available for recovery'
      };
    }

    const context: RecoveryContext = {
      error,
      pool: this.pool,
      operation,
      retryCount: error.context.retryCount || 0,
      maxRetries,
      metadata: error.context.metadata
    };

    // Find applicable recovery strategies
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canRecover(error)
    );

    if (applicableStrategies.length === 0) {
      const result = {
        success: false,
        recoveryTime: Date.now() - startTime,
        message: `No recovery strategy available for error: ${error.code}`
      };

      this.recordRecoveryAttempt('none', error.code, false, Date.now() - startTime);
      return result;
    }

    // Try each applicable strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        dbLogger.log({
          operation: {
            operation: 'recovery_strategy_attempt',
            timestamp: new Date()
          },
          level: LogLevel.INFO,
          metadata: { 
            strategyName: strategy.name,
            errorCode: error.code,
            retryCount: context.retryCount
          }
        });

        const recovered = await strategy.recover(context);
        const recoveryTime = Date.now() - startTime;

        if (recovered) {
          const result = {
            success: true,
            strategyUsed: strategy.name,
            recoveryTime,
            message: `Successfully recovered using ${strategy.name} strategy`
          };

          this.recordRecoveryAttempt(strategy.name, error.code, true, recoveryTime);
          
          dbLogger.log({
            operation: {
              operation: 'recovery_successful',
              duration: recoveryTime,
              timestamp: new Date()
            },
            level: LogLevel.INFO,
            metadata: { 
              strategyUsed: strategy.name,
              errorCode: error.code
            }
          });

          return result;
        }
      } catch (strategyError) {
        dbLogger.logError(
          `recovery_strategy_failed_${strategy.name}`,
          strategyError as Error
        );
      }
    }

    // All strategies failed
    const recoveryTime = Date.now() - startTime;
    const result = {
      success: false,
      recoveryTime,
      message: 'All recovery strategies failed'
    };

    this.recordRecoveryAttempt('all_failed', error.code, false, recoveryTime);
    return result;
  }

  private recordRecoveryAttempt(
    strategy: string,
    errorCode: string,
    success: boolean,
    duration: number
  ): void {
    this.recoveryHistory.push({
      timestamp: new Date(),
      error: errorCode,
      strategy,
      success,
      duration
    });

    // Keep only last 100 recovery attempts
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
  }

  private registerDefaultStrategies(): void {
    // Strategy 1: Connection Pool Recreation
    this.registerStrategy({
      name: 'connection_pool_recreation',
      priority: 1,
      canRecover: (error) => [
        DatabaseErrorCode.CONNECTION_REFUSED,
        DatabaseErrorCode.CONNECTION_LOST,
        DatabaseErrorCode.POOL_EXHAUSTED
      ].includes(error.code),
      recover: async (context) => {
        try {
          dbLogger.log({
            operation: {
              operation: 'pool_recreation_start',
              timestamp: new Date()
            },
            level: LogLevel.WARN
          });

          // Close existing pool
          await context.pool.end();
          
          // Create new pool with same configuration
          const newPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            maxUses: 7500,
          });

          // Test new pool
          const client = await newPool.connect();
          await client.query('SELECT 1');
          client.release();

          // Update references
          this.pool = newPool;
          dbHealthCheck.setPool(newPool);

          dbLogger.log({
            operation: {
              operation: 'pool_recreation_success',
              timestamp: new Date()
            },
            level: LogLevel.INFO
          });

          return true;
        } catch (error) {
          dbLogger.logError('pool_recreation_failed', error as Error);
          return false;
        }
      }
    });

    // Strategy 2: Connection Health Check and Cleanup
    this.registerStrategy({
      name: 'connection_cleanup',
      priority: 2,
      canRecover: (error) => [
        DatabaseErrorCode.CONNECTION_LOST,
        DatabaseErrorCode.POOL_EXHAUSTED,
        DatabaseErrorCode.CONNECTION_TIMEOUT
      ].includes(error.code),
      recover: async (context) => {
        try {
          // Force removal of idle connections
          const totalBefore = context.pool.totalCount;
          const idleBefore = context.pool.idleCount;

          // Get and immediately release connections to check health
          const healthyConnections: PoolClient[] = [];
          const connectionsToCheck = Math.min(context.pool.idleCount, 5);

          for (let i = 0; i < connectionsToCheck; i++) {
            try {
              const client = await context.pool.connect();
              await client.query('SELECT 1');
              healthyConnections.push(client);
            } catch {
              // Connection is unhealthy, let it be removed
              break;
            }
          }

          // Release healthy connections back to pool
          healthyConnections.forEach(client => client.release());

          const totalAfter = context.pool.totalCount;
          const cleaned = totalBefore - totalAfter;

          dbLogger.log({
            operation: {
              operation: 'connection_cleanup_complete',
              timestamp: new Date()
            },
            level: LogLevel.INFO,
            metadata: { 
              connectionsCleaned: cleaned,
              healthyConnections: healthyConnections.length
            }
          });

          return healthyConnections.length > 0;
        } catch (error) {
          dbLogger.logError('connection_cleanup_failed', error as Error);
          return false;
        }
      }
    });

    // Strategy 3: Query Timeout Recovery
    this.registerStrategy({
      name: 'query_timeout_recovery',
      priority: 3,
      canRecover: (error) => error.code === DatabaseErrorCode.CONNECTION_TIMEOUT,
      recover: async (context) => {
        try {
          // Wait for a short period to allow connections to recover
          await this.sleep(1000);

          // Test connection with a simple query
          const client = await context.pool.connect();
          try {
            await Promise.race([
              client.query('SELECT 1'),
              this.timeoutPromise(5000, 'Health check timeout')
            ]);
            return true;
          } finally {
            client.release();
          }
        } catch (error) {
          dbLogger.logError('query_timeout_recovery_failed', error as Error);
          return false;
        }
      }
    });

    // Strategy 4: Graceful Degradation
    this.registerStrategy({
      name: 'graceful_degradation',
      priority: 10, // Lowest priority - last resort
      canRecover: (error) => error.isRetryable,
      recover: async (context) => {
        try {
          // Implement circuit breaker logic
          const healthCheck = await dbHealthCheck.performHealthCheck();
          
          if (healthCheck.status === HealthStatus.UNHEALTHY) {
            dbLogger.log({
              operation: {
                operation: 'graceful_degradation_activated',
                timestamp: new Date()
              },
              level: LogLevel.WARN,
              metadata: { 
                reason: 'Database unhealthy',
                healthStatus: healthCheck.status
              }
            });

            // Could implement caching layer, read-only mode, etc.
            return false; // For now, don't recover - let calling code handle
          }

          return false;
        } catch (error) {
          return false;
        }
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  public getRecoveryHistory(): Array<{
    timestamp: Date;
    error: string;
    strategy: string;
    success: boolean;
    duration: number;
  }> {
    return [...this.recoveryHistory];
  }

  public getRecoveryStats(): {
    totalAttempts: number;
    successRate: number;
    averageRecoveryTime: number;
    strategiesUsed: Record<string, { attempts: number; successRate: number }>;
  } {
    const total = this.recoveryHistory.length;
    if (total === 0) {
      return {
        totalAttempts: 0,
        successRate: 0,
        averageRecoveryTime: 0,
        strategiesUsed: {}
      };
    }

    const successful = this.recoveryHistory.filter(h => h.success).length;
    const totalTime = this.recoveryHistory.reduce((sum, h) => sum + h.duration, 0);
    
    const strategies: Record<string, { attempts: number; successRate: number }> = {};
    
    this.recoveryHistory.forEach(h => {
      if (!strategies[h.strategy]) {
        strategies[h.strategy] = { attempts: 0, successRate: 0 };
      }
      strategies[h.strategy].attempts++;
    });

    // Calculate success rates for each strategy
    Object.keys(strategies).forEach(strategy => {
      const attempts = this.recoveryHistory.filter(h => h.strategy === strategy);
      const successes = attempts.filter(h => h.success).length;
      strategies[strategy].successRate = attempts.length > 0 ? 
        Math.round((successes / attempts.length) * 100) : 0;
    });

    return {
      totalAttempts: total,
      successRate: Math.round((successful / total) * 100),
      averageRecoveryTime: Math.round(totalTime / total),
      strategiesUsed: strategies
    };
  }
}

// Export singleton instance
export const dbRecoveryManager = DatabaseRecoveryManager.getInstance();

// Utility function to wrap database operations with recovery
export function withRecovery<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  maxRetries: number = 3
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const dbError = error instanceof DatabaseError ? 
        error : 
        new DatabaseError(
          DatabaseErrorCode.UNKNOWN_ERROR,
          (error as Error).message,
          { operation, timestamp: new Date() },
          false,
          error as Error
        );

      // Attempt recovery if error is retryable
      if (dbError.isRetryable) {
        const recoveryResult = await dbRecoveryManager.attemptRecovery(
          dbError,
          operation,
          maxRetries
        );

        if (recoveryResult.success) {
          // Retry the operation after successful recovery
          return fn(...args);
        }
      }

      throw dbError;
    }
  };
}