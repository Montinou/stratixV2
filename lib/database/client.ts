import { Pool, PoolClient, QueryResult } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { dbLogger, LogLevel } from '../logging/database-logger';
import { DatabaseErrorHandler, withErrorHandling } from '../errors/database-errors';
import { dbHealthCheck } from '../monitoring/health-checks';
import { dbRecoveryManager, withRecovery } from '../utils/error-recovery';
import { getPoolConfig, healthCheckConfig } from './pool-config';
import { performanceMonitoring } from '../performance/query-optimization';
import { poolMetricsCollector, performanceScheduler } from '../performance/connection-metrics';


// Get production-optimized database configuration
const dbConfig = getPoolConfig();

// Create a global connection pool
let pool: Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const connectionStart = Date.now();
    pool = new Pool(dbConfig);
    const connectionDuration = Date.now() - connectionStart;
    
    // Record pool creation performance
    performanceMonitoring.connectionMonitor.recordConnectionAttempt(connectionDuration, true);
    
    // Handle pool errors with comprehensive logging
    pool.on('error', (err) => {
      dbLogger.logConnectionEvent('error', { error: err.message });
      performanceMonitoring.connectionMonitor.recordConnectionAttempt(0, false);
    });

    pool.on('connect', (client) => {
      const connectStart = Date.now();
      dbLogger.logConnectionEvent('connect');
      
      // Track connection establishment time
      const establishmentTime = Date.now() - connectStart;
      performanceMonitoring.connectionMonitor.recordConnectionAttempt(establishmentTime, true);
    });

    pool.on('remove', () => {
      dbLogger.logConnectionEvent('remove');
    });

    // Initialize monitoring and recovery systems
    dbHealthCheck.setPool(pool);
    dbRecoveryManager.setPool(pool);
    poolMetricsCollector.setPool(pool);
    
    // Start periodic health checks with optimized interval
    const healthCheckInterval = healthCheckConfig.intervalMs;
    dbHealthCheck.startPeriodicHealthChecks(healthCheckInterval);
    
    // Start performance metrics collection
    performanceScheduler.start();
    
    // Log pool configuration details
    dbLogger.log({
      operation: {
        operation: 'pool_initialized',
        timestamp: new Date(),
        duration: connectionDuration
      },
      level: LogLevel.INFO,
      metadata: {
        maxConnections: dbConfig.max,
        minConnections: dbConfig.min,
        idleTimeout: dbConfig.idleTimeoutMillis,
        connectionTimeout: dbConfig.connectionTimeoutMillis,
        environment: process.env.NODE_ENV
      }
    });
  }
  return pool;
}

// Get Drizzle database instance
export function getDrizzleDb() {
  if (!drizzleDb) {
    const pool = getPool();
    drizzleDb = drizzle(pool, { schema });
  }
  return drizzleDb;
}

// Database query wrapper with comprehensive error handling and logging
export const query = withRecovery('database_query', async <T = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> => {
  const startTime = Date.now();
  const pool = getPool();
  let client: PoolClient | null = null;
  
  // Log the query start
  dbLogger.logQuery('database_query', text, params, startTime);
  
  try {
    const context = DatabaseErrorHandler.createContext(
      'database_query',
      text,
      params
    );

    client = await pool.connect();
    const result = await client.query<T>(text, params);
    
    // Log successful query
    const duration = Date.now() - startTime;
    dbLogger.logQueryResult('database_query', result, startTime);
    dbHealthCheck.recordQueryMetrics(duration, true);
    
    // Record performance metrics
    performanceMonitoring.queryTracker.addMetric({
      query: text,
      duration,
      timestamp: new Date(startTime),
      rowsAffected: result.rowCount || 0,
      parameters: params
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const context = DatabaseErrorHandler.createContext(
      'database_query',
      text,
      params,
      client ? 'unknown' : undefined
    );
    
    // Log the error with context
    dbLogger.logError('database_query_failed', error as Error, text, params);
    dbHealthCheck.recordQueryMetrics(duration, false);
    
    // Record performance metrics for failed queries
    performanceMonitoring.queryTracker.addMetric({
      query: text,
      duration,
      timestamp: new Date(startTime),
      error: (error as Error).message,
      parameters: params
    });
    
    // Use error handler for consistent error processing
    throw DatabaseErrorHandler.handleError(error as Error, context);
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Transaction wrapper with comprehensive error handling and logging
export const transaction = withRecovery('database_transaction', async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const pool = getPool();
  const client = await pool.connect();
  const connectionId = `tx-${Date.now()}`;
  
  try {
    const context = DatabaseErrorHandler.createContext(
      'database_transaction',
      'BEGIN',
      [],
      connectionId
    );

    // Begin transaction
    dbLogger.logTransaction('database_transaction', 'begin', connectionId);
    await client.query('BEGIN');
    
    // Execute callback
    const result = await callback(client);
    
    // Commit transaction
    await client.query('COMMIT');
    dbLogger.logTransaction('database_transaction', 'commit', connectionId);
    
    const duration = Date.now() - startTime;
    dbHealthCheck.recordQueryMetrics(duration, true);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const context = DatabaseErrorHandler.createContext(
      'database_transaction',
      'ROLLBACK',
      [],
      connectionId
    );
    
    try {
      await client.query('ROLLBACK');
      dbLogger.logTransaction('database_transaction', 'rollback', connectionId);
    } catch (rollbackError) {
      dbLogger.logError('transaction_rollback_failed', rollbackError as Error);
    }
    
    // Log the transaction error
    dbLogger.logError('database_transaction_failed', error as Error);
    dbHealthCheck.recordQueryMetrics(duration, false);
    
    // Use error handler for consistent error processing
    throw DatabaseErrorHandler.handleError(error as Error, context);
  } finally {
    client.release();
  }
});

// Helper function to check database connection with health monitoring
export async function testConnection(): Promise<boolean> {
  try {
    const startTime = Date.now();
    const result = await query('SELECT NOW() as current_time');
    const duration = Date.now() - startTime;
    
    dbLogger.log({
      operation: {
        operation: 'connection_test_success',
        duration,
        timestamp: new Date()
      },
      level: LogLevel.INFO,
      metadata: { result: result.rows[0] }
    });
    
    return true;
  } catch (error) {
    dbLogger.logError('connection_test_failed', error as Error);
    return false;
  }
}

// Enhanced health check function
export async function performHealthCheck() {
  return dbHealthCheck.performHealthCheck();
}

// Get current database metrics
export function getDatabaseMetrics() {
  return dbHealthCheck.getMetrics();
}

// Get recovery statistics
export function getRecoveryStats() {
  return dbRecoveryManager.getRecoveryStats();
}

// Get performance metrics
export function getPerformanceMetrics() {
  return performanceMonitoring.getPerformanceReport();
}

// Get pool utilization metrics
export function getPoolUtilization() {
  const pool = getPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    utilizationRate: pool.totalCount > 0 ? (1 - (pool.idleCount / pool.totalCount)) * 100 : 0,
    timestamp: new Date()
  };
}

// Connection performance statistics
export function getConnectionStats() {
  return performanceMonitoring.connectionMonitor.getConnectionStats();
}

// Get comprehensive pool metrics with alerts
export function getPoolMetricsWithAlerts() {
  return poolMetricsCollector.getPerformanceSummary();
}

// Get current pool utilization snapshot
export function getPoolSnapshot() {
  return poolMetricsCollector.collectMetrics();
}

// Performance monitoring status
export function getMonitoringStatus() {
  return performanceScheduler.getStatus();
}

// Get all performance data in one call for dashboards
export function getAllPerformanceData() {
  return {
    queryPerformance: performanceMonitoring.getPerformanceReport(),
    poolMetrics: poolMetricsCollector.getPerformanceSummary(),
    connectionStats: performanceMonitoring.connectionMonitor.getConnectionStats(),
    healthMetrics: dbHealthCheck.getMetrics(),
    monitoringStatus: performanceScheduler.getStatus(),
    timestamp: new Date()
  };
}

// Clean shutdown function with proper cleanup
export async function closePool(): Promise<void> {
  if (pool) {
    dbLogger.log({
      operation: {
        operation: 'pool_shutdown_start',
        timestamp: new Date()
      },
      level: dbLogger.LogLevel?.INFO || 'info' as any
    });
    
    // Stop health checks and performance monitoring
    dbHealthCheck.stopPeriodicHealthChecks();
    performanceScheduler.stop();
    
    // Close pool
    await pool.end();
    pool = null;
    drizzleDb = null;
    
    dbLogger.log({
      operation: {
        operation: 'pool_shutdown_complete',
        timestamp: new Date()
      },
      level: dbLogger.LogLevel?.INFO || 'info' as any
    });
  }
}

// Drizzle client setup
let drizzleClient: ReturnType<typeof drizzle> | null = null;

export function getDrizzleClient() {
  if (!drizzleClient) {
    const pool = getPool();
    drizzleClient = drizzle(pool, { schema });
  }
  
  return drizzleClient;
}

// Export the pool for direct access if needed
export { pool };

// Export typed database client for direct use
export const db = getDrizzleClient();