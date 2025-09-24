import { PoolConfig } from 'pg';

// Production-optimized connection pool configuration
interface DatabasePoolConfig extends PoolConfig {
  // Performance optimization settings
  statement_timeout?: number;
  query_timeout?: number;
  application_name?: string;
}

// Environment-based configuration
const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

// Get expected production load metrics
const getProductionMetrics = () => {
  return {
    // Expected concurrent users during peak hours
    expectedConcurrentUsers: parseInt(process.env.EXPECTED_CONCURRENT_USERS || '100'),
    // Average queries per user session
    avgQueriesPerUser: parseInt(process.env.AVG_QUERIES_PER_USER || '10'),
    // Peak requests per second
    peakRps: parseInt(process.env.PEAK_RPS || '50'),
  };
};

// Calculate optimal pool size based on load expectations
const calculateOptimalPoolSize = () => {
  const metrics = getProductionMetrics();
  const environment = getEnvironment();
  
  if (environment === 'production') {
    // Production: Based on expected load with safety margin
    const basePoolSize = Math.max(metrics.expectedConcurrentUsers / 10, 10);
    const safetyMargin = Math.ceil(basePoolSize * 0.3); // 30% safety margin
    return Math.min(basePoolSize + safetyMargin, 30); // Cap at 30 for NeonDB limits
  } else if (environment === 'staging') {
    // Staging: Reduced but realistic load testing
    return Math.min(15, 20);
  } else {
    // Development: Minimal but functional
    return 5;
  }
};

// Base configuration for all environments
const baseConfig: DatabasePoolConfig = {
  // Connection string from environment
  connectionString: process.env.DATABASE_URL,
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false,
    
  // Application name for monitoring and debugging
  application_name: `okr-app-${getEnvironment()}`,
  
  // Statement timeout (30 seconds)
  statement_timeout: 30000,
  
  // Query timeout (25 seconds - slightly less than statement timeout)
  query_timeout: 25000,
};

// Production-optimized configuration
const productionConfig: DatabasePoolConfig = {
  ...baseConfig,
  
  // Connection pool sizing
  max: calculateOptimalPoolSize(), // Maximum connections in pool
  min: Math.ceil(calculateOptimalPoolSize() / 4), // Minimum connections to maintain
  
  // Connection lifecycle management
  idleTimeoutMillis: 60000, // 1 minute - aggressive cleanup for production
  connectionTimeoutMillis: 2000, // 2 seconds - fast connection establishment
  maxUses: 5000, // Connection reuse limit to prevent connection degradation
  
  // Keep-alive settings for long-running connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  
  // Query optimization
  statement_timeout: 30000, // 30 seconds for complex queries
  query_timeout: 25000, // 25 seconds query timeout
  
  // Application identification
  application_name: 'okr-app-production',
};

// Staging configuration
const stagingConfig: DatabasePoolConfig = {
  ...baseConfig,
  
  // Moderate pool sizing for testing
  max: 15,
  min: 3,
  
  // Balanced lifecycle management
  idleTimeoutMillis: 45000, // 45 seconds
  connectionTimeoutMillis: 3000, // 3 seconds
  maxUses: 3000,
  
  // Keep-alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  
  // Query timeouts
  statement_timeout: 45000, // 45 seconds for testing complex queries
  query_timeout: 40000, // 40 seconds
  
  application_name: 'okr-app-staging',
};

// Development configuration
const developmentConfig: DatabasePoolConfig = {
  ...baseConfig,
  
  // Minimal pool sizing for development
  max: 5,
  min: 1,
  
  // Relaxed lifecycle management
  idleTimeoutMillis: 120000, // 2 minutes
  connectionTimeoutMillis: 5000, // 5 seconds
  maxUses: 1000,
  
  // Keep-alive settings
  keepAlive: false, // Disable keep-alive in development
  
  // Extended timeouts for debugging
  statement_timeout: 0, // No timeout for development debugging
  query_timeout: 0, // No query timeout
  
  application_name: 'okr-app-development',
};

// Configuration selector
export const getPoolConfig = (): DatabasePoolConfig => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

// Health check configuration
export const healthCheckConfig = {
  // Health check query
  query: 'SELECT 1 as health_check, NOW() as timestamp',
  
  // Health check interval in milliseconds
  intervalMs: 30000, // 30 seconds
  
  // Maximum time to wait for health check response
  timeoutMs: 5000, // 5 seconds
  
  // Number of consecutive failures before marking as unhealthy
  maxFailures: 3,
  
  // Time to wait before retrying after failure
  retryDelayMs: 5000, // 5 seconds
};

// Performance monitoring configuration
export const performanceConfig = {
  // Query performance thresholds (in milliseconds)
  queryThresholds: {
    fast: 50, // Queries faster than 50ms
    normal: 200, // Queries between 50-200ms
    slow: 1000, // Queries between 200ms-1s
    critical: 5000, // Queries over 1s are critical
  },
  
  // Connection performance thresholds
  connectionThresholds: {
    establishmentTime: 100, // Connection establishment < 100ms
    maxWaitTime: 1000, // Maximum wait time for connection
  },
  
  // Pool utilization thresholds
  poolThresholds: {
    highUtilization: 0.8, // 80% pool utilization
    criticalUtilization: 0.95, // 95% pool utilization
  },
  
  // Metrics collection interval
  metricsIntervalMs: 10000, // 10 seconds
};

// Export configuration details for monitoring
export const getConfigSummary = () => {
  const config = getPoolConfig();
  const environment = getEnvironment();
  const metrics = getProductionMetrics();
  
  return {
    environment,
    poolSize: {
      max: config.max,
      min: config.min,
    },
    timeouts: {
      connection: config.connectionTimeoutMillis,
      idle: config.idleTimeoutMillis,
      statement: config.statement_timeout,
      query: config.query_timeout,
    },
    loadExpectations: metrics,
    applicationName: config.application_name,
  };
};

export default getPoolConfig;