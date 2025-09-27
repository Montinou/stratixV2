import { NextRequest, NextResponse } from 'next/server'
import { aiPerformanceMonitor } from '@/lib/ai/performance-monitor'
import { aiCacheOptimization } from '@/lib/ai/cache-optimization'

/**
 * AI Metrics Collection API
 * Provides detailed performance metrics, trends, and analytics
 */

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 200 // Higher limit for metrics
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
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         'anonymous'
}

/**
 * GET /api/ai/metrics - Get performance metrics and analytics
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
    const type = searchParams.get('type') || 'current'
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000') // 1 hour default

    const requestId = `metrics_${type}_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, `metrics_${type}`)

    let response: any

    switch (type) {
      case 'current':
        // Current real-time metrics
        const status = aiPerformanceMonitor.getStatus()
        const cacheStats = aiCacheOptimization.getAdvancedStats()

        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            overall: status.overall,
            performance: status.metrics,
            cache: {
              hitRate: cacheStats.hitRate,
              missRate: cacheStats.missRate,
              size: cacheStats.size,
              maxSize: cacheStats.maxSize,
              memoryUsage: cacheStats.memoryUsage,
              costSavings: cacheStats.costSavings,
              warmingStatus: cacheStats.warmingStatus
            },
            alerts: {
              active: status.activeAlerts.length,
              critical: status.activeAlerts.filter(a => a.severity === 'critical').length,
              warning: status.activeAlerts.filter(a => a.severity === 'warning').length
            }
          }
        }
        break

      case 'trends':
        // Performance trends and insights
        const insights = aiPerformanceMonitor.generateInsights()
        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            trends: insights.trends,
            predictions: insights.predictions,
            optimizations: insights.optimizations
          }
        }
        break

      case 'detailed':
        // Detailed metrics report
        const report = aiPerformanceMonitor.getReport(timeRange)
        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            timeRange,
            summary: report.summary,
            insights: report.insights,
            bottlenecks: report.bottlenecks,
            alerts: report.alerts,
            recommendations: report.recommendations
          }
        }
        break

      case 'cache':
        // Cache-specific metrics
        const cacheDetailedStats = aiCacheOptimization.getAdvancedStats()
        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            stats: cacheDetailedStats,
            popularQueries: cacheDetailedStats.popularQueries.map(query => ({
              hits: query.hits,
              cost: query.cost,
              popularityScore: query.popularityScore,
              lastAccess: query.lastAccess,
              size: query.size
            }))
          }
        }
        break

      case 'alerts':
        // Active alerts and bottlenecks
        const alertStatus = aiPerformanceMonitor.getStatus()
        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            activeAlerts: alertStatus.activeAlerts,
            recentBottlenecks: alertStatus.recentBottlenecks,
            summary: {
              total: alertStatus.activeAlerts.length,
              critical: alertStatus.activeAlerts.filter(a => a.severity === 'critical').length,
              warning: alertStatus.activeAlerts.filter(a => a.severity === 'warning').length,
              acknowledged: alertStatus.activeAlerts.filter(a => a.acknowledged).length
            }
          }
        }
        break

      case 'export':
        // Export all performance data
        const exportData = aiPerformanceMonitor.exportData()
        response = {
          status: 'success',
          data: {
            timestamp: new Date().toISOString(),
            export: exportData,
            format: 'json',
            version: '1.0'
          }
        }
        break

      default:
        aiPerformanceMonitor.endRequest(requestId, false)
        return NextResponse.json(
          { error: 'Invalid metrics type' },
          { status: 400 }
        )
    }

    aiPerformanceMonitor.endRequest(requestId, true)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Metrics API error:', error)
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
 * POST /api/ai/metrics - Record custom metrics or trigger analysis
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
    const { action, data } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const requestId = `metrics_${action}_${Date.now()}`
    aiPerformanceMonitor.startRequest(requestId, `metrics_${action}`)

    let response: any

    switch (action) {
      case 'record_request':
        // Record a custom request for tracking
        const { operation, responseTime, success = true, cost = 0, cacheHit = false } = data
        if (!operation || responseTime === undefined) {
          aiPerformanceMonitor.endRequest(requestId, false)
          return NextResponse.json(
            { error: 'Operation and responseTime are required' },
            { status: 400 }
          )
        }

        // This would integrate with the actual tracking system
        response = {
          status: 'success',
          message: 'Request metrics recorded',
          timestamp: new Date().toISOString()
        }
        break

      case 'trigger_analysis':
        // Trigger immediate bottleneck analysis
        const currentStatus = aiPerformanceMonitor.getStatus()
        const insights = aiPerformanceMonitor.generateInsights()

        response = {
          status: 'success',
          data: {
            analysis: {
              overall: currentStatus.overall,
              bottlenecks: currentStatus.recentBottlenecks,
              insights: insights,
              recommendations: insights.optimizations
            },
            timestamp: new Date().toISOString()
          }
        }
        break

      case 'benchmark':
        // Run performance benchmark
        const benchmark = {
          cachePerformance: {
            hitRatio: aiCacheOptimization.getAdvancedStats().hitRate,
            averageResponseTime: 0, // Would calculate from recent metrics
            memoryEfficiency: aiCacheOptimization.getAdvancedStats().memoryUsage
          },
          systemPerformance: {
            overallHealth: aiPerformanceMonitor.getStatus().overall,
            throughput: aiPerformanceMonitor.getStatus().metrics?.throughput || 0,
            errorRate: aiPerformanceMonitor.getStatus().metrics?.errorRate || 0
          },
          timestamp: new Date().toISOString()
        }

        response = {
          status: 'success',
          data: {
            benchmark,
            timestamp: new Date().toISOString()
          }
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
    console.error('Metrics POST API error:', error)
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