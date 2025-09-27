/**
 * AI Rate Limiter - Redis-backed sliding window implementation
 * Provides L1 (Redis) -> L2 (Database) caching for efficient rate limiting
 * Optimized for free tier Redis with intelligent memory usage
 */

import { getRedisClient } from '@/lib/redis/client'
import { aiRateLimiterDB } from './rate-limiter-db'
import type Redis from 'ioredis'

interface RedisRateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  maxTokens?: number // Max tokens per window (for cost control)
  keyPrefix?: string // Redis key prefix
  skipFailedRequests?: boolean
  skipSuccessfulRequests?: boolean
  useDatabase?: boolean // Fallback to database if Redis fails
}

interface RedisRateLimitResult {
  allowed: boolean
  remainingRequests: number
  remainingTokens: number
  resetTime: number
  totalHits: number
  retryAfter?: number
  usedRedis: boolean // Indicates if Redis was used
}

interface SlidingWindowEntry {
  timestamp: number
  tokens: number
}

export class RedisRateLimiter {
  private static instance: RedisRateLimiter
  private redis: Redis | null = null
  private fallbackToDatabase = true

  private constructor() {
    this.initializeRedis()
  }

  public static getInstance(): RedisRateLimiter {
    if (!RedisRateLimiter.instance) {
      RedisRateLimiter.instance = new RedisRateLimiter()
    }
    return RedisRateLimiter.instance
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisClient = getRedisClient()
      this.redis = await redisClient.getClient()
      console.log('✅ Redis Rate Limiter initialized')
    } catch (error) {
      console.warn('⚠️ Redis unavailable for rate limiting, using database fallback:', error)
      this.redis = null
    }
  }

  /**
   * Check rate limit using Redis sliding window with database fallback
   */
  public async checkLimit(
    identifier: string,
    options: RedisRateLimitOptions,
    estimatedTokens: number = 0
  ): Promise<RedisRateLimitResult> {
    const keyPrefix = options.keyPrefix || 'rl'
    const requestKey = `${keyPrefix}:req:${identifier}`
    const tokenKey = `${keyPrefix}:tok:${identifier}`
    const now = Date.now()

    // Try Redis first
    if (this.redis) {
      try {
        return await this.checkRedisLimit(
          requestKey,
          tokenKey,
          options,
          estimatedTokens,
          now
        )
      } catch (error) {
        console.warn('⚠️ Redis rate limit check failed, falling back to database:', error)
        this.redis = null // Mark Redis as unavailable
      }
    }

    // Fallback to database implementation
    if (options.useDatabase !== false && this.fallbackToDatabase) {
      const dbResult = await aiRateLimiterDB.checkLimit(identifier, options, estimatedTokens)
      return {
        ...dbResult,
        usedRedis: false
      }
    }

    // If both Redis and database are unavailable, allow the request
    return {
      allowed: true,
      remainingRequests: options.maxRequests,
      remainingTokens: options.maxTokens || Infinity,
      resetTime: now + options.windowMs,
      totalHits: 0,
      usedRedis: false
    }
  }

  /**
   * Redis sliding window implementation
   */
  private async checkRedisLimit(
    requestKey: string,
    tokenKey: string,
    options: RedisRateLimitOptions,
    estimatedTokens: number,
    now: number
  ): Promise<RedisRateLimitResult> {
    const windowStart = now - options.windowMs
    const windowEnd = now + options.windowMs

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis!.pipeline()

    // 1. Remove expired entries from sorted sets
    pipeline.zremrangebyscore(requestKey, 0, windowStart)
    if (options.maxTokens) {
      pipeline.zremrangebyscore(tokenKey, 0, windowStart)
    }

    // 2. Count current entries in window
    pipeline.zcard(requestKey)
    if (options.maxTokens) {
      pipeline.zcard(tokenKey)
    }

    // 3. Get total token usage in current window
    if (options.maxTokens) {
      pipeline.zrange(tokenKey, 0, -1, 'WITHSCORES')
    }

    const results = await pipeline.exec()
    if (!results || results.some(result => result[0] !== null)) {
      throw new Error('Redis pipeline execution failed')
    }

    let resultIndex = 2 // Skip the first two ZREMRANGEBYSCORE results
    const currentRequests = results[resultIndex++][1] as number
    let currentTokens = 0

    if (options.maxTokens) {
      // Skip the ZCARD for tokens, we'll calculate from ZRANGE
      resultIndex++
      const tokenEntries = results[resultIndex++][1] as string[]

      // Sum up token usage (values are stored as scores in sorted set)
      for (let i = 1; i < tokenEntries.length; i += 2) {
        currentTokens += parseFloat(tokenEntries[i])
      }
    }

    // Check limits
    const remainingRequests = Math.max(0, options.maxRequests - currentRequests)
    const requestAllowed = currentRequests < options.maxRequests

    let tokenAllowed = true
    let remainingTokens = Infinity
    if (options.maxTokens) {
      remainingTokens = Math.max(0, options.maxTokens - currentTokens)
      tokenAllowed = currentTokens + estimatedTokens <= options.maxTokens
    }

    const allowed = requestAllowed && tokenAllowed

    // If allowed, record the request
    if (allowed) {
      const updatePipeline = this.redis!.pipeline()

      // Add request to sliding window (timestamp as both member and score)
      updatePipeline.zadd(requestKey, now, now.toString())

      // Add tokens if specified
      if (options.maxTokens && estimatedTokens > 0) {
        updatePipeline.zadd(tokenKey, estimatedTokens, `${now}:${estimatedTokens}`)
      }

      // Set expiration (window size + buffer for cleanup)
      const expireSeconds = Math.ceil((options.windowMs + 60000) / 1000) // Add 1 minute buffer
      updatePipeline.expire(requestKey, expireSeconds)
      if (options.maxTokens) {
        updatePipeline.expire(tokenKey, expireSeconds)
      }

      await updatePipeline.exec()
    }

    // Calculate retry after time
    let retryAfter: number | undefined
    if (!allowed) {
      // Find the oldest entry that would need to expire
      const oldestEntry = await this.redis!.zrange(requestKey, 0, 0, 'WITHSCORES')
      if (oldestEntry.length >= 2) {
        const oldestTimestamp = parseFloat(oldestEntry[1])
        retryAfter = Math.max(0, Math.ceil((oldestTimestamp + options.windowMs - now) / 1000))
      } else {
        retryAfter = Math.ceil(options.windowMs / 1000)
      }
    }

    return {
      allowed,
      remainingRequests,
      remainingTokens: options.maxTokens ? remainingTokens : Infinity,
      resetTime: now + options.windowMs,
      totalHits: currentRequests + (allowed ? 1 : 0),
      retryAfter,
      usedRedis: true
    }
  }

  /**
   * Record actual token usage after request completion
   */
  public async recordTokenUsage(
    identifier: string,
    actualTokens: number,
    keyPrefix: string = 'rl'
  ): Promise<void> {
    if (!this.redis) {
      // Fallback to database
      if (this.fallbackToDatabase) {
        await aiRateLimiterDB.recordTokenUsage(identifier, actualTokens)
      }
      return
    }

    try {
      const tokenKey = `${keyPrefix}:tok:${identifier}`
      const now = Date.now()

      // Update the most recent token entry or add a new one
      await this.redis.zadd(tokenKey, actualTokens, `${now}:${actualTokens}`)
    } catch (error) {
      console.warn('⚠️ Failed to record token usage in Redis:', error)
      // Fallback to database
      if (this.fallbackToDatabase) {
        await aiRateLimiterDB.recordTokenUsage(identifier, actualTokens)
      }
    }
  }

  /**
   * Get current usage statistics for an identifier
   */
  public async getUsage(
    identifier: string,
    windowMs: number,
    keyPrefix: string = 'rl'
  ): Promise<{
    requests: number
    tokens: number
    resetTime: number
    windowTimeLeft: number
    usedRedis: boolean
  }> {
    const requestKey = `${keyPrefix}:req:${identifier}`
    const tokenKey = `${keyPrefix}:tok:${identifier}`
    const now = Date.now()
    const windowStart = now - windowMs

    if (!this.redis) {
      // Fallback to database
      if (this.fallbackToDatabase) {
        const dbUsage = await aiRateLimiterDB.getUsage(identifier)
        return { ...dbUsage, usedRedis: false }
      }
      return {
        requests: 0,
        tokens: 0,
        resetTime: now,
        windowTimeLeft: 0,
        usedRedis: false
      }
    }

    try {
      const pipeline = this.redis.pipeline()

      // Clean up expired entries
      pipeline.zremrangebyscore(requestKey, 0, windowStart)
      pipeline.zremrangebyscore(tokenKey, 0, windowStart)

      // Count current entries
      pipeline.zcard(requestKey)
      pipeline.zrange(tokenKey, 0, -1, 'WITHSCORES')

      const results = await pipeline.exec()
      if (!results || results.some(result => result[0] !== null)) {
        throw new Error('Redis pipeline execution failed')
      }

      const requests = results[2][1] as number
      const tokenEntries = results[3][1] as string[]

      // Calculate total tokens
      let tokens = 0
      for (let i = 1; i < tokenEntries.length; i += 2) {
        tokens += parseFloat(tokenEntries[i])
      }

      // Find when the window resets (oldest entry + window)
      const oldestEntry = await this.redis.zrange(requestKey, 0, 0, 'WITHSCORES')
      const resetTime = oldestEntry.length >= 2
        ? parseFloat(oldestEntry[1]) + windowMs
        : now + windowMs

      return {
        requests,
        tokens,
        resetTime,
        windowTimeLeft: Math.max(0, resetTime - now),
        usedRedis: true
      }
    } catch (error) {
      console.warn('⚠️ Failed to get usage from Redis:', error)
      // Fallback to database
      if (this.fallbackToDatabase) {
        const dbUsage = await aiRateLimiterDB.getUsage(identifier)
        return { ...dbUsage, usedRedis: false }
      }
      return {
        requests: 0,
        tokens: 0,
        resetTime: now,
        windowTimeLeft: 0,
        usedRedis: false
      }
    }
  }

  /**
   * Reset limits for a specific identifier
   */
  public async reset(identifier: string, keyPrefix: string = 'rl'): Promise<boolean> {
    const requestKey = `${keyPrefix}:req:${identifier}`
    const tokenKey = `${keyPrefix}:tok:${identifier}`

    if (!this.redis) {
      // Fallback to database
      if (this.fallbackToDatabase) {
        return await aiRateLimiterDB.reset(identifier)
      }
      return false
    }

    try {
      const pipeline = this.redis.pipeline()
      pipeline.del(requestKey)
      pipeline.del(tokenKey)

      const results = await pipeline.exec()
      return results !== null && !results.some(result => result[0] !== null)
    } catch (error) {
      console.warn('⚠️ Failed to reset Redis rate limit:', error)
      // Fallback to database
      if (this.fallbackToDatabase) {
        return await aiRateLimiterDB.reset(identifier)
      }
      return false
    }
  }

  /**
   * Clean up expired entries across all rate limit keys
   */
  public async cleanup(keyPrefix: string = 'rl'): Promise<{ deletedKeys: number; freedMemory: number }> {
    if (!this.redis) {
      return { deletedKeys: 0, freedMemory: 0 }
    }

    try {
      const pattern = `${keyPrefix}:*`
      const keys = await this.redis.keys(pattern)
      const now = Date.now()
      let deletedKeys = 0

      // Process keys in batches to avoid blocking Redis
      const batchSize = 100
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const pipeline = this.redis.pipeline()

        for (const key of batch) {
          // For rate limiting, we can be aggressive with cleanup
          // Remove entries older than 1 hour (should be longer than any window)
          const cutoff = now - (60 * 60 * 1000)
          pipeline.zremrangebyscore(key, 0, cutoff)
        }

        const results = await pipeline.exec()
        if (results) {
          deletedKeys += results.filter(result => result[1] > 0).length
        }
      }

      console.log(`✅ Redis rate limiter cleanup: processed ${keys.length} keys, cleaned ${deletedKeys} entries`)
      return { deletedKeys, freedMemory: deletedKeys * 100 } // Rough estimate
    } catch (error) {
      console.error('❌ Redis rate limiter cleanup failed:', error)
      return { deletedKeys: 0, freedMemory: 0 }
    }
  }

  /**
   * Get Redis connection status
   */
  public isRedisAvailable(): boolean {
    return this.redis !== null
  }

  /**
   * Get comprehensive statistics
   */
  public async getGlobalStats(keyPrefix: string = 'rl'): Promise<{
    redisAvailable: boolean
    totalKeys: number
    totalRequests: number
    totalTokens: number
    memoryUsage: string
  }> {
    if (!this.redis) {
      return {
        redisAvailable: false,
        totalKeys: 0,
        totalRequests: 0,
        totalTokens: 0,
        memoryUsage: '0B'
      }
    }

    try {
      const pattern = `${keyPrefix}:*`
      const keys = await this.redis.keys(pattern)

      let totalRequests = 0
      let totalTokens = 0

      // Sample a subset of keys to avoid performance issues
      const sampleSize = Math.min(keys.length, 50)
      const sampleKeys = keys.slice(0, sampleSize)

      for (const key of sampleKeys) {
        if (key.includes(':req:')) {
          const count = await this.redis.zcard(key)
          totalRequests += count
        } else if (key.includes(':tok:')) {
          const tokenEntries = await this.redis.zrange(key, 0, -1, 'WITHSCORES')
          for (let i = 1; i < tokenEntries.length; i += 2) {
            totalTokens += parseFloat(tokenEntries[i])
          }
        }
      }

      // Extrapolate to full dataset if we sampled
      if (sampleSize < keys.length) {
        const scaleFactor = keys.length / sampleSize
        totalRequests = Math.round(totalRequests * scaleFactor)
        totalTokens = Math.round(totalTokens * scaleFactor)
      }

      // Get Redis memory info
      const redisClient = getRedisClient()
      const redisStats = await redisClient.getStats()

      return {
        redisAvailable: true,
        totalKeys: keys.length,
        totalRequests,
        totalTokens,
        memoryUsage: redisStats.usedMemoryHuman
      }
    } catch (error) {
      console.error('❌ Failed to get Redis rate limiter stats:', error)
      return {
        redisAvailable: false,
        totalKeys: 0,
        totalRequests: 0,
        totalTokens: 0,
        memoryUsage: '0B'
      }
    }
  }
}

// Export singleton instance
export const redisRateLimiter = RedisRateLimiter.getInstance()

/**
 * Enhanced rate limit middleware that uses Redis with database fallback
 */
export function withRedisRateLimit<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  config: RedisRateLimitOptions,
  getUserId: (...args: T) => string = () => 'anonymous'
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const userId = getUserId(...args)
    const estimatedTokens = estimateTokens(operation, args)

    // Check rate limits using Redis-backed limiter
    const result = await redisRateLimiter.checkLimit(userId, config, estimatedTokens)

    if (!result.allowed) {
      const error = new Error('Rate limit exceeded')
      Object.assign(error, {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        remainingRequests: result.remainingRequests,
        remainingTokens: result.remainingTokens,
        resetTime: new Date(result.resetTime),
        usedRedis: result.usedRedis
      })
      throw error
    }

    try {
      const response = await fn(...args)

      // Record actual usage if we can determine it
      // (This would require integration with the AI response to get actual token counts)

      return response
    } catch (error) {
      // On error, we might want to not count this against the limit
      if (config.skipFailedRequests) {
        // Implementation would need to adjust the recorded usage
      }
      throw error
    }
  }
}

/**
 * Estimate token count for different operations (imported from rate-limiter-db)
 */
function estimateTokens(operation: string, input: string | any[]): number {
  const baseEstimate = typeof input === 'string'
    ? Math.ceil(input.length / 4) // Rough estimate: 4 chars per token
    : Math.ceil(JSON.stringify(input).length / 4)

  // Adjust based on operation type
  switch (operation) {
    case 'generateText':
    case 'generateChatCompletion':
      return baseEstimate * 2 // Account for output tokens
    case 'generateEmbedding':
    case 'generateEmbeddings':
      return baseEstimate // Embeddings typically only use input tokens
    case 'generateStreamingText':
      return baseEstimate * 2.5 // Streaming might use more tokens
    default:
      return baseEstimate * 1.5 // Default multiplier
  }
}

/**
 * Redis-optimized rate limit configurations for free tier
 */
export const REDIS_RATE_LIMIT_CONFIGS = {
  // Standard user limits (optimized for Redis memory efficiency)
  user: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    maxTokens: 5000,
    keyPrefix: 'rl:u',
    useDatabase: true
  },
  // Premium user limits
  premium: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    maxTokens: 15000,
    keyPrefix: 'rl:p',
    useDatabase: true
  },
  // Short burst protection
  burst: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 3,
    maxTokens: 1000,
    keyPrefix: 'rl:b',
    useDatabase: false // Don't use DB for burst (too frequent)
  }
} as const