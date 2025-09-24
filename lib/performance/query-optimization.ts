import { PoolClient, QueryResult } from 'pg';
import { performanceConfig } from '../database/pool-config';

// Query performance metrics interface
export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  rowsAffected?: number;
  error?: string;
  parameters?: any[];
}

// Query performance tracker
class QueryPerformanceTracker {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 queries

  // Add query metrics
  public addMetric(metric: QueryMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    // Log slow queries
    this.logSlowQuery(metric);
  }

  // Log slow queries for monitoring
  private logSlowQuery(metric: QueryMetrics): void {
    const thresholds = performanceConfig.queryThresholds;
    
    if (metric.duration > thresholds.critical) {
      console.error('CRITICAL: Very slow query detected', {
        query: metric.query.substring(0, 100) + '...',
        duration: `${metric.duration}ms`,
        timestamp: metric.timestamp,
        threshold: 'CRITICAL (>5s)',
      });
    } else if (metric.duration > thresholds.slow) {
      console.warn('SLOW QUERY: Performance issue detected', {
        query: metric.query.substring(0, 100) + '...',
        duration: `${metric.duration}ms`,
        timestamp: metric.timestamp,
        threshold: 'SLOW (>1s)',
      });
    }
  }

  // Get performance statistics
  public getStatistics(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    criticalQueries: number;
    fastQueries: number;
    recentMetrics: QueryMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        criticalQueries: 0,
        fastQueries: 0,
        recentMetrics: [],
      };
    }

    const thresholds = performanceConfig.queryThresholds;
    const totalDuration = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    
    return {
      totalQueries: this.metrics.length,
      averageDuration: totalDuration / this.metrics.length,
      slowQueries: this.metrics.filter(m => m.duration > thresholds.slow).length,
      criticalQueries: this.metrics.filter(m => m.duration > thresholds.critical).length,
      fastQueries: this.metrics.filter(m => m.duration < thresholds.fast).length,
      recentMetrics: this.metrics.slice(-10), // Last 10 queries
    };
  }

  // Clear metrics history
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Global performance tracker instance
const performanceTracker = new QueryPerformanceTracker();

// Optimized query wrapper with performance tracking
export async function executeOptimizedQuery<T = any>(
  client: PoolClient,
  query: string,
  parameters?: any[]
): Promise<QueryResult<T>> {
  const startTime = Date.now();
  const timestamp = new Date();
  
  try {
    // Execute the query
    const result = await client.query<T>(query, parameters);
    const duration = Date.now() - startTime;
    
    // Track performance metrics
    performanceTracker.addMetric({
      query,
      duration,
      timestamp,
      rowsAffected: result.rowCount || 0,
      parameters,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track error metrics
    performanceTracker.addMetric({
      query,
      duration,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      parameters,
    });
    
    throw error;
  }
}

// Query optimization utilities
export class QueryOptimizer {
  // Analyze query for potential optimizations
  static analyzeQuery(query: string): {
    hasIndex?: boolean;
    hasLimit?: boolean;
    hasOrderBy?: boolean;
    isSelect?: boolean;
    isJoin?: boolean;
    recommendations: string[];
  } {
    const normalizedQuery = query.toLowerCase().trim();
    const recommendations: string[] = [];
    
    const analysis = {
      hasIndex: false, // This would require database introspection
      hasLimit: normalizedQuery.includes('limit'),
      hasOrderBy: normalizedQuery.includes('order by'),
      isSelect: normalizedQuery.startsWith('select'),
      isJoin: normalizedQuery.includes('join'),
      recommendations,
    };
    
    // Generate recommendations
    if (analysis.isSelect && !analysis.hasLimit) {
      recommendations.push('Consider adding LIMIT clause to prevent large result sets');
    }
    
    if (analysis.isJoin && !normalizedQuery.includes('on')) {
      recommendations.push('Ensure JOIN clauses use proper ON conditions');
    }
    
    if (normalizedQuery.includes('select *')) {
      recommendations.push('Avoid SELECT *, specify only needed columns');
    }
    
    if (analysis.hasOrderBy && !analysis.hasLimit) {
      recommendations.push('ORDER BY without LIMIT can be expensive for large datasets');
    }
    
    return analysis;
  }

  // Generate optimized query suggestions
  static suggestOptimizations(query: string): string[] {
    const analysis = this.analyzeQuery(query);
    return analysis.recommendations;
  }
}

// Connection performance monitoring
export class ConnectionMonitor {
  private connectionAttempts: Array<{ timestamp: Date; duration: number; success: boolean }> = [];
  private readonly maxHistory = 100;

  // Record connection attempt
  public recordConnectionAttempt(duration: number, success: boolean): void {
    this.connectionAttempts.push({
      timestamp: new Date(),
      duration,
      success,
    });
    
    // Keep only recent attempts
    if (this.connectionAttempts.length > this.maxHistory) {
      this.connectionAttempts = this.connectionAttempts.slice(-this.maxHistory);
    }
    
    // Alert on slow connections
    const threshold = performanceConfig.connectionThresholds.establishmentTime;
    if (duration > threshold) {
      console.warn('SLOW CONNECTION: Database connection took longer than expected', {
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        success,
      });
    }
  }

  // Get connection statistics
  public getConnectionStats(): {
    totalAttempts: number;
    successRate: number;
    averageConnectionTime: number;
    slowConnections: number;
  } {
    if (this.connectionAttempts.length === 0) {
      return {
        totalAttempts: 0,
        successRate: 0,
        averageConnectionTime: 0,
        slowConnections: 0,
      };
    }

    const successful = this.connectionAttempts.filter(a => a.success);
    const totalDuration = successful.reduce((sum, attempt) => sum + attempt.duration, 0);
    const threshold = performanceConfig.connectionThresholds.establishmentTime;
    
    return {
      totalAttempts: this.connectionAttempts.length,
      successRate: (successful.length / this.connectionAttempts.length) * 100,
      averageConnectionTime: successful.length > 0 ? totalDuration / successful.length : 0,
      slowConnections: successful.filter(a => a.duration > threshold).length,
    };
  }
}

// Global connection monitor instance
const connectionMonitor = new ConnectionMonitor();

// Export monitoring utilities
export const performanceMonitoring = {
  queryTracker: performanceTracker,
  connectionMonitor,
  
  // Get comprehensive performance report
  getPerformanceReport: () => {
    return {
      queryPerformance: performanceTracker.getStatistics(),
      connectionPerformance: connectionMonitor.getConnectionStats(),
      timestamp: new Date(),
    };
  },
  
  // Clear all performance data
  clearAllMetrics: () => {
    performanceTracker.clearMetrics();
  },
};

// Query execution helper with built-in optimization analysis
export async function executeQuery<T = any>(
  client: PoolClient,
  query: string,
  parameters?: any[]
): Promise<QueryResult<T> & { optimizationSuggestions?: string[] }> {
  // Analyze query for optimization opportunities
  const suggestions = QueryOptimizer.suggestOptimizations(query);
  
  // Execute with performance tracking
  const result = await executeOptimizedQuery<T>(client, query, parameters);
  
  // Return result with optimization suggestions
  return {
    ...result,
    optimizationSuggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

export default performanceTracker;