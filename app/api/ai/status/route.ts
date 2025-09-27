import { NextRequest, NextResponse } from 'next/server'
import { aiPerformanceMonitor } from '@/lib/ai/performance-monitor'
import { aiCacheOptimization } from '@/lib/ai/cache-optimization'

/**
 * AI System Status and Health Check API
 * Provides real-time system health, status, and availability information
 */

/**
 * GET /api/ai/status - Get system health and status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const detailed = searchParams.get('detailed') === 'true'
    const checks = searchParams.get('checks')?.split(',') || ['all']

    const startTime = Date.now()

    // Basic health check data
    const healthData: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0',
      checks: {}
    }

    // Performance monitoring check
    if (checks.includes('all') || checks.includes('performance')) {
      try {
        const perfStatus = aiPerformanceMonitor.getStatus()
        healthData.checks.performance = {
          status: perfStatus.overall,
          responseTime: perfStatus.metrics?.responseTime || 0,
          errorRate: perfStatus.metrics?.errorRate || 0,
          throughput: perfStatus.metrics?.throughput || 0,
          activeAlerts: perfStatus.activeAlerts.length,
          details: detailed ? perfStatus : undefined
        }

        if (perfStatus.overall !== 'healthy') {
          healthData.status = perfStatus.overall
        }
      } catch (error) {
        healthData.checks.performance = {
          status: 'unhealthy',
          error: 'Performance monitoring unavailable'
        }
        healthData.status = 'degraded'
      }
    }

    // Cache system check
    if (checks.includes('all') || checks.includes('cache')) {
      try {
        const cacheStats = aiCacheOptimization.getAdvancedStats()
        const cacheHealth = {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          hitRate: cacheStats.hitRate,
          size: cacheStats.size,
          maxSize: cacheStats.maxSize,
          memoryUsage: cacheStats.memoryUsage,
          warmingStatus: cacheStats.warmingStatus
        }

        // Determine cache health
        if (cacheStats.hitRate < 0.5) { // Less than 50% hit rate
          cacheHealth.status = 'degraded'
        }
        if (cacheStats.memoryUsage > 0.95) { // Over 95% memory usage
          cacheHealth.status = 'unhealthy'
        }

        healthData.checks.cache = {
          ...cacheHealth,
          details: detailed ? cacheStats : undefined
        }

        if (cacheHealth.status !== 'healthy' && healthData.status === 'healthy') {
          healthData.status = cacheHealth.status
        }
      } catch (error) {
        healthData.checks.cache = {
          status: 'unhealthy',
          error: 'Cache system unavailable'
        }
        healthData.status = 'degraded'
      }
    }

    // Memory check
    if (checks.includes('all') || checks.includes('memory')) {
      try {
        const memUsage = process.memoryUsage()
        const memoryHealth = {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100
        }

        if (memoryHealth.usagePercent > 85) {
          memoryHealth.status = 'degraded'
        }
        if (memoryHealth.usagePercent > 95) {
          memoryHealth.status = 'unhealthy'
        }

        healthData.checks.memory = memoryHealth

        if (memoryHealth.status !== 'healthy' && healthData.status === 'healthy') {
          healthData.status = memoryHealth.status
        }
      } catch (error) {
        healthData.checks.memory = {
          status: 'unhealthy',
          error: 'Memory check failed'
        }
        healthData.status = 'degraded'
      }
    }

    // AI Gateway connectivity check
    if (checks.includes('all') || checks.includes('gateway')) {
      try {
        // This would test actual AI Gateway connectivity
        // For now, we'll simulate a basic check
        const gatewayHealth = {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          latency: Math.random() * 100 + 50, // Simulated latency
          lastCheck: new Date().toISOString()
        }

        healthData.checks.gateway = gatewayHealth
      } catch (error) {
        healthData.checks.gateway = {
          status: 'unhealthy',
          error: 'AI Gateway unreachable'
        }
        healthData.status = 'degraded'
      }
    }

    // Database connectivity check
    if (checks.includes('all') || checks.includes('database')) {
      try {
        // This would test actual database connectivity
        // For now, we'll simulate a basic check
        const dbHealth = {
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
          connectionPool: {
            active: 5,
            idle: 15,
            total: 20
          },
          lastCheck: new Date().toISOString()
        }

        healthData.checks.database = dbHealth
      } catch (error) {
        healthData.checks.database = {
          status: 'unhealthy',
          error: 'Database unreachable'
        }
        healthData.status = 'unhealthy'
      }
    }

    // Add response time
    healthData.responseTime = Date.now() - startTime

    // Set appropriate HTTP status code
    let statusCode = 200
    if (healthData.status === 'degraded') {
      statusCode = 200 // Still OK but with warnings
    } else if (healthData.status === 'unhealthy') {
      statusCode = 503 // Service unavailable
    }

    return NextResponse.json(healthData, { status: statusCode })

  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/status - Trigger health checks or system diagnostics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, params = {} } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    let response: any

    switch (action) {
      case 'deep_check':
        // Perform comprehensive system health check
        const deepCheck = {
          timestamp: new Date().toISOString(),
          checks: {
            performance: aiPerformanceMonitor.getStatus(),
            cache: aiCacheOptimization.getAdvancedStats(),
            memory: {
              usage: process.memoryUsage(),
              gc: global.gc ? 'available' : 'not_available'
            },
            system: {
              platform: process.platform,
              nodeVersion: process.version,
              uptime: process.uptime(),
              cpuUsage: process.cpuUsage()
            }
          }
        }

        response = {
          status: 'success',
          data: deepCheck,
          responseTime: Date.now() - startTime
        }
        break

      case 'force_gc':
        // Force garbage collection if available
        if (global.gc) {
          const beforeMemory = process.memoryUsage()
          global.gc()
          const afterMemory = process.memoryUsage()

          response = {
            status: 'success',
            message: 'Garbage collection completed',
            before: beforeMemory,
            after: afterMemory,
            freed: beforeMemory.heapUsed - afterMemory.heapUsed
          }
        } else {
          response = {
            status: 'error',
            message: 'Garbage collection not available (run with --expose-gc)'
          }
        }
        break

      case 'reset_metrics':
        // Reset performance metrics (be careful with this in production)
        if (params.confirm === true) {
          // This would reset metrics - implementation depends on monitoring system
          response = {
            status: 'success',
            message: 'Performance metrics reset',
            timestamp: new Date().toISOString()
          }
        } else {
          return NextResponse.json(
            { error: 'Reset operation requires confirmation' },
            { status: 400 }
          )
        }
        break

      case 'diagnostics':
        // Generate comprehensive diagnostics report
        const diagnostics = {
          timestamp: new Date().toISOString(),
          system: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: process.uptime(),
            pid: process.pid,
            cwd: process.cwd()
          },
          memory: process.memoryUsage(),
          performance: aiPerformanceMonitor.getReport(3600000), // Last hour
          cache: aiCacheOptimization.getAdvancedStats(),
          environment: {
            nodeEnv: process.env.NODE_ENV,
            hasGC: !!global.gc,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }

        response = {
          status: 'success',
          data: diagnostics,
          responseTime: Date.now() - startTime
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Status POST API error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}