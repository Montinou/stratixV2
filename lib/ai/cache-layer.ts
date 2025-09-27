import { createHash } from 'crypto'
import { aiCacheManager } from '@/lib/redis/cache-manager'

/**
 * AI Cache Layer - Multi-tier cache implementation with Redis optimization
 * L1: In-memory (5min) -> L2: Redis (1hr) -> L3: Database (24hr)
 * Optimized for free tier usage with compression and efficient eviction
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: Date
  ttl: number
  hits: number
  tags?: string[]
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  tags?: string[] // Cache tags for selective invalidation
}

export class AICacheLayer {
  private static instance: AICacheLayer
  private legacyCache = new Map<string, CacheEntry>() // Fallback for Redis unavailable
  private readonly defaultTTL = 1000 * 60 * 60 // 1 hour
  private readonly maxSize = 500 // Reduced for Redis optimization
  private cleanupInterval: NodeJS.Timeout | null = null
  private useRedis = true

  private constructor() {
    // Start cleanup interval every 15 minutes (reduced frequency for Redis)
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 15 * 60 * 1000)

    // Check Redis availability
    this.checkRedisAvailability()
  }

  public static getInstance(): AICacheLayer {
    if (!AICacheLayer.instance) {
      AICacheLayer.instance = new AICacheLayer()
    }
    return AICacheLayer.instance
  }

  /**
   * Generate cache key from input parameters
   */
  private generateKey(operation: string, params: any): string {
    const serialized = JSON.stringify({
      operation,
      ...params
    })
    return createHash('sha256').update(serialized).digest('hex')
  }

  /**
   * Store data in cache (using multi-tier strategy)
   */
  public async set<T>(
    operation: string,
    params: any,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    if (this.useRedis) {
      try {
        // Use multi-tier cache manager
        const customTTL = options.ttl ? {
          l1: Math.min(options.ttl, 5 * 60 * 1000), // Max 5min for L1
          l2: Math.min(options.ttl, 60 * 60 * 1000), // Max 1hr for L2
          l3: options.ttl // Full TTL for L3
        } : undefined

        await aiCacheManager.set(operation, params, data, customTTL)
        return
      } catch (error) {
        console.warn('⚠️ Redis cache set failed, using fallback:', error)
        this.useRedis = false
      }
    }

    // Fallback to legacy in-memory cache
    const key = this.generateKey(operation, params)
    const ttl = options.ttl || this.defaultTTL

    if (this.legacyCache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.legacyCache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0,
      tags: options.tags
    })
  }

  /**
   * Get data from cache (using multi-tier strategy)
   */
  public async get<T>(operation: string, params: any): Promise<T | null> {
    if (this.useRedis) {
      try {
        // Use multi-tier cache manager
        return await aiCacheManager.get<T>(operation, params)
      } catch (error) {
        console.warn('⚠️ Redis cache get failed, using fallback:', error)
        this.useRedis = false
      }
    }

    // Fallback to legacy in-memory cache
    const key = this.generateKey(operation, params)
    const entry = this.legacyCache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.legacyCache.delete(key)
      return null
    }

    // Update hit count
    entry.hits++

    return entry.data as T
  }

  /**
   * Check if data exists in cache (using multi-tier strategy)
   */
  public async has(operation: string, params: any): Promise<boolean> {
    if (this.useRedis) {
      try {
        return await aiCacheManager.has(operation, params)
      } catch (error) {
        console.warn('⚠️ Redis cache has failed, using fallback:', error)
        this.useRedis = false
      }
    }

    // Fallback to legacy in-memory cache
    const key = this.generateKey(operation, params)
    const entry = this.legacyCache.get(key)

    if (!entry) {
      return false
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.legacyCache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete specific cache entry (using multi-tier strategy)
   */
  public async delete(operation: string, params: any): Promise<boolean> {
    if (this.useRedis) {
      try {
        return await aiCacheManager.delete(operation, params)
      } catch (error) {
        console.warn('⚠️ Redis cache delete failed, using fallback:', error)
        this.useRedis = false
      }
    }

    // Fallback to legacy in-memory cache
    const key = this.generateKey(operation, params)
    return this.legacyCache.delete(key)
  }

  /**
   * Clear all cache entries (using multi-tier strategy)
   */
  public async clear(): Promise<void> {
    if (this.useRedis) {
      try {
        await aiCacheManager.clear()
        return
      } catch (error) {
        console.warn('⚠️ Redis cache clear failed, using fallback:', error)
        this.useRedis = false
      }
    }

    // Fallback to legacy in-memory cache
    this.legacyCache.clear()
  }

  /**
   * Clear cache entries by tag (legacy fallback only)
   */
  public clearByTag(tag: string): number {
    // Note: Tag-based clearing not implemented in Redis layer for efficiency
    // Use operation-specific clears instead
    let deleted = 0
    for (const [key, entry] of this.legacyCache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.legacyCache.delete(key)
        deleted++
      }
    }
    return deleted
  }

  /**
   * Get cache statistics (enhanced with Redis stats)
   */
  public async getStats(): Promise<{
    size: number
    maxSize: number
    hitRate: number
    redisStats?: any
    entries: Array<{
      operation: string
      hits: number
      age: number
      ttl: number
    }>
  }> {
    // Get Redis stats if available
    let redisStats
    if (this.useRedis) {
      try {
        redisStats = await aiCacheManager.getStats()
      } catch (error) {
        console.warn('⚠️ Failed to get Redis stats:', error)
      }
    }

    const entries: Array<{
      operation: string
      hits: number
      age: number
      ttl: number
    }> = []

    let totalHits = 0
    const now = Date.now()

    // Use legacy cache for detailed entries (Redis abstraction doesn't expose individual entries)
    for (const [key, entry] of this.legacyCache.entries()) {
      totalHits += entry.hits
      entries.push({
        operation: key.substring(0, 20) + '...', // Truncated key for display
        hits: entry.hits,
        age: now - entry.timestamp.getTime(),
        ttl: entry.ttl
      })
    }

    // Sort by hits (most popular first)
    entries.sort((a, b) => b.hits - a.hits)

    const hitRate = redisStats?.total?.hitRate ||
      (this.legacyCache.size > 0 ? totalHits / this.legacyCache.size : 0)

    return {
      size: redisStats?.l1?.size || this.legacyCache.size,
      maxSize: this.maxSize,
      hitRate,
      redisStats,
      entries: entries.slice(0, 10) // Top 10 entries
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanup(): Promise<void> {
    if (this.useRedis) {
      try {
        await aiCacheManager.cleanup()
        return
      } catch (error) {
        console.warn('⚠️ Redis cleanup failed, cleaning legacy cache:', error)
      }
    }

    // Cleanup legacy cache
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.legacyCache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.legacyCache.delete(key))

    if (toDelete.length > 0) {
      console.log(`AI Cache: Cleaned up ${toDelete.length} expired legacy entries`)
    }
  }

  /**
   * Check Redis availability
   */
  private async checkRedisAvailability(): Promise<void> {
    try {
      await aiCacheManager.getStats()
      this.useRedis = true
      console.log('✅ AI Cache: Redis multi-tier caching enabled')
    } catch (error) {
      this.useRedis = false
      console.warn('⚠️ AI Cache: Using fallback in-memory cache only', error)
    }
  }

  /**
   * Evict oldest entries when cache is full (legacy fallback)
   */
  private evictOldest(): void {
    if (this.legacyCache.size === 0) return

    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.legacyCache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime()
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.legacyCache.delete(oldestKey)
    }
  }

  /**
   * Destroy cache and cleanup intervals
   */
  public async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.useRedis) {
      try {
        await aiCacheManager.clear()
      } catch (error) {
        console.warn('⚠️ Failed to clear Redis cache on destroy:', error)
      }
    }

    this.legacyCache.clear()
  }
}

// Export singleton instance
export const aiCache = AICacheLayer.getInstance()

/**
 * Decorator function to add caching to AI operations (Redis-optimized)
 */
export function withCache<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  options: CacheOptions = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const cache = AICacheLayer.getInstance()

    // Try to get from cache first
    const cached = await cache.get<R>(operation, args)
    if (cached !== null) {
      console.log(`AI Cache hit for operation: ${operation}`)
      return cached
    }

    // Execute function and cache result
    try {
      const result = await fn(...args)
      await cache.set(operation, args, result, options)
      console.log(`AI Cache miss - stored result for operation: ${operation}`)
      return result
    } catch (error) {
      // Don't cache errors
      throw error
    }
  }
}

/**
 * Cache configuration presets for different types of operations
 */
export const CACHE_PRESETS = {
  // Cache insights for 30 minutes
  insights: {
    ttl: 30 * 60 * 1000,
    tags: ['insights', 'analytics']
  },
  // Cache suggestions for 1 hour
  suggestions: {
    ttl: 60 * 60 * 1000,
    tags: ['suggestions', 'okr']
  },
  // Cache embeddings for 24 hours (they rarely change)
  embeddings: {
    ttl: 24 * 60 * 60 * 1000,
    tags: ['embeddings', 'vectors']
  },
  // Cache static content for 6 hours
  static: {
    ttl: 6 * 60 * 60 * 1000,
    tags: ['static', 'templates']
  },
  // Cache templates for 2 hours
  templates: {
    ttl: 2 * 60 * 60 * 1000,
    tags: ['templates', 'okr']
  }
} as const