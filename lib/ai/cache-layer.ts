import { createHash } from 'crypto'

/**
 * AI Cache Layer - Simple in-memory cache for AI responses
 * This helps reduce costs by caching frequent requests
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
  private cache = new Map<string, CacheEntry>()
  private readonly defaultTTL = 1000 * 60 * 60 // 1 hour
  private readonly maxSize = 1000 // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Start cleanup interval every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 10 * 60 * 1000)
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
   * Store data in cache
   */
  public set<T>(
    operation: string,
    params: any,
    data: T,
    options: CacheOptions = {}
  ): void {
    const key = this.generateKey(operation, params)
    const ttl = options.ttl || this.defaultTTL

    // Check if we need to evict old entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl,
      hits: 0,
      tags: options.tags
    })
  }

  /**
   * Get data from cache
   */
  public get<T>(operation: string, params: any): T | null {
    const key = this.generateKey(operation, params)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update hit count
    entry.hits++

    return entry.data as T
  }

  /**
   * Check if data exists in cache
   */
  public has(operation: string, params: any): boolean {
    const key = this.generateKey(operation, params)
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete specific cache entry
   */
  public delete(operation: string, params: any): boolean {
    const key = this.generateKey(operation, params)
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear()
  }

  /**
   * Clear cache entries by tag
   */
  public clearByTag(tag: string): number {
    let deleted = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.cache.delete(key)
        deleted++
      }
    }
    return deleted
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{
      operation: string
      hits: number
      age: number
      ttl: number
    }>
  } {
    const entries: Array<{
      operation: string
      hits: number
      age: number
      ttl: number
    }> = []

    let totalHits = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
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

    const hitRate = this.cache.size > 0 ? totalHits / this.cache.size : 0

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries: entries.slice(0, 10) // Top 10 entries
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.cache.delete(key))

    if (toDelete.length > 0) {
      console.log(`AI Cache: Cleaned up ${toDelete.length} expired entries`)
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    if (this.cache.size === 0) return

    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime()
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Destroy cache and cleanup intervals
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// Export singleton instance
export const aiCache = AICacheLayer.getInstance()

/**
 * Decorator function to add caching to AI operations
 */
export function withCache<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  options: CacheOptions = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const cache = AICacheLayer.getInstance()

    // Try to get from cache first
    const cached = cache.get<R>(operation, args)
    if (cached !== null) {
      console.log(`AI Cache hit for operation: ${operation}`)
      return cached
    }

    // Execute function and cache result
    try {
      const result = await fn(...args)
      cache.set(operation, args, result, options)
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