import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { AICacheOptimization } from '../cache-optimization'

/**
 * Comprehensive test suite for AI Cache Optimization System
 * Tests all major functionality including caching, analytics, clustering, and memory management
 */

describe('AICacheOptimization', () => {
  let cache: AICacheOptimization

  beforeEach(() => {
    // Create a fresh instance for each test
    cache = AICacheOptimization.getInstance({
      maxSize: 100,
      defaultTTL: 5000, // 5 seconds for testing
      memoryLimit: 10, // 10MB for testing
      enableAnalytics: true,
      evictionStrategy: 'popularity'
    })

    // Clear any existing cache
    cache.clear()
  })

  afterEach(() => {
    // Clean up intervals
    cache.destroy()
  })

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data correctly', () => {
      const operation = 'test-operation'
      const params = { query: 'test' }
      const data = { result: 'success' }

      // Store data
      const stored = cache.set(operation, params, data)
      expect(stored).toBe(true)

      // Retrieve data
      const retrieved = cache.get(operation, params)
      expect(retrieved).toEqual(data)
    })

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent', {})
      expect(result).toBeNull()
    })

    it('should handle complex parameter normalization', () => {
      const operation = 'complex-operation'
      const params1 = { b: 2, a: 1, nested: { y: 'test', x: 'value' } }
      const params2 = { a: 1, b: 2, nested: { x: 'value', y: 'test' } }
      const data = { result: 'normalized' }

      cache.set(operation, params1, data)
      const retrieved = cache.get(operation, params2)

      expect(retrieved).toEqual(data)
    })

    it('should respect TTL expiration', async () => {
      const operation = 'ttl-test'
      const params = { test: true }
      const data = { expires: 'soon' }

      cache.set(operation, params, data, { ttl: 100 }) // 100ms TTL

      // Should be available immediately
      expect(cache.get(operation, params)).toEqual(data)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be expired
      expect(cache.get(operation, params)).toBeNull()
    })
  })

  describe('Analytics and Monitoring', () => {
    it('should track cache hits and misses', () => {
      const operation = 'analytics-test'
      const params = { track: 'hits' }
      const data = { tracked: true }

      // Cache miss
      cache.get(operation, params)

      // Cache store
      cache.set(operation, params, data)

      // Cache hit
      cache.get(operation, params)
      cache.get(operation, params)

      const stats = cache.getAdvancedStats()

      expect(stats.analytics.totalRequests).toBe(3)
      expect(stats.analytics.totalHits).toBe(2)
      expect(stats.analytics.totalMisses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.667, 2)
    })

    it('should track operation statistics', () => {
      const operation1 = 'op1'
      const operation2 = 'op2'
      const data = { test: true }

      // Multiple operations with different hit patterns
      cache.set(operation1, {}, data, { cost: 0.05 })
      cache.get(operation1, {}) // hit
      cache.get(operation1, {}) // hit

      cache.set(operation2, {}, data, { cost: 0.10 })
      cache.get(operation2, {}) // hit
      cache.get('nonexistent', {}) // miss

      const stats = cache.getAdvancedStats()
      const topOps = stats.analytics.topOperations

      expect(topOps).toHaveLength(3) // op1, op2, nonexistent

      const op1Stats = topOps.find(op => op.operation === operation1)
      expect(op1Stats).toBeDefined()
      expect(op1Stats?.hitRate).toBe(1) // 2 hits out of 2 requests
      expect(op1Stats?.averageCost).toBe(0.05)
    })

    it('should calculate TTL statistics', () => {
      cache.set('short', {}, { ttl: 'short' }, { ttl: 1000 })
      cache.set('medium', {}, { ttl: 'medium' }, { ttl: 5000 })
      cache.set('long', {}, { ttl: 'long' }, { ttl: 10000 })

      const stats = cache.getAdvancedStats()
      const ttlStats = stats.analytics.timeToLive

      expect(ttlStats.average).toBe((1000 + 5000 + 10000) / 3)
      expect(ttlStats.median).toBe(5000)
    })
  })

  describe('Memory Management', () => {
    it('should track memory usage accurately', () => {
      const largeData = { data: 'x'.repeat(1000) } // ~1KB data

      cache.set('large1', {}, largeData)
      cache.set('large2', {}, largeData)

      const stats = cache.getAdvancedStats()
      expect(stats.memoryUsage).toBeGreaterThan(2000) // At least 2KB
    })

    it('should perform memory optimization when limits are exceeded', () => {
      // Create cache with very small memory limit
      const smallCache = AICacheOptimization.getInstance({
        maxSize: 100,
        memoryLimit: 0.001, // 1KB limit
        evictionStrategy: 'lru'
      })

      const largeData = { data: 'x'.repeat(500) } // ~500 bytes each

      // Add entries that exceed memory limit
      for (let i = 0; i < 5; i++) {
        smallCache.set(`entry-${i}`, {}, largeData)
      }

      const stats = smallCache.getAdvancedStats()

      // Should have evicted some entries
      expect(stats.size).toBeLessThan(5)
      expect(stats.analytics.evictionStats.totalEvictions).toBeGreaterThan(0)

      smallCache.destroy()
    })

    it('should apply different eviction strategies', () => {
      // Test LRU eviction
      const lruCache = AICacheOptimization.getInstance({
        maxSize: 3,
        evictionStrategy: 'lru',
        memoryLimit: 0.001 // Force eviction
      })

      lruCache.set('first', {}, { data: 'x'.repeat(200) })
      lruCache.set('second', {}, { data: 'x'.repeat(200) })
      lruCache.set('third', {}, { data: 'x'.repeat(200) })

      // Access first and second to make them more recently used
      lruCache.get('first', {})
      lruCache.get('second', {})

      // Add fourth entry, should evict 'third' (least recently used)
      lruCache.set('fourth', {}, { data: 'x'.repeat(200) })

      expect(lruCache.has('first', {})).toBe(true)
      expect(lruCache.has('second', {})).toBe(true)
      expect(lruCache.has('third', {})).toBe(false)
      expect(lruCache.has('fourth', {})).toBe(true)

      lruCache.destroy()
    })
  })

  describe('Cache Warming', () => {
    it('should support cache warming operations', async () => {
      const warmingCache = AICacheOptimization.getInstance({
        warmingQueries: ['popular-operation']
      })

      // Simulate cache warming
      await warmingCache.performCacheWarming()

      const stats = warmingCache.getAdvancedStats()
      expect(stats.warmingStatus).toBe('complete')

      warmingCache.destroy()
    })

    it('should discover popular queries for warming', () => {
      const operation = 'popular-query'
      const data = { popular: true }

      // Make an operation popular by hitting it multiple times
      cache.set(operation, { version: 1 }, data)
      for (let i = 0; i < 5; i++) {
        cache.get(operation, { version: 1 })
      }

      const stats = cache.getAdvancedStats()
      expect(stats.popularQueries).toHaveLength(1)
      expect(stats.popularQueries[0].hits).toBe(5)
    })
  })

  describe('Tag-based Invalidation', () => {
    it('should clear entries by tag', () => {
      cache.set('tagged1', {}, { data: '1' }, { tags: ['user:123', 'type:profile'] })
      cache.set('tagged2', {}, { data: '2' }, { tags: ['user:123', 'type:settings'] })
      cache.set('tagged3', {}, { data: '3' }, { tags: ['user:456', 'type:profile'] })
      cache.set('untagged', {}, { data: '4' })

      // Clear all entries for user:123
      const cleared = cache.clearByTag('user:123')
      expect(cleared).toBe(2)

      // Verify correct entries were cleared
      expect(cache.get('tagged1', {})).toBeNull()
      expect(cache.get('tagged2', {})).toBeNull()
      expect(cache.get('tagged3', {})).toEqual({ data: '3' })
      expect(cache.get('untagged', {})).toEqual({ data: '4' })
    })

    it('should handle multiple tags per entry', () => {
      cache.set('multi-tag', {}, { data: 'multi' }, {
        tags: ['tag1', 'tag2', 'tag3']
      })

      // Clearing by any tag should remove the entry
      const cleared = cache.clearByTag('tag2')
      expect(cleared).toBe(1)
      expect(cache.get('multi-tag', {})).toBeNull()
    })
  })

  describe('Cost-aware Optimization', () => {
    it('should calculate intelligent TTL based on cost', () => {
      const highCostTTL = cache.calculateIntelligentTTL('expensive-op', 1.0, 5)
      const lowCostTTL = cache.calculateIntelligentTTL('cheap-op', 0.01, 5)

      expect(highCostTTL).toBeGreaterThan(lowCostTTL)
    })

    it('should prioritize expensive entries during eviction', () => {
      const costCache = AICacheOptimization.getInstance({
        maxSize: 10,
        evictionStrategy: 'cost-aware',
        memoryLimit: 0.001 // Force eviction
      })

      // Add cheap and expensive entries
      costCache.set('cheap', {}, { data: 'x'.repeat(200) }, { cost: 0.01 })
      costCache.set('expensive', {}, { data: 'x'.repeat(200) }, { cost: 1.0 })

      // Access both to establish hit patterns
      costCache.get('cheap', {})
      costCache.get('expensive', {})

      // Force eviction with new entry
      costCache.set('trigger-eviction', {}, { data: 'x'.repeat(200) })

      // Expensive entry should survive eviction
      expect(costCache.has('expensive', {})).toBe(true)
      expect(costCache.has('cheap', {})).toBe(false)

      costCache.destroy()
    })

    it('should track cost savings accurately', () => {
      cache.set('costly1', {}, { result: 1 }, { cost: 0.50 })
      cache.set('costly2', {}, { result: 2 }, { cost: 0.25 })

      // Generate cache hits
      cache.get('costly1', {})
      cache.get('costly1', {})
      cache.get('costly2', {})

      const stats = cache.getAdvancedStats()
      expect(stats.costSavings).toBe(1.25) // 0.50 * 2 + 0.25 * 1
      expect(stats.analytics.costSavingsPerHour).toBeGreaterThan(0)
    })
  })

  describe('Clustering Support', () => {
    it('should manage cluster nodes', () => {
      const clusterCache = AICacheOptimization.getInstance({
        enableClustering: true,
        clusterNodes: ['http://node1:3000', 'http://node2:3000']
      })

      // Check initial cluster status
      const nodes = clusterCache.getClusterStatus()
      expect(nodes).toHaveLength(2)
      expect(nodes.every(node => node.status === 'inactive')).toBe(true)

      // Add new node
      const nodeId = clusterCache.addClusterNode('http://node3:3000')
      expect(nodeId).toBeDefined()
      expect(clusterCache.getClusterStatus()).toHaveLength(3)

      // Remove node
      const removed = clusterCache.removeClusterNode(nodeId)
      expect(removed).toBe(true)
      expect(clusterCache.getClusterStatus()).toHaveLength(2)

      clusterCache.destroy()
    })

    it('should export and import cache data', () => {
      // Populate cache with test data
      cache.set('export-test-1', { id: 1 }, { data: 'test1' }, { cost: 0.1, tags: ['export'] })
      cache.set('export-test-2', { id: 2 }, { data: 'test2' }, { cost: 0.2, tags: ['export'] })

      // Export cache data
      const exportData = cache.exportCache()

      expect(exportData.entries).toHaveLength(2)
      expect(exportData.config).toBeDefined()
      expect(exportData.stats).toBeDefined()

      // Clear cache and import
      cache.clear()
      expect(cache.getAdvancedStats().size).toBe(0)

      const imported = cache.importCache(exportData)
      expect(imported).toBe(true)
      expect(cache.getAdvancedStats().size).toBe(2)

      // Verify imported data
      expect(cache.get('export-test-1', { id: 1 })).toEqual({ data: 'test1' })
      expect(cache.get('export-test-2', { id: 2 })).toEqual({ data: 'test2' })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid import data gracefully', () => {
      const invalidData = { invalid: 'data' }
      const imported = cache.importCache(invalidData)
      expect(imported).toBe(false)
    })

    it('should handle memory estimation errors', () => {
      // Test with circular reference that would break JSON.stringify
      const circularRef: any = { data: 'test' }
      circularRef.self = circularRef

      const stored = cache.set('circular', {}, circularRef)
      // Should still work with default size estimation
      expect(stored).toBe(true)
    })

    it('should handle concurrent access safely', async () => {
      const operation = 'concurrent-test'
      const promises = []

      // Simulate concurrent cache operations
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            cache.set(`${operation}-${i}`, {}, { index: i })
            return cache.get(`${operation}-${i}`, {})
          })
        )
      }

      const results = await Promise.all(promises)

      // All operations should complete successfully
      expect(results).toHaveLength(10)
      results.forEach((result, index) => {
        expect(result).toEqual({ index })
      })
    })

    it('should maintain consistency during cleanup operations', async () => {
      // Add entries with very short TTL
      for (let i = 0; i < 5; i++) {
        cache.set(`cleanup-test-${i}`, {}, { data: i }, { ttl: 10 })
      }

      const initialStats = cache.getAdvancedStats()
      expect(initialStats.size).toBe(5)

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 50))

      // Access cache to trigger cleanup
      cache.get('non-existent', {})

      const finalStats = cache.getAdvancedStats()
      expect(finalStats.expiredEntries).toBe(0) // Should be cleaned up
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large numbers of entries efficiently', () => {
      const startTime = Date.now()

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        cache.set(`perf-test-${i}`, { id: i }, { value: i })
      }

      const addTime = Date.now() - startTime
      expect(addTime).toBeLessThan(1000) // Should complete in under 1 second

      // Test retrieval performance
      const retrieveStart = Date.now()

      for (let i = 0; i < 100; i++) {
        const result = cache.get(`perf-test-${i}`, { id: i })
        expect(result).toEqual({ value: i })
      }

      const retrieveTime = Date.now() - retrieveStart
      expect(retrieveTime).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should maintain performance with analytics enabled', () => {
      const startTime = Date.now()

      // Perform many operations with analytics
      for (let i = 0; i < 500; i++) {
        cache.set(`analytics-perf-${i}`, {}, { data: i })
        cache.get(`analytics-perf-${i}`, {})
      }

      const totalTime = Date.now() - startTime
      expect(totalTime).toBeLessThan(1000) // Should complete efficiently

      const stats = cache.getAdvancedStats()
      expect(stats.analytics.totalRequests).toBe(500)
      expect(stats.analytics.totalHits).toBe(500)
    })
  })
})