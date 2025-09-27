import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai/gateway-client'
import { aiCache } from '@/lib/ai/cache-layer'
import { aiRateLimiter } from '@/lib/ai/rate-limiter'

/**
 * AI Gateway Health Check Endpoint
 * GET /api/ai/status
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Perform comprehensive health check
    const [healthCheck, cacheStats, rateLimitStats] = await Promise.all([
      aiClient.healthCheck(),
      getCacheStats(),
      getRateLimitStats()
    ])

    const totalLatency = Date.now() - startTime

    const response = {
      status: healthCheck.status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      gateway: {
        status: healthCheck.status,
        models: healthCheck.models,
        latency: healthCheck.latency,
        lastCheck: healthCheck.timestamp.toISOString()
      },
      cache: cacheStats,
      rateLimiting: rateLimitStats,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!process.env.AI_GATEWAY_API_KEY,
        apiKeyValid: process.env.AI_GATEWAY_API_KEY?.startsWith('vck_') || false
      },
      totalLatency
    }

    // Set appropriate HTTP status based on health
    const httpStatus = healthCheck.status === 'healthy' ? 200
                     : healthCheck.status === 'degraded' ? 206
                     : 503

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      gateway: {
        status: 'unhealthy',
        models: {},
        latency: null,
        lastCheck: new Date().toISOString()
      },
      cache: {
        status: 'unknown',
        size: 0,
        maxSize: 0,
        hitRate: 0
      },
      rateLimiting: {
        status: 'unknown',
        totalEntries: 0,
        totalRequests: 0
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!process.env.AI_GATEWAY_API_KEY,
        apiKeyValid: process.env.AI_GATEWAY_API_KEY?.startsWith('vck_') || false
      }
    }

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

/**
 * Detailed AI Gateway Status (requires authentication)
 * POST /api/ai/status
 */
export async function POST(request: NextRequest) {
  try {
    // For now, we'll skip authentication but in production this should be protected
    // const session = await getServerSession(authOptions)
    // if (!session || session.user.role !== 'corporativo') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { testModels = false, includeUsage = false } = await request.json()

    const startTime = Date.now()
    const results: any = {
      timestamp: new Date().toISOString(),
      detailedCheck: true
    }

    // Basic health check
    const healthCheck = await aiClient.healthCheck()
    results.gateway = {
      status: healthCheck.status,
      models: healthCheck.models,
      latency: healthCheck.latency,
      lastCheck: healthCheck.timestamp.toISOString()
    }

    // Test specific models if requested
    if (testModels) {
      results.modelTests = await performDetailedModelTests()
    }

    // Get detailed cache statistics
    results.cache = getCacheStats()

    // Get detailed rate limiting statistics
    if (includeUsage) {
      results.rateLimiting = aiRateLimiter.getGlobalStats()
    }

    // Get available models
    results.availableModels = await aiClient.getAvailableModels()

    // Environment and configuration details
    results.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasApiKey: !!process.env.AI_GATEWAY_API_KEY,
      apiKeyValid: process.env.AI_GATEWAY_API_KEY?.startsWith('vck_') || false,
      configurationStatus: validateConfiguration()
    }

    results.totalLatency = Date.now() - startTime

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Detailed health check failed:', error)

    return NextResponse.json({
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions

function getCacheStats() {
  try {
    const stats = aiCache.getStats()
    return {
      status: 'operational',
      size: stats.size,
      maxSize: stats.maxSize,
      hitRate: stats.hitRate,
      topEntries: stats.entries.slice(0, 5) // Top 5 only for brevity
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown cache error'
    }
  }
}

function getRateLimitStats() {
  try {
    const stats = aiRateLimiter.getGlobalStats()
    return {
      status: 'operational',
      totalEntries: stats.totalEntries,
      totalRequests: stats.totalRequests,
      totalTokens: stats.totalTokens,
      activeUsers: stats.totalEntries
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown rate limit error'
    }
  }
}

async function performDetailedModelTests() {
  const tests = []

  try {
    // Test text generation
    const textStart = Date.now()
    await aiClient.generateText('Health check test', { maxTokens: 10 })
    tests.push({
      type: 'text_generation',
      status: 'success',
      latency: Date.now() - textStart
    })
  } catch (error) {
    tests.push({
      type: 'text_generation',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  try {
    // Test embeddings
    const embeddingStart = Date.now()
    await aiClient.generateEmbedding('Health check test')
    tests.push({
      type: 'embedding_generation',
      status: 'success',
      latency: Date.now() - embeddingStart
    })
  } catch (error) {
    tests.push({
      type: 'embedding_generation',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return tests
}

function validateConfiguration() {
  const issues = []

  if (!process.env.AI_GATEWAY_API_KEY) {
    issues.push('Missing AI_GATEWAY_API_KEY environment variable')
  } else if (!process.env.AI_GATEWAY_API_KEY.startsWith('vck_')) {
    issues.push('Invalid AI_GATEWAY_API_KEY format')
  }

  return {
    valid: issues.length === 0,
    issues
  }
}