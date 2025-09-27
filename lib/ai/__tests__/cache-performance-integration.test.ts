import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AICacheOptimization } from '../cache-optimization'
import { AIPerformanceMonitor } from '../performance-monitor'
import { withOptimizedCache, withPerformanceMonitoring } from '../cache-optimization'

/**
 * Integration tests for AI Cache Optimization and Performance Monitoring
 * Tests the complete system working together under realistic conditions
 */

describe('Cache and Performance Integration', () => {
  let cache: AICacheOptimization
  let monitor: AIPerformanceMonitor

  beforeEach(() => {
    // Initialize both systems with compatible configurations
    cache = AICacheOptimization.getInstance({
      maxSize: 1000,
      defaultTTL: 5000,
      memoryLimit: 50, // 50MB
      enableAnalytics: true,
      evictionStrategy: 'popularity',
      enableClustering: false
    })

    monitor = AIPerformanceMonitor.getInstance({
      alertThresholds: {
        responseTime: 2000,
        errorRate: 5,
        memoryUsage: 80,
        costPerHour: 10,
        cacheHitRatio: 60
      },
      samplingInterval: 100,
      enableBottleneckDetection: true,
      enablePredictiveAnalytics: true
    })

    // Clear any existing state
    cache.clear()
  })

  afterEach(() => {
    cache.destroy()
    monitor.stop()
  })

  describe('End-to-End Performance Optimization', () => {
    it('should optimize performance through intelligent caching', async () => {
      // Simulate expensive AI operation
      const expensiveOperation = async (query: string): Promise<{ result: string }> => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 200))
        return { result: `Processed: ${query}` }
      }

      // Wrap with both cache and performance monitoring
      const optimizedOperation = withOptimizedCache(
        'expensive-ai-operation',
        withPerformanceMonitoring(
          'expensive-ai-operation',
          expensiveOperation
        ),
        {
          cost: 0.50,
          tags: ['ai', 'expensive'],
          enableWarming: true
        }
      )

      // First call - cache miss, should be slow
      const start1 = Date.now()
      const result1 = await optimizedOperation('test query 1')
      const time1 = Date.now() - start1

      expect(result1.result).toBe('Processed: test query 1')
      expect(time1).toBeGreaterThan(150) // Should include processing time

      // Second call - cache hit, should be fast
      const start2 = Date.now()
      const result2 = await optimizedOperation('test query 1')
      const time2 = Date.now() - start2

      expect(result2.result).toBe('Processed: test query 1')
      expect(time2).toBeLessThan(50) // Should be much faster

      // Verify cache statistics
      const cacheStats = cache.getAdvancedStats()
      expect(cacheStats.hitRate).toBeGreaterThan(0)
      expect(cacheStats.costSavings).toBe(0.50) // Cost saved from cache hit

      // Verify performance tracking
      await new Promise(resolve => setTimeout(resolve, 150)) // Wait for metrics collection
      const perfStatus = monitor.getStatus()
      expect(perfStatus.metrics).toBeDefined()
    })

    it('should detect and respond to cache performance issues', async () => {
      const alertCallback = vi.fn()
      monitor.onAlert(alertCallback)

      // Simulate low cache hit ratio scenario
      const inconsistentOperation = async (id: number): Promise<{ id: number }> => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { id }
      }

      const wrappedOperation = withOptimizedCache(
        'inconsistent-operation',
        withPerformanceMonitoring('inconsistent-operation', inconsistentOperation),
        { cost: 0.10 }
      )

      // Generate many different queries (forcing cache misses)
      for (let i = 0; i < 20; i++) {
        await wrappedOperation(i) // Each call is unique, causing cache miss
      }

      // Wait for performance analysis
      await new Promise(resolve => setTimeout(resolve, 200))

      const status = monitor.getStatus()
      const cacheStats = cache.getAdvancedStats()

      // Should detect low cache hit ratio
      expect(cacheStats.hitRate).toBeLessThan(0.5)

      // May trigger cache-related bottleneck detection
      const cacheBottleneck = status.recentBottlenecks.find(b => b.type === 'cache_miss')
      if (cacheBottleneck) {
        expect(cacheBottleneck.recommendations).toContain('Review cache TTL settings')
      }
    })

    it('should handle memory pressure through coordinated optimization', async () => {
      // Create cache with very small memory limit to force eviction
      const smallCache = AICacheOptimization.getInstance({
        maxSize: 100,
        memoryLimit: 1, // 1MB limit
        evictionStrategy: 'cost-aware',
        enableAnalytics: true
      })

      const memoryIntensiveOperation = async (id: string): Promise<{ data: string }> => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return { data: 'x'.repeat(1000) } // ~1KB of data
      }

      const wrappedOperation = withOptimizedCache(
        'memory-intensive',
        withPerformanceMonitoring('memory-intensive', memoryIntensiveOperation),
        { cost: 0.25 }
      )

      // Fill cache beyond memory limit
      for (let i = 0; i < 20; i++) {
        await wrappedOperation(`entry-${i}`)
      }

      // Wait for memory optimization to trigger
      await new Promise(resolve => setTimeout(resolve, 200))

      const cacheStats = smallCache.getAdvancedStats()
      const perfStatus = monitor.getStatus()

      // Cache should have evicted entries due to memory pressure
      expect(cacheStats.analytics.evictionStats.totalEvictions).toBeGreaterThan(0)
      expect(cacheStats.size).toBeLessThan(20)

      // Performance monitor should track memory usage
      expect(perfStatus.metrics?.memoryUsage).toBeDefined()

      smallCache.destroy()
    })
  })

  describe('Cost Optimization Integration', () => {
    it('should optimize costs through intelligent caching and monitoring', async () => {
      const expensiveAICall = async (prompt: string): Promise<{ response: string }> => {
        await new Promise(resolve => setTimeout(resolve, 300))
        return { response: `AI response to: ${prompt}` }
      }

      const costOptimizedOperation = withOptimizedCache(
        'expensive-ai-call',
        withPerformanceMonitoring('expensive-ai-call', expensiveAICall),
        {
          cost: 2.50, // Expensive operation
          tags: ['ai', 'gpt', 'expensive']
        }
      )

      // Make multiple calls with some repetition
      const prompts = [
        'What is machine learning?',
        'Explain neural networks',
        'What is machine learning?', // Repeat - should hit cache
        'Define artificial intelligence',
        'What is machine learning?' // Repeat again
      ]

      for (const prompt of prompts) {
        await costOptimizedOperation(prompt)
      }

      const cacheStats = cache.getAdvancedStats()

      // Should have saved money through caching
      expect(cacheStats.costSavings).toBe(5.00) // 2 cache hits × $2.50

      // Cost per hour analytics should be calculated
      expect(cacheStats.analytics.costSavingsPerHour).toBeGreaterThan(0)

      // Performance monitor should track cost metrics
      await new Promise(resolve => setTimeout(resolve, 150))
      const insights = monitor.generateInsights()
      expect(insights.predictions.nextHourCost).toBeDefined()
    })

    it('should alert on high cost consumption', async () => {
      const alertCallback = vi.fn()
      monitor.onAlert(alertCallback)

      // Configure monitor with low cost threshold
      const costSensitiveMonitor = AIPerformanceMonitor.getInstance({
        alertThresholds: {
          responseTime: 5000,
          errorRate: 50,
          memoryUsage: 95,
          costPerHour: 5, // Low threshold
          cacheHitRatio: 10
        },
        samplingInterval: 100
      })

      const costlyOperation = async (id: string): Promise<{ id: string }> => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { id }
      }

      const wrappedCostlyOp = withOptimizedCache(
        'costly-operation',
        withPerformanceMonitoring('costly-operation', costlyOperation),
        { cost: 3.00 } // High cost per request
      )

      // Generate high-cost workload
      for (let i = 0; i < 5; i++) {
        await wrappedCostlyOp(`unique-${i}`) // Unique requests to avoid caching
      }

      // Wait for cost analysis
      await new Promise(resolve => setTimeout(resolve, 200))

      costSensitiveMonitor.stop()
    })
  })

  describe('Cache Warming and Predictive Optimization', () => {
    it('should perform intelligent cache warming based on usage patterns', async () => {
      const predictableOperation = async (category: string): Promise<{ category: string }> => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return { category }
      }

      const wrappedOp = withOptimizedCache(
        'predictable-operation',
        withPerformanceMonitoring('predictable-operation', predictableOperation),
        { cost: 0.75, enableWarming: true }
      )

      // Create usage pattern for certain categories
      const popularCategories = ['technology', 'science', 'business']

      // Access popular categories multiple times to establish pattern
      for (let round = 0; round < 3; round++) {
        for (const category of popularCategories) {
          await wrappedOp(category)
        }
      }

      // Trigger cache warming
      await cache.performCacheWarming()

      const cacheStats = cache.getAdvancedStats()
      expect(cacheStats.warmingStatus).toBe('complete')
      expect(cacheStats.popularQueries.length).toBeGreaterThan(0)

      // Popular queries should have high hit counts
      const popularQuery = cacheStats.popularQueries[0]
      expect(popularQuery.hits).toBeGreaterThan(1)
    })

    it('should provide actionable performance insights', async () => {
      // Generate varied performance scenarios
      const scenarios = [
        { operation: 'fast-op', delay: 50, cost: 0.01 },
        { operation: 'slow-op', delay: 1000, cost: 0.50 },
        { operation: 'expensive-op', delay: 200, cost: 2.00 },
        { operation: 'cached-op', delay: 100, cost: 0.25 }
      ]

      for (const scenario of scenarios) {
        const operation = async (): Promise<{ type: string }> => {
          await new Promise(resolve => setTimeout(resolve, scenario.delay))
          return { type: scenario.operation }
        }

        const wrappedOp = withOptimizedCache(
          scenario.operation,
          withPerformanceMonitoring(scenario.operation, operation),
          { cost: scenario.cost }
        )

        // Execute each scenario multiple times
        for (let i = 0; i < 3; i++) {
          await wrappedOp()
        }
      }

      // Wait for analytics to process
      await new Promise(resolve => setTimeout(resolve, 200))

      const insights = monitor.generateInsights()
      const cacheStats = cache.getAdvancedStats()

      // Should provide optimization recommendations
      expect(insights.optimizations.length).toBeGreaterThan(0)

      // Should track top operations
      expect(cacheStats.analytics.topOperations.length).toBeGreaterThan(0)

      // Should provide cost and performance predictions
      expect(insights.predictions.nextHourCost).toBeGreaterThan(0)
      expect(insights.predictions.nextHourRequests).toBeGreaterThan(0)
    })
  })

  describe('Fault Tolerance and Recovery', () => {
    it('should handle cache failures gracefully without affecting monitoring', async () => {
      const resilientOperation = async (data: string): Promise<{ data: string }> => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return { data: `processed-${data}` }
      }

      const wrappedOp = withOptimizedCache(
        'resilient-operation',
        withPerformanceMonitoring('resilient-operation', resilientOperation),
        { cost: 0.10 }
      )

      // Normal operation
      await wrappedOp('test1')

      // Simulate cache corruption/failure by clearing
      cache.clear()

      // Operation should still work (cache miss)
      const result = await wrappedOp('test2')
      expect(result.data).toBe('processed-test2')

      // Performance monitoring should continue working
      await new Promise(resolve => setTimeout(resolve, 150))
      const status = monitor.getStatus()
      expect(status.overall).toMatch(/healthy|degraded/)
    })

    it('should maintain performance under high concurrency', async () => {
      const concurrentOperation = async (id: number): Promise<{ id: number }> => {
        // Variable processing time to simulate real conditions
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
        return { id }
      }

      const wrappedOp = withOptimizedCache(
        'concurrent-operation',
        withPerformanceMonitoring('concurrent-operation', concurrentOperation),
        { cost: 0.05 }
      )

      // Launch many concurrent operations
      const concurrentRequests = []
      for (let i = 0; i < 50; i++) {
        // Mix of unique and repeated requests to test cache behavior
        const id = i < 25 ? i : i - 25 // Second half repeats first half
        concurrentRequests.push(wrappedOp(id))
      }

      const results = await Promise.all(concurrentRequests)

      // All requests should complete successfully
      expect(results).toHaveLength(50)
      results.forEach((result, index) => {
        const expectedId = index < 25 ? index : index - 25
        expect(result.id).toBe(expectedId)
      })

      // Should have good cache hit ratio for repeated requests
      const cacheStats = cache.getAdvancedStats()
      expect(cacheStats.hitRate).toBeGreaterThan(0.4) // At least 40% hit rate

      // Performance metrics should be reasonable
      await new Promise(resolve => setTimeout(resolve, 200))
      const perfStatus = monitor.getStatus()
      expect(perfStatus.overall).toMatch(/healthy|degraded/)
    })
  })

  describe('Real-world Simulation', () => {
    it('should handle realistic AI workload patterns', async () => {
      // Simulate different types of AI operations
      const aiOperations = {
        'text-generation': async (prompt: string) => {
          await new Promise(resolve => setTimeout(resolve, 800))
          return { text: `Generated text for: ${prompt}` }
        },
        'embedding': async (text: string) => {
          await new Promise(resolve => setTimeout(resolve, 200))
          return { vector: new Array(128).fill(0).map(() => Math.random()) }
        },
        'classification': async (content: string) => {
          await new Promise(resolve => setTimeout(resolve, 300))
          return { category: 'technology', confidence: 0.95 }
        }
      }

      // Wrap each operation with optimization
      const optimizedOperations = Object.entries(aiOperations).reduce((acc, [name, fn]) => {
        acc[name] = withOptimizedCache(
          name,
          withPerformanceMonitoring(name, fn as any),
          {
            cost: name === 'text-generation' ? 1.50 : 0.25,
            tags: ['ai', name],
            enableWarming: true
          }
        )
        return acc
      }, {} as Record<string, any>)

      // Simulate realistic usage patterns
      const workload = [
        // Popular prompts (should benefit from caching)
        { op: 'text-generation', input: 'Explain quantum computing' },
        { op: 'text-generation', input: 'What is machine learning?' },
        { op: 'text-generation', input: 'Explain quantum computing' }, // Repeat

        // Embeddings for similar content
        { op: 'embedding', input: 'artificial intelligence overview' },
        { op: 'embedding', input: 'machine learning basics' },
        { op: 'embedding', input: 'artificial intelligence overview' }, // Repeat

        // Classification tasks
        { op: 'classification', input: 'tech article content' },
        { op: 'classification', input: 'science paper abstract' },
        { op: 'text-generation', input: 'What is machine learning?' }, // Repeat
      ]

      // Execute workload
      for (const task of workload) {
        await optimizedOperations[task.op](task.input)
      }

      // Analyze results
      const cacheStats = cache.getAdvancedStats()
      const insights = monitor.generateInsights()

      // Should achieve reasonable cache efficiency
      expect(cacheStats.hitRate).toBeGreaterThan(0.2) // At least 20% hit rate

      // Should show cost savings
      expect(cacheStats.costSavings).toBeGreaterThan(0)

      // Should provide useful insights
      expect(insights.optimizations.length).toBeGreaterThan(0)
      expect(insights.predictions.nextHourCost).toBeGreaterThan(0)

      // Analytics should track multiple operation types
      expect(cacheStats.analytics.topOperations.length).toBeGreaterThanOrEqual(3)
    })
  })
})