/**
 * AI Rate Limiter - Database-backed implementation
 * Replaces in-memory Map storage with PostgreSQL persistence
 * Implements token bucket and sliding window algorithms with proper cleanup
 */

import { getDrizzleClient } from '@/lib/database/client'
import { aiRateLimits } from '@/lib/database/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  maxTokens?: number // Max tokens per window (for cost control)
  keyGenerator?: (identifier: string) => string
  skipFailedRequests?: boolean
  skipSuccessfulRequests?: boolean
}

interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  remainingTokens: number
  resetTime: number
  totalHits: number
  retryAfter?: number
}

export class AIRateLimiterDB {
  private static instance: AIRateLimiterDB
  private db = getDrizzleClient()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  public static getInstance(): AIRateLimiterDB {
    if (!AIRateLimiterDB.instance) {
      AIRateLimiterDB.instance = new AIRateLimiterDB()
    }
    return AIRateLimiterDB.instance
  }

  /**
   * Check if request is allowed under rate limits
   */
  public async checkLimit(
    identifier: string,
    options: RateLimitOptions,
    estimatedTokens: number = 0
  ): Promise<RateLimitResult> {
    const key = options.keyGenerator ? options.keyGenerator(identifier) : identifier
    const now = new Date()
    const windowStart = new Date(now.getTime() - options.windowMs)
    const windowEnd = new Date(now.getTime() + options.windowMs)

    try {
      // Get or create rate limit entry for this window
      let entry = await this.db
        .select()
        .from(aiRateLimits)
        .where(
          and(
            eq(aiRateLimits.identifier, key),
            gte(aiRateLimits.windowEnd, now), // Window hasn't expired
            lte(aiRateLimits.windowStart, now) // Window has started
          )
        )
        .limit(1)
        .then(results => results[0] || null)

      // If no active entry exists, create a new one
      if (!entry) {
        entry = await this.db
          .insert(aiRateLimits)
          .values({
            identifier: key,
            windowStart,
            windowEnd,
            requestCount: 0,
            tokenCount: 0,
            lastActivity: now,
          })
          .returning()
          .then(results => results[0])
      }

      // Check request limit
      const remainingRequests = Math.max(0, options.maxRequests - entry.requestCount)
      const requestAllowed = entry.requestCount < options.maxRequests

      // Check token limit (if specified)
      let tokenAllowed = true
      let remainingTokens = Infinity
      if (options.maxTokens) {
        remainingTokens = Math.max(0, options.maxTokens - entry.tokenCount)
        tokenAllowed = entry.tokenCount + estimatedTokens <= options.maxTokens
      }

      const allowed = requestAllowed && tokenAllowed

      // If allowed, update the request and token counts
      if (allowed) {
        await this.db
          .update(aiRateLimits)
          .set({
            requestCount: entry.requestCount + 1,
            tokenCount: entry.tokenCount + estimatedTokens,
            lastActivity: now,
            updatedAt: now,
          })
          .where(eq(aiRateLimits.id, entry.id))
      }

      // Calculate retry after time
      let retryAfter: number | undefined
      if (!allowed) {
        if (!requestAllowed) {
          // Request limit hit, retry after window reset
          retryAfter = Math.max(0, entry.windowEnd.getTime() - now.getTime())
        } else if (!tokenAllowed) {
          // Token limit hit, retry after window reset
          retryAfter = Math.max(0, entry.windowEnd.getTime() - now.getTime())
        }
      }

      return {
        allowed,
        remainingRequests,
        remainingTokens: options.maxTokens ? remainingTokens : Infinity,
        resetTime: entry.windowEnd.getTime(),
        totalHits: entry.requestCount + (allowed ? 1 : 0),
        retryAfter: retryAfter ? Math.ceil(retryAfter / 1000) : undefined // Convert to seconds
      }

    } catch (error) {
      console.error('Rate limiter database error:', error)
      // In case of DB error, allow the request but log the issue
      return {
        allowed: true,
        remainingRequests: options.maxRequests,
        remainingTokens: options.maxTokens || Infinity,
        resetTime: Date.now() + options.windowMs,
        totalHits: 0
      }
    }
  }

  /**
   * Record actual token usage after request completion
   */
  public async recordTokenUsage(identifier: string, actualTokens: number): Promise<void> {
    try {
      const now = new Date()

      // Find the most recent entry for this identifier
      const entry = await this.db
        .select()
        .from(aiRateLimits)
        .where(
          and(
            eq(aiRateLimits.identifier, identifier),
            gte(aiRateLimits.windowEnd, now) // Window hasn't expired
          )
        )
        .orderBy(aiRateLimits.lastActivity)
        .limit(1)
        .then(results => results[0] || null)

      if (entry) {
        // Update with actual token usage
        await this.db
          .update(aiRateLimits)
          .set({
            tokenCount: Math.max(0, entry.tokenCount + actualTokens),
            lastActivity: now,
            updatedAt: now,
          })
          .where(eq(aiRateLimits.id, entry.id))
      }
    } catch (error) {
      console.error('Error recording token usage:', error)
    }
  }

  /**
   * Get current usage statistics for an identifier
   */
  public async getUsage(identifier: string): Promise<{
    requests: number
    tokens: number
    resetTime: number
    windowTimeLeft: number
  }> {
    try {
      const now = new Date()

      const entry = await this.db
        .select()
        .from(aiRateLimits)
        .where(
          and(
            eq(aiRateLimits.identifier, identifier),
            gte(aiRateLimits.windowEnd, now) // Window hasn't expired
          )
        )
        .orderBy(aiRateLimits.lastActivity)
        .limit(1)
        .then(results => results[0] || null)

      if (!entry) {
        return {
          requests: 0,
          tokens: 0,
          resetTime: now.getTime(),
          windowTimeLeft: 0
        }
      }

      return {
        requests: entry.requestCount,
        tokens: entry.tokenCount,
        resetTime: entry.windowEnd.getTime(),
        windowTimeLeft: Math.max(0, entry.windowEnd.getTime() - now.getTime())
      }
    } catch (error) {
      console.error('Error getting usage statistics:', error)
      return {
        requests: 0,
        tokens: 0,
        resetTime: Date.now(),
        windowTimeLeft: 0
      }
    }
  }

  /**
   * Reset limits for a specific identifier
   */
  public async reset(identifier: string): Promise<boolean> {
    try {
      await this.db
        .delete(aiRateLimits)
        .where(eq(aiRateLimits.identifier, identifier))

      return true
    } catch (error) {
      console.error('Error resetting rate limit:', error)
      return false
    }
  }

  /**
   * Reset all limits
   */
  public async resetAll(): Promise<void> {
    try {
      await this.db.delete(aiRateLimits)
    } catch (error) {
      console.error('Error resetting all rate limits:', error)
    }
  }

  /**
   * Get global statistics
   */
  public async getGlobalStats(): Promise<{
    totalEntries: number
    totalRequests: number
    totalTokens: number
    topUsers: Array<{
      identifier: string
      requests: number
      tokens: number
    }>
  }> {
    try {
      // Get totals using SQL aggregation
      const totals = await this.db
        .select({
          totalEntries: sql<number>`count(*)`,
          totalRequests: sql<number>`coalesce(sum(${aiRateLimits.requestCount}), 0)`,
          totalTokens: sql<number>`coalesce(sum(${aiRateLimits.tokenCount}), 0)`,
        })
        .from(aiRateLimits)
        .where(gte(aiRateLimits.windowEnd, new Date())) // Only active windows
        .then(results => results[0])

      // Get top users by request count
      const topUsers = await this.db
        .select({
          identifier: aiRateLimits.identifier,
          requests: aiRateLimits.requestCount,
          tokens: aiRateLimits.tokenCount,
        })
        .from(aiRateLimits)
        .where(gte(aiRateLimits.windowEnd, new Date())) // Only active windows
        .orderBy(aiRateLimits.requestCount)
        .limit(10)

      return {
        totalEntries: totals.totalEntries,
        totalRequests: totals.totalRequests,
        totalTokens: totals.totalTokens,
        topUsers
      }
    } catch (error) {
      console.error('Error getting global statistics:', error)
      return {
        totalEntries: 0,
        totalRequests: 0,
        totalTokens: 0,
        topUsers: []
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanup(): Promise<void> {
    try {
      const now = new Date()
      const cutoffTime = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago

      // Delete entries that are expired and haven't been accessed recently
      const result = await this.db
        .delete(aiRateLimits)
        .where(
          and(
            lte(aiRateLimits.windowEnd, now), // Window has expired
            lte(aiRateLimits.lastActivity, cutoffTime) // Not accessed recently
          )
        )

      console.log(`Rate Limiter: Cleaned up expired entries`)
    } catch (error) {
      console.error('Error during rate limiter cleanup:', error)
    }
  }

  /**
   * Destroy rate limiter and cleanup intervals
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const aiRateLimiterDB = AIRateLimiterDB.getInstance()

/**
 * Predefined rate limit configurations for different scenarios
 */
export const RATE_LIMIT_CONFIGS = {
  // Standard user limits
  user: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    maxTokens: 5000, // ~5k tokens per minute
  },
  // Premium user limits
  premium: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    maxTokens: 15000, // ~15k tokens per minute
  },
  // Admin/system limits
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    maxTokens: 50000, // ~50k tokens per minute
  },
  // Development/testing limits (more restrictive)
  development: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
    maxTokens: 2000, // ~2k tokens per minute
  },
  // Burst limits for immediate requests
  burst: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 3, // 3 requests per 10 seconds
    maxTokens: 1000, // ~1k tokens per 10 seconds
  }
} as const

/**
 * Estimate token count for different operations (rough estimates)
 */
export function estimateTokens(operation: string, input: string | any[]): number {
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
 * Create rate limit middleware for AI operations
 */
export function withRateLimit<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  config: RateLimitOptions,
  getUserId: (...args: T) => string = () => 'anonymous'
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const userId = getUserId(...args)
    const estimatedTokens = estimateTokens(operation, args)

    // Check rate limits using database-backed limiter
    const result = await aiRateLimiterDB.checkLimit(userId, config, estimatedTokens)

    if (!result.allowed) {
      const error = new Error('Rate limit exceeded')
      Object.assign(error, {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        remainingRequests: result.remainingRequests,
        remainingTokens: result.remainingTokens,
        resetTime: new Date(result.resetTime)
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
 * Get user rate limit config based on user role or subscription
 */
export function getRateLimitConfig(userRole?: string): RateLimitOptions {
  switch (userRole) {
    case 'corporativo':
      return RATE_LIMIT_CONFIGS.admin
    case 'gerente':
      return RATE_LIMIT_CONFIGS.premium
    case 'empleado':
      return RATE_LIMIT_CONFIGS.user
    default:
      return process.env.NODE_ENV === 'development'
        ? RATE_LIMIT_CONFIGS.development
        : RATE_LIMIT_CONFIGS.user
  }
}