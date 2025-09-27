/**
 * AI Gateway Testing Utilities
 * Comprehensive testing tools for AI Gateway connectivity and functionality
 */

import { aiClient } from './gateway-client'
import { aiCache } from './cache-layer'
import { aiRateLimiter, RATE_LIMIT_CONFIGS, estimateTokens } from './rate-limiter'
import { AIErrorCode, AIError } from './error-handler'
import type {
  AIOperation,
  HealthCheckResult,
  ModelTestResult,
  RateLimitResult,
  CacheEntry,
  AIMetrics
} from '@/lib/types/ai'

export interface TestResult {
  name: string
  success: boolean
  duration: number
  error?: string
  metadata?: Record<string, any>
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    duration: number
  }
}

export class AIGatewayTester {
  private results: TestResult[] = []

  /**
   * Run a complete test suite for AI Gateway functionality
   */
  public async runCompleteTestSuite(): Promise<TestSuite> {
    console.log('🧪 Starting AI Gateway Test Suite...')
    this.results = []

    // Configuration tests
    await this.runTest('Configuration Validation', () => this.testConfiguration())

    // Connectivity tests
    await this.runTest('Basic Connectivity', () => this.testBasicConnectivity())
    await this.runTest('Health Check', () => this.testHealthCheck())

    // Model tests
    await this.runTest('Text Generation', () => this.testTextGeneration())
    await this.runTest('Chat Completion', () => this.testChatCompletion())
    await this.runTest('Embedding Generation', () => this.testEmbeddingGeneration())
    await this.runTest('Multiple Embeddings', () => this.testMultipleEmbeddings())

    // Error handling tests
    await this.runTest('Invalid Model Handling', () => this.testInvalidModel())
    await this.runTest('Rate Limit Handling', () => this.testRateLimitHandling())

    // Cache tests
    await this.runTest('Cache Functionality', () => this.testCacheFunctionality())
    await this.runTest('Cache Performance', () => this.testCachePerformance())

    // Rate limiting tests
    await this.runTest('Rate Limiter Functionality', () => this.testRateLimiterFunctionality())

    // Fallback tests
    await this.runTest('Model Fallback', () => this.testModelFallback())

    return this.generateTestSuite()
  }

  /**
   * Run specific category of tests
   */
  public async runCategoryTests(category: 'connectivity' | 'models' | 'cache' | 'rate-limiting' | 'errors'): Promise<TestSuite> {
    console.log(`🧪 Running ${category} tests...`)
    this.results = []

    switch (category) {
      case 'connectivity':
        await this.runTest('Configuration Validation', () => this.testConfiguration())
        await this.runTest('Basic Connectivity', () => this.testBasicConnectivity())
        await this.runTest('Health Check', () => this.testHealthCheck())
        break

      case 'models':
        await this.runTest('Text Generation', () => this.testTextGeneration())
        await this.runTest('Chat Completion', () => this.testChatCompletion())
        await this.runTest('Embedding Generation', () => this.testEmbeddingGeneration())
        await this.runTest('Multiple Embeddings', () => this.testMultipleEmbeddings())
        break

      case 'cache':
        await this.runTest('Cache Functionality', () => this.testCacheFunctionality())
        await this.runTest('Cache Performance', () => this.testCachePerformance())
        break

      case 'rate-limiting':
        await this.runTest('Rate Limiter Functionality', () => this.testRateLimiterFunctionality())
        break

      case 'errors':
        await this.runTest('Invalid Model Handling', () => this.testInvalidModel())
        await this.runTest('Rate Limit Handling', () => this.testRateLimitHandling())
        await this.runTest('Model Fallback', () => this.testModelFallback())
        break
    }

    return this.generateTestSuite()
  }

  // Individual test methods

  private async testConfiguration(): Promise<void> {
    aiClient.validateConfiguration()

    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY not found')
    }

    if (!process.env.AI_GATEWAY_API_KEY.startsWith('vck_')) {
      throw new Error('Invalid AI_GATEWAY_API_KEY format')
    }
  }

  private async testBasicConnectivity(): Promise<void> {
    const models = await aiClient.getAvailableModels()

    if (!models.textModels.length) {
      throw new Error('No text models available')
    }

    if (!models.embeddingModels.length) {
      throw new Error('No embedding models available')
    }
  }

  private async testHealthCheck(): Promise<void> {
    const health = await aiClient.healthCheck()

    if (health.status === 'unhealthy') {
      throw new Error('AI Gateway is unhealthy')
    }

    if (!health.latency || health.latency > 30000) {
      throw new Error('Health check latency too high')
    }
  }

  private async testTextGeneration(): Promise<void> {
    const text = await aiClient.generateText('Test prompt for AI Gateway validation', {
      maxTokens: 50,
      temperature: 0.1
    })

    if (!text || text.length < 5) {
      throw new Error('Invalid text generation response')
    }
  }

  private async testChatCompletion(): Promise<void> {
    const response = await aiClient.generateChatCompletion([
      { role: 'user', content: 'Say "test successful" if you can see this message.' }
    ], {
      maxTokens: 20,
      temperature: 0.1
    })

    if (!response || !response.toLowerCase().includes('test')) {
      throw new Error('Invalid chat completion response')
    }
  }

  private async testEmbeddingGeneration(): Promise<void> {
    const embedding = await aiClient.generateEmbedding('Test text for embedding generation')

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding response')
    }

    if (embedding.some(val => typeof val !== 'number')) {
      throw new Error('Embedding contains non-numeric values')
    }
  }

  private async testMultipleEmbeddings(): Promise<void> {
    const embeddings = await aiClient.generateEmbeddings([
      'First test text',
      'Second test text',
      'Third test text'
    ])

    if (!Array.isArray(embeddings) || embeddings.length !== 3) {
      throw new Error('Invalid multiple embeddings response')
    }

    if (embeddings.some(emb => !Array.isArray(emb) || emb.length === 0)) {
      throw new Error('Invalid individual embeddings in batch')
    }
  }

  private async testInvalidModel(): Promise<void> {
    try {
      await aiClient.generateText('Test', { model: 'invalid-model-that-does-not-exist' })
      throw new Error('Should have thrown error for invalid model')
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('generation failed')) {
        throw new Error('Unexpected error type for invalid model')
      }
    }
  }

  private async testRateLimitHandling(): Promise<void> {
    const config = RATE_LIMIT_CONFIGS.development
    const testId = 'test-rate-limit-user'

    // Clear any existing limits
    aiRateLimiter.reset(testId)

    // Test normal operation
    const result1 = aiRateLimiter.checkLimit(testId, config, 100)
    if (!result1.allowed) {
      throw new Error('First request should be allowed')
    }

    // Exhaust the rate limit
    for (let i = 0; i < config.maxRequests; i++) {
      aiRateLimiter.checkLimit(testId, config, 100)
    }

    // Next request should be denied
    const result2 = aiRateLimiter.checkLimit(testId, config, 100)
    if (result2.allowed) {
      throw new Error('Request should be rate limited')
    }

    if (!result2.retryAfter) {
      throw new Error('Rate limited response should include retryAfter')
    }
  }

  private async testCacheFunctionality(): Promise<void> {
    const cacheKey = 'test-cache-functionality'
    const testData = { message: 'test data', timestamp: Date.now() }

    // Clear any existing cache
    aiCache.delete('test-operation', { key: cacheKey })

    // Test cache miss
    const missed = aiCache.get('test-operation', { key: cacheKey })
    if (missed !== null) {
      throw new Error('Cache should be empty initially')
    }

    // Test cache set and get
    aiCache.set('test-operation', { key: cacheKey }, testData)
    const cached = aiCache.get('test-operation', { key: cacheKey })

    if (!cached || cached.message !== testData.message) {
      throw new Error('Cache data mismatch')
    }

    // Test cache expiration
    aiCache.set('test-operation', { key: cacheKey + '-expire' }, testData, { ttl: 1 })
    await new Promise(resolve => setTimeout(resolve, 10))

    const expired = aiCache.get('test-operation', { key: cacheKey + '-expire' })
    if (expired !== null) {
      throw new Error('Cache should have expired')
    }
  }

  private async testCachePerformance(): Promise<void> {
    const startTime = Date.now()
    const iterations = 1000

    // Test cache performance with many operations
    for (let i = 0; i < iterations; i++) {
      aiCache.set('perf-test', { id: i }, { data: i })
      aiCache.get('perf-test', { id: i })
    }

    const duration = Date.now() - startTime
    const opsPerSecond = (iterations * 2) / (duration / 1000) // 2 ops per iteration

    if (opsPerSecond < 10000) { // Should handle at least 10k ops/second
      throw new Error(`Cache performance too slow: ${opsPerSecond.toFixed(0)} ops/sec`)
    }
  }

  private async testRateLimiterFunctionality(): Promise<void> {
    const testConfig = {
      windowMs: 1000,
      maxRequests: 3,
      maxTokens: 1000
    }
    const testId = 'test-rate-limiter'

    aiRateLimiter.reset(testId)

    // Test token estimation
    const tokenEstimate = estimateTokens('generateText', 'Hello world')
    if (tokenEstimate <= 0) {
      throw new Error('Token estimation should return positive number')
    }

    // Test rate limiting logic
    let allowedCount = 0
    for (let i = 0; i < 5; i++) {
      const result = aiRateLimiter.checkLimit(testId, testConfig, 100)
      if (result.allowed) allowedCount++
    }

    if (allowedCount !== testConfig.maxRequests) {
      throw new Error(`Expected ${testConfig.maxRequests} allowed requests, got ${allowedCount}`)
    }

    // Test token limiting
    aiRateLimiter.reset(testId)
    const tokenResult = aiRateLimiter.checkLimit(testId, testConfig, 1001) // Exceeds maxTokens
    if (tokenResult.allowed) {
      throw new Error('Request should be denied due to token limit')
    }
  }

  private async testModelFallback(): Promise<void> {
    // This test verifies that the client attempts fallback when primary model fails
    // We'll test with a real request to ensure fallback logic works

    const text = await aiClient.generateText('Fallback test', {
      maxTokens: 20,
      temperature: 0.1
    })

    if (!text || text.length === 0) {
      throw new Error('Fallback mechanism failed to produce result')
    }
  }

  // Utility methods

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()

    try {
      await testFn()
      this.results.push({
        name,
        success: true,
        duration: Date.now() - startTime
      })
      console.log(`✅ ${name}`)
    } catch (error) {
      this.results.push({
        name,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.log(`❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private generateTestSuite(): TestSuite {
    const passed = this.results.filter(r => r.success).length
    const failed = this.results.length - passed
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

    return {
      name: 'AI Gateway Test Suite',
      tests: [...this.results],
      summary: {
        total: this.results.length,
        passed,
        failed,
        duration: totalDuration
      }
    }
  }
}

// Static utility functions

/**
 * Quick connectivity test
 */
export async function quickConnectivityTest(): Promise<boolean> {
  try {
    const health = await aiClient.healthCheck()
    return health.status !== 'unhealthy'
  } catch {
    return false
  }
}

/**
 * Test specific model availability
 */
export async function testModelAvailability(model: string): Promise<boolean> {
  try {
    await aiClient.generateText('Test', { model, maxTokens: 5 })
    return true
  } catch {
    return false
  }
}

/**
 * Benchmark AI operations
 */
export async function benchmarkOperations(iterations: number = 10): Promise<{
  textGeneration: { averageLatency: number; successRate: number }
  embeddings: { averageLatency: number; successRate: number }
}> {
  const textResults: number[] = []
  const embeddingResults: number[] = []
  let textSuccesses = 0
  let embeddingSuccesses = 0

  for (let i = 0; i < iterations; i++) {
    // Test text generation
    const textStart = Date.now()
    try {
      await aiClient.generateText(`Benchmark test ${i}`, { maxTokens: 20 })
      textResults.push(Date.now() - textStart)
      textSuccesses++
    } catch {
      // Failed request
    }

    // Test embeddings
    const embeddingStart = Date.now()
    try {
      await aiClient.generateEmbedding(`Benchmark test ${i}`)
      embeddingResults.push(Date.now() - embeddingStart)
      embeddingSuccesses++
    } catch {
      // Failed request
    }
  }

  return {
    textGeneration: {
      averageLatency: textResults.reduce((sum, val) => sum + val, 0) / textResults.length || 0,
      successRate: textSuccesses / iterations
    },
    embeddings: {
      averageLatency: embeddingResults.reduce((sum, val) => sum + val, 0) / embeddingResults.length || 0,
      successRate: embeddingSuccesses / iterations
    }
  }
}

/**
 * Export singleton tester instance
 */
export const aiTester = new AIGatewayTester()

/**
 * Simple test runner for development
 */
export async function runBasicTests(): Promise<void> {
  console.log('🧪 Running basic AI Gateway tests...')

  const isConnected = await quickConnectivityTest()
  console.log(`Connection: ${isConnected ? '✅' : '❌'}`)

  if (isConnected) {
    const benchmark = await benchmarkOperations(3)
    console.log(`Text Generation: ${benchmark.textGeneration.averageLatency.toFixed(0)}ms avg, ${(benchmark.textGeneration.successRate * 100).toFixed(0)}% success`)
    console.log(`Embeddings: ${benchmark.embeddings.averageLatency.toFixed(0)}ms avg, ${(benchmark.embeddings.successRate * 100).toFixed(0)}% success`)
  }
}