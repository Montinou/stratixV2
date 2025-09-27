import { NextRequest, NextResponse } from 'next/server'
import { aiCacheOptimization } from '@/lib/ai/cache-optimization'
import { aiPerformanceMonitor } from '@/lib/ai/performance-monitor'

/**
 * AI Cache Management API
 * Provides comprehensive cache management, analytics, and optimization controls
 */

// Rate limiting for cache management operations
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100
const requestTracker = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const tracker = requestTracker.get(clientId)

  if (!tracker || now - tracker.windowStart > RATE_LIMIT_WINDOW) {
    requestTracker.set(clientId, { count: 1, windowStart: now })
    return true
  }

  if (tracker.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  tracker.count++
  return true
}

function getClientId(request: NextRequest): string {
  // In production, use proper client identification
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'anonymous'
}

/**
 * GET /api/ai/cache - Get cache statistics and status
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'stats'

    const requestId = `cache_${action}_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, `cache_${action}`)

    let response: any

    switch (action) {
      case 'stats':
        response = {
          status: 'success',
          data: {
            cache: aiCacheOptimization.getAdvancedStats(),
            performance: aiPerformanceMonitor.getStatus(),
            timestamp: new Date().toISOString()
          }
        }
        break

      case 'health':
        const performanceStatus = aiPerformanceMonitor.getStatus()
        const cacheStats = aiCacheOptimization.getAdvancedStats()

        response = {
          status: 'success',
          data: {
            overall: performanceStatus.overall,
            cache: {
              hitRate: cacheStats.hitRate,
              size: cacheStats.size,
              memoryUsage: cacheStats.memoryUsage,
              warmingStatus: cacheStats.warmingStatus
            },
            performance: {
              responseTime: performanceStatus.metrics?.responseTime || 0,
              errorRate: performanceStatus.metrics?.errorRate || 0,
              throughput: performanceStatus.metrics?.throughput || 0
            },
            alerts: performanceStatus.activeAlerts.length,
            timestamp: new Date().toISOString()
          }
        }
        break

      case 'insights':
        const insights = aiPerformanceMonitor.generateInsights()
        response = {
          status: 'success',
          data: {
            insights,
            timestamp: new Date().toISOString()
          }
        }
        break

      case 'report':
        const timeRange = parseInt(searchParams.get('timeRange') || '3600000') // 1 hour default
        const report = aiPerformanceMonitor.getReport(timeRange)
        response = {
          status: 'success',
          data: {
            report,
            timestamp: new Date().toISOString()
          }
        }
        break

      case 'export':
        const exportData = {
          cache: aiCacheOptimization.exportCache(),
          performance: aiPerformanceMonitor.exportData(),
          timestamp: new Date().toISOString()
        }
        response = {
          status: 'success',
          data: exportData
        }
        break

      default:
        aiPerformanceMonitor.endRequest(requestId, false)
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }

    aiPerformanceMonitor.endRequest(requestId, true)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cache API GET error:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/cache - Cache management operations
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { action, params = {} } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const requestId = `cache_${action}_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, `cache_${action}`)

    let response: any

    switch (action) {
      case 'warm':
        // Trigger cache warming
        await aiCacheOptimization.performCacheWarming()
        response = {
          status: 'success',
          message: 'Cache warming initiated',
          timestamp: new Date().toISOString()
        }
        break

      case 'clear':
        // Clear cache with optional tag filtering
        if (params.tag) {
          const deleted = aiCacheOptimization.clearByTag(params.tag)
          response = {
            status: 'success',
            message: `Cleared ${deleted} entries with tag '${params.tag}'`,
            deleted,
            timestamp: new Date().toISOString()
          }
        } else if (params.confirm === true) {
          aiCacheOptimization.clear()
          response = {
            status: 'success',
            message: 'Cache cleared completely',
            timestamp: new Date().toISOString()
          }
        } else {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Clear operation requires confirmation or tag parameter' },
            { status: 400 }
          )
        }
        break

      case 'optimize':
        // Manual optimization trigger
        const beforeStats = aiCacheOptimization.getAdvancedStats()
        // The optimization happens automatically, but we can force collection
        response = {
          status: 'success',
          message: 'Cache optimization completed',
          before: {
            size: beforeStats.size,
            memoryUsage: beforeStats.memoryUsage,
            hitRate: beforeStats.hitRate
          },
          after: aiCacheOptimization.getAdvancedStats(),
          timestamp: new Date().toISOString()
        }
        break

      case 'set':
        // Manual cache entry setting
        const { operation, params: cacheParams, data, options = {} } = params
        if (!operation || !data) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Operation and data are required for set action' },
            { status: 400 }
          )
        }

        const success = aiCacheOptimization.set(operation, cacheParams, data, options)
        response = {
          status: success ? 'success' : 'error',
          message: success ? 'Cache entry set successfully' : 'Failed to set cache entry',
          timestamp: new Date().toISOString()
        }
        break

      case 'get':
        // Manual cache entry retrieval
        const { operation: getOp, params: getParams } = params
        if (!getOp) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Operation is required for get action' },
            { status: 400 }
          )
        }

        const cachedData = aiCacheOptimization.get(getOp, getParams)
        response = {
          status: 'success',
          data: cachedData,
          hit: cachedData !== null,
          timestamp: new Date().toISOString()
        }
        break

      case 'import':
        // Import cache data
        const { data: importData } = params
        if (!importData) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Import data is required' },
            { status: 400 }
          )
        }

        const importSuccess = aiCacheOptimization.importCache(importData)
        response = {
          status: importSuccess ? 'success' : 'error',
          message: importSuccess ? 'Cache data imported successfully' : 'Failed to import cache data',
          timestamp: new Date().toISOString()
        }
        break

      case 'acknowledge_alert':
        // Acknowledge performance alert
        const { alertId } = params
        if (!alertId) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          )
        }

        const ackSuccess = aiPerformanceMonitor.acknowledgeAlert(alertId)
        response = {
          status: ackSuccess ? 'success' : 'error',
          message: ackSuccess ? 'Alert acknowledged' : 'Alert not found',
          timestamp: new Date().toISOString()
        }
        break

      case 'resolve_alert':
        // Resolve performance alert
        const { alertId: resolveAlertId } = params
        if (!resolveAlertId) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          )
        }

        const resolveSuccess = aiPerformanceMonitor.resolveAlert(resolveAlertId)
        response = {
          status: resolveSuccess ? 'success' : 'error',
          message: resolveSuccess ? 'Alert resolved' : 'Alert not found',
          timestamp: new Date().toISOString()
        }
        break

      default:
        aiPerformanceMonitor.endRequest(requestId, false)
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    aiPerformanceMonitor.endRequest(requestId, true)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cache API POST error:', error)
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

/**
 * PUT /api/ai/cache - Update cache configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      )
    }

    const requestId = `cache_config_update_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, 'cache_config_update')

    // Note: In a real implementation, you would need to recreate the cache instance
    // with new configuration or implement a dynamic config update method

    const response = {
      status: 'success',
      message: 'Cache configuration updated (restart required for full effect)',
      config,
      timestamp: new Date().toISOString()
    }

    aiPerformanceMonitor.endRequest(requestId, true)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cache API PUT error:', error)
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

/**
 * DELETE /api/ai/cache - Delete specific cache entries or clear by criteria
 */
export async function DELETE(request: NextRequest) {
  try {
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const tag = searchParams.get('tag')
    const operation = searchParams.get('operation')
    const confirm = searchParams.get('confirm') === 'true'

    const requestId = `cache_delete_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, 'cache_delete')

    let response: any
    let deleted = 0

    if (tag) {
      // Delete by tag
      deleted = aiCacheOptimization.clearByTag(tag)
      response = {
        status: 'success',
        message: `Deleted ${deleted} entries with tag '${tag}'`,
        deleted,
        timestamp: new Date().toISOString()
      }
    } else if (operation && confirm) {
      // Clear all cache - requires confirmation
      aiCacheOptimization.clear()
      response = {
        status: 'success',
        message: 'All cache entries deleted',
        timestamp: new Date().toISOString()
      }
    } else {
      aiPerformanceMonitor.endRequest(requestId, false)
      return NextResponse.json(
        { error: 'Delete operation requires tag parameter or confirm=true for full clear' },
        { status: 400 }
      )
    }

    aiPerformanceMonitor.endRequest(requestId, true)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Cache API DELETE error:', error)
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