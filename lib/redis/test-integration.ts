/**
 * Redis Integration Test Suite
 * Comprehensive testing of Redis infrastructure with memory monitoring
 * Optimized for free tier validation and performance benchmarking
 */

import { getRedisClient } from './client'
import { aiCacheManager } from './cache-manager'
import { redisRateLimiter } from '../ai/rate-limiter-redis'
import { redisConversationManager } from '../ai/conversation-manager-redis'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  duration: number
  details: string
  memoryUsed?: number
  recommendations?: string[]
}

interface TestSuite {
  status: 'pass' | 'fail' | 'warning'
  totalTests: number
  passed: number
  failed: number
  warnings: number
  totalDuration: number
  memoryBaseline: number
  memoryPeak: number
  results: TestResult[]
  summary: string[]
}

export class RedisIntegrationTester {
  private startTime: number = 0
  private redisClient: any = null
  private memoryBaseline: number = 0

  async runFullTestSuite(): Promise<TestSuite> {
    console.log('🧪 Starting Redis Integration Test Suite...')
    this.startTime = Date.now()

    const results: TestResult[] = []
    let memoryPeak = 0

    try {
      // Initialize Redis client
      this.redisClient = getRedisClient()
      const initialStats = await this.redisClient.getStats()
      this.memoryBaseline = initialStats.usedMemory

      console.log(`📊 Memory baseline: ${initialStats.usedMemoryHuman}`)

      // Test 1: Basic Redis connectivity
      results.push(await this.testRedisConnectivity())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 2: Redis client operations
      results.push(await this.testBasicOperations())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 3: Multi-tier cache manager
      results.push(await this.testCacheManager())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 4: Rate limiter with Redis
      results.push(await this.testRateLimiter())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 5: Conversation manager caching
      results.push(await this.testConversationManager())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 6: Memory efficiency and cleanup
      results.push(await this.testMemoryEfficiency())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 7: Performance benchmarks
      results.push(await this.testPerformanceBenchmarks())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

      // Test 8: Free tier optimization
      results.push(await this.testFreeTierOptimization())
      memoryPeak = Math.max(memoryPeak, await this.getMemoryUsage())

    } catch (error) {
      results.push({
        name: 'Test Suite Initialization',
        status: 'fail',
        duration: Date.now() - this.startTime,
        details: `Failed to initialize test suite: ${error}`,
        recommendations: ['Check Redis connection and environment variables']
      })
    }

    // Generate summary
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const warnings = results.filter(r => r.status === 'warning').length
    const totalDuration = Date.now() - this.startTime

    const status = failed > 0 ? 'fail' : warnings > 0 ? 'warning' : 'pass'

    const summary = this.generateTestSummary(results, memoryPeak)

    const testSuite: TestSuite = {
      status,
      totalTests: results.length,
      passed,
      failed,
      warnings,
      totalDuration,
      memoryBaseline: this.memoryBaseline,
      memoryPeak,
      results,
      summary
    }

    this.logTestResults(testSuite)
    return testSuite
  }

  private async testRedisConnectivity(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Redis Connectivity'

    try {
      // Test basic connection
      const isConnected = this.redisClient.isConnected()
      if (!isConnected) {
        throw new Error('Redis client not connected')
      }

      // Test ping
      const pingResult = await this.redisClient.ping()
      if (!pingResult) {
        throw new Error('Redis ping failed')
      }

      // Test basic stats
      const stats = await this.redisClient.getStats()
      if (!stats.connected) {
        throw new Error('Redis stats indicate disconnected state')
      }

      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'pass',
        duration,
        details: `Connected successfully. Uptime: ${stats.uptime}s, Memory: ${stats.usedMemoryHuman}`,
        memoryUsed: stats.usedMemory
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Connection failed: ${error}`,
        recommendations: ['Check REDIS_URL environment variable', 'Verify Redis server is running']
      }
    }
  }

  private async testBasicOperations(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Basic Redis Operations'

    try {
      const client = await this.redisClient.getClient()
      const testKey = 'test:integration:basic'
      const testValue = { message: 'Hello Redis!', timestamp: Date.now() }

      // Test SET operation
      const compressed = this.redisClient.compressData(testValue)
      await client.setex(testKey, 60, compressed)

      // Test GET operation
      const retrieved = await client.get(testKey)
      if (!retrieved) {
        throw new Error('Failed to retrieve stored value')
      }

      const decompressed = this.redisClient.decompressData(retrieved)
      if (decompressed.message !== testValue.message) {
        throw new Error('Data integrity check failed')
      }

      // Test DEL operation
      const deleted = await client.del(testKey)
      if (deleted !== 1) {
        throw new Error('Failed to delete test key')
      }

      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'pass',
        duration,
        details: `All operations successful. Compression working correctly.`,
        memoryUsed: await this.getMemoryUsage()
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Basic operations failed: ${error}`,
        recommendations: ['Check Redis command permissions', 'Verify compression/decompression logic']
      }
    }
  }

  private async testCacheManager(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Multi-Tier Cache Manager'

    try {
      const testData = {
        operation: 'test_insights',
        data: { insights: ['Insight 1', 'Insight 2'], confidence: 0.95 },
        timestamp: Date.now()
      }

      // Test cache set
      await aiCacheManager.set('test_operation', { param: 'value' }, testData)

      // Test cache get
      const retrieved = await aiCacheManager.get('test_operation', { param: 'value' })
      if (!retrieved || retrieved.data.insights.length !== 2) {
        throw new Error('Cache retrieval failed or data corrupted')
      }

      // Test cache stats
      const stats = await aiCacheManager.getStats()
      if (!stats.l1 || !stats.l2 || !stats.total) {
        throw new Error('Cache stats incomplete')
      }

      // Test cache deletion
      const deleted = await aiCacheManager.delete('test_operation', { param: 'value' })
      if (!deleted) {
        throw new Error('Cache deletion failed')
      }

      const duration = Date.now() - testStart
      const recommendations = []

      if (stats.l2.hitRate < 0.5) {
        recommendations.push('L2 cache hit rate is low - consider TTL optimization')
      }

      if (!stats.l2.connected) {
        recommendations.push('L2 cache (Redis) not connected - using L1/L3 fallback')
      }

      return {
        name: testName,
        status: stats.l2.connected ? 'pass' : 'warning',
        duration,
        details: `L1 size: ${stats.l1.size}, L2 connected: ${stats.l2.connected}, Hit rate: ${(stats.total.hitRate * 100).toFixed(1)}%`,
        memoryUsed: await this.getMemoryUsage(),
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Cache manager test failed: ${error}`,
        recommendations: ['Check cache manager initialization', 'Verify Redis connection']
      }
    }
  }

  private async testRateLimiter(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Redis Rate Limiter'

    try {
      const testUser = 'test_user_integration'
      const config = {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        maxTokens: 1000,
        keyPrefix: 'test_rl'
      }

      // Test rate limit check (should allow)
      const firstCheck = await redisRateLimiter.checkLimit(testUser, config, 100)
      if (!firstCheck.allowed) {
        throw new Error('First rate limit check should be allowed')
      }

      // Test multiple requests
      for (let i = 0; i < 4; i++) {
        const check = await redisRateLimiter.checkLimit(testUser, config, 100)
        if (!check.allowed) {
          throw new Error(`Request ${i + 2} should be allowed`)
        }
      }

      // Test rate limit exceeded
      const limitCheck = await redisRateLimiter.checkLimit(testUser, config, 100)
      if (limitCheck.allowed) {
        throw new Error('Rate limit should be exceeded')
      }

      // Test usage stats
      const usage = await redisRateLimiter.getUsage(testUser, config.windowMs, config.keyPrefix)
      if (usage.requests !== 5) {
        throw new Error(`Expected 5 requests, got ${usage.requests}`)
      }

      // Test cleanup
      await redisRateLimiter.reset(testUser, config.keyPrefix)

      const duration = Date.now() - testStart
      const recommendations = []

      if (!usage.usedRedis) {
        recommendations.push('Rate limiter using database fallback - Redis unavailable')
      }

      return {
        name: testName,
        status: usage.usedRedis ? 'pass' : 'warning',
        duration,
        details: `Rate limiting working correctly. Redis used: ${usage.usedRedis}`,
        memoryUsed: await this.getMemoryUsage(),
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Rate limiter test failed: ${error}`,
        recommendations: ['Check rate limiter Redis implementation', 'Verify sliding window logic']
      }
    }
  }

  private async testConversationManager(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Redis Conversation Manager'

    try {
      const testConversationId = 'test_conv_integration'
      const testUserContext = {
        userId: 'test_user_conv',
        role: 'empleado' as const,
        profile: { id: 'test', name: 'Test User', email: 'test@example.com' } as any,
        companySize: 'startup' as const
      }

      // Test conversation initialization
      const context = await redisConversationManager.initializeConversation(
        testConversationId,
        testUserContext,
        [],
        []
      )

      if (!context || context.conversationId !== testConversationId) {
        throw new Error('Conversation initialization failed')
      }

      // Test adding messages
      const testMessage = {
        role: 'user' as const,
        content: 'This is a test message for Redis integration'
      }

      const updatedContext = await redisConversationManager.addMessage(
        testConversationId,
        testMessage,
        false
      )

      if (updatedContext.sessionMetadata.messageCount === 0) {
        throw new Error('Message count not updated')
      }

      // Test conversation history
      const history = await redisConversationManager.getConversationHistory(testConversationId, 10)
      if (history.length === 0) {
        throw new Error('Conversation history empty')
      }

      // Test cache stats
      const stats = await redisConversationManager.getCacheStats()

      const duration = Date.now() - testStart
      const recommendations = []

      if (!stats.redisAvailable) {
        recommendations.push('Conversation manager using database fallback - Redis unavailable')
      }

      if (stats.activeSessions > 50) {
        recommendations.push('High number of active sessions - consider cleanup')
      }

      return {
        name: testName,
        status: stats.redisAvailable ? 'pass' : 'warning',
        duration,
        details: `Conversations working. Active sessions: ${stats.activeSessions}, Redis: ${stats.redisAvailable}`,
        memoryUsed: await this.getMemoryUsage(),
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Conversation manager test failed: ${error}`,
        recommendations: ['Check conversation manager Redis implementation', 'Verify session caching logic']
      }
    }
  }

  private async testMemoryEfficiency(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Memory Efficiency & Cleanup'

    try {
      const beforeStats = await this.redisClient.getStats()
      const beforeMemory = beforeStats.usedMemory

      // Create some test data to measure memory usage
      const client = await this.redisClient.getClient()
      const testKeys = []

      for (let i = 0; i < 100; i++) {
        const key = `test:memory:${i}`
        const value = this.redisClient.compressData({
          data: `Test data ${i}`.repeat(10),
          timestamp: Date.now(),
          metadata: { test: true, index: i }
        })
        await client.setex(key, 300, value) // 5 minute TTL
        testKeys.push(key)
      }

      const afterCreateStats = await this.redisClient.getStats()
      const memoryIncrease = afterCreateStats.usedMemory - beforeMemory

      // Test cleanup
      const cleanupResult = await this.redisClient.cleanup()

      // Clean up test keys
      await client.del(...testKeys)

      const afterCleanupStats = await this.redisClient.getStats()
      const memoryAfterCleanup = afterCleanupStats.usedMemory

      const duration = Date.now() - testStart
      const memoryEfficiency = memoryIncrease > 0 ? (memoryIncrease - (memoryAfterCleanup - beforeMemory)) / memoryIncrease : 0

      const recommendations = []
      const freetierUsage = (afterCleanupStats.usedMemory / (100 * 1024 * 1024)) * 100

      if (freetierUsage > 75) {
        recommendations.push('Memory usage >75% of typical free tier limit')
      }

      if (memoryEfficiency < 0.5) {
        recommendations.push('Low memory cleanup efficiency - review TTL policies')
      }

      return {
        name: testName,
        status: freetierUsage > 90 ? 'warning' : 'pass',
        duration,
        details: `Memory increase: ${Math.round(memoryIncrease / 1024)}KB, Cleanup efficiency: ${(memoryEfficiency * 100).toFixed(1)}%, Free tier usage: ${freetierUsage.toFixed(1)}%`,
        memoryUsed: afterCleanupStats.usedMemory,
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Memory efficiency test failed: ${error}`,
        recommendations: ['Check memory monitoring logic', 'Verify cleanup mechanisms']
      }
    }
  }

  private async testPerformanceBenchmarks(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Performance Benchmarks'

    try {
      const client = await this.redisClient.getClient()
      const iterations = 50

      // Test write performance
      const writeStart = Date.now()
      for (let i = 0; i < iterations; i++) {
        const key = `perf:write:${i}`
        const value = this.redisClient.compressData({ iteration: i, data: 'performance test data' })
        await client.setex(key, 60, value)
      }
      const writeTime = Date.now() - writeStart

      // Test read performance
      const readStart = Date.now()
      for (let i = 0; i < iterations; i++) {
        const key = `perf:write:${i}`
        const value = await client.get(key)
        if (value) {
          this.redisClient.decompressData(value)
        }
      }
      const readTime = Date.now() - readStart

      // Test latency
      const latencyTests = []
      for (let i = 0; i < 10; i++) {
        const pingStart = Date.now()
        await this.redisClient.ping()
        latencyTests.push(Date.now() - pingStart)
      }
      const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length

      // Cleanup
      const deleteKeys = Array.from({ length: iterations }, (_, i) => `perf:write:${i}`)
      await client.del(...deleteKeys)

      const duration = Date.now() - testStart
      const writeOpsPerSec = Math.round((iterations / writeTime) * 1000)
      const readOpsPerSec = Math.round((iterations / readTime) * 1000)

      const recommendations = []
      if (avgLatency > 100) {
        recommendations.push('High average latency detected - check network connectivity')
      }
      if (writeOpsPerSec < 10) {
        recommendations.push('Low write performance - consider Redis optimization')
      }

      return {
        name: testName,
        status: avgLatency < 500 ? 'pass' : 'warning',
        duration,
        details: `Write: ${writeOpsPerSec} ops/sec, Read: ${readOpsPerSec} ops/sec, Avg latency: ${avgLatency.toFixed(1)}ms`,
        memoryUsed: await this.getMemoryUsage(),
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Performance benchmark failed: ${error}`,
        recommendations: ['Check Redis performance', 'Verify compression overhead']
      }
    }
  }

  private async testFreeTierOptimization(): Promise<TestResult> {
    const testStart = Date.now()
    const testName = 'Free Tier Optimization'

    try {
      const stats = await this.redisClient.getStats()
      const healthCheck = await this.redisClient.checkHealth()

      // Calculate free tier metrics
      const assumedFreeTierLimit = 100 * 1024 * 1024 // 100MB
      const memoryUsagePercent = (stats.usedMemory / assumedFreeTierLimit) * 100
      const keyspaceEfficiency = stats.keyspace.db0 ? (stats.keyspace.db0.keys / 10000) * 100 : 0 // Assume 10k key soft limit

      // Test compression efficiency
      const testData = { message: 'Test data for compression efficiency', repeated: 'x'.repeat(1000) }
      const uncompressed = JSON.stringify(testData)
      const compressed = this.redisClient.compressData(testData)
      const compressionRatio = compressed.length / uncompressed.length

      const duration = Date.now() - testStart
      const recommendations = []

      if (memoryUsagePercent > 75) {
        recommendations.push('Memory usage >75% - implement aggressive cleanup')
        recommendations.push('Consider shorter TTL policies for non-critical data')
      }

      if (keyspaceEfficiency > 75) {
        recommendations.push('High key count - implement key cleanup strategies')
      }

      if (compressionRatio > 0.8) {
        recommendations.push('Low compression efficiency - review data structures')
      }

      if (!healthCheck.healthy) {
        recommendations.push('Health check issues detected - see specific alerts')
      }

      const status = memoryUsagePercent > 90 || !healthCheck.healthy ? 'warning' : 'pass'

      return {
        name: testName,
        status,
        duration,
        details: `Memory: ${memoryUsagePercent.toFixed(1)}%, Keys efficiency: ${keyspaceEfficiency.toFixed(1)}%, Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`,
        memoryUsed: stats.usedMemory,
        recommendations
      }

    } catch (error) {
      const duration = Date.now() - testStart
      return {
        name: testName,
        status: 'fail',
        duration,
        details: `Free tier optimization test failed: ${error}`,
        recommendations: ['Check Redis monitoring capabilities', 'Verify optimization strategies']
      }
    }
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const stats = await this.redisClient.getStats()
      return stats.usedMemory
    } catch {
      return 0
    }
  }

  private generateTestSummary(results: TestResult[], memoryPeak: number): string[] {
    const summary = []
    const memoryIncrease = memoryPeak - this.memoryBaseline

    summary.push(`📊 Test Summary:`)
    summary.push(`- Total Tests: ${results.length}`)
    summary.push(`- Passed: ${results.filter(r => r.status === 'pass').length}`)
    summary.push(`- Warnings: ${results.filter(r => r.status === 'warning').length}`)
    summary.push(`- Failed: ${results.filter(r => r.status === 'fail').length}`)
    summary.push(`- Memory Baseline: ${Math.round(this.memoryBaseline / 1024)}KB`)
    summary.push(`- Memory Peak: ${Math.round(memoryPeak / 1024)}KB (+${Math.round(memoryIncrease / 1024)}KB)`)

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
    summary.push(`- Average Test Duration: ${avgDuration.toFixed(0)}ms`)

    // Add recommendations from failed/warning tests
    const allRecommendations = results
      .filter(r => r.recommendations && r.recommendations.length > 0)
      .flatMap(r => r.recommendations!)

    if (allRecommendations.length > 0) {
      summary.push(`📋 Key Recommendations:`)
      const uniqueRecommendations = [...new Set(allRecommendations)]
      uniqueRecommendations.slice(0, 5).forEach(rec => {
        summary.push(`- ${rec}`)
      })
    }

    return summary
  }

  private logTestResults(suite: TestSuite): void {
    console.log('\n' + '='.repeat(60))
    console.log('🧪 REDIS INTEGRATION TEST RESULTS')
    console.log('='.repeat(60))

    suite.results.forEach(result => {
      const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      console.log(`${statusIcon} ${result.name} (${result.duration}ms)`)
      console.log(`   ${result.details}`)

      if (result.memoryUsed) {
        console.log(`   Memory: ${Math.round(result.memoryUsed / 1024)}KB`)
      }

      if (result.recommendations && result.recommendations.length > 0) {
        console.log(`   Recommendations: ${result.recommendations.join(', ')}`)
      }
      console.log('')
    })

    console.log('='.repeat(60))
    suite.summary.forEach(line => console.log(line))
    console.log('='.repeat(60))

    const finalStatus = suite.status === 'pass' ? '✅ ALL TESTS PASSED'
      : suite.status === 'warning' ? '⚠️ TESTS COMPLETED WITH WARNINGS'
      : '❌ SOME TESTS FAILED'

    console.log(finalStatus)
    console.log(`Total Duration: ${suite.totalDuration}ms`)
    console.log('='.repeat(60) + '\n')
  }
}

/**
 * Run Redis integration tests
 */
export async function runRedisIntegrationTests(): Promise<TestSuite> {
  const tester = new RedisIntegrationTester()
  return await tester.runFullTestSuite()
}

/**
 * Quick health check for Redis services
 */
export async function quickRedisHealthCheck(): Promise<{
  redis: boolean
  cache: boolean
  rateLimiter: boolean
  conversations: boolean
}> {
  try {
    const redisClient = getRedisClient()
    const redis = redisClient.isConnected()

    const cache = await aiCacheManager.getStats().then(() => true).catch(() => false)
    const rateLimiter = redisRateLimiter.isRedisAvailable()
    const conversations = redisConversationManager.isRedisAvailable()

    return { redis, cache, rateLimiter, conversations }
  } catch {
    return { redis: false, cache: false, rateLimiter: false, conversations: false }
  }
}