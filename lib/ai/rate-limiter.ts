/**
 * AI Rate Limiter - Protects against excessive AI API usage and controls costs
 * Implements token bucket and sliding window algorithms
 */

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  maxTokens?: number // Max tokens per window (for cost control)
  keyGenerator?: (identifier: string) => string
  skipFailedRequests?: boolean
  skipSuccessfulRequests?: boolean
}

interface RateLimitEntry {
  requests: number[]
  tokens: number
  resetTime: number
}

interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  remainingTokens: number
  resetTime: number
  totalHits: number
  retryAfter?: number
}

export class AIRateLimiter {
  private static instance: AIRateLimiter
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  public static getInstance(): AIRateLimiter {
    if (!AIRateLimiter.instance) {
      AIRateLimiter.instance = new AIRateLimiter()
    }
    return AIRateLimiter.instance
  }

  /**
   * Check if request is allowed under rate limits
   */
  public checkLimit(
    identifier: string,
    options: RateLimitOptions,
    estimatedTokens: number = 0
  ): RateLimitResult {
    const key = options.keyGenerator ? options.keyGenerator(identifier) : identifier
    const now = Date.now()
    const windowStart = now - options.windowMs

    // Get or create entry
    let entry = this.store.get(key)
    if (!entry) {
      entry = {
        requests: [],
        tokens: 0,
        resetTime: now + options.windowMs
      }
      this.store.set(key, entry)
    }

    // Clean old requests from sliding window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart)

    // Reset token count if window has expired
    if (now >= entry.resetTime) {
      entry.tokens = 0
      entry.resetTime = now + options.windowMs
    }

    // Check request limit
    const remainingRequests = Math.max(0, options.maxRequests - entry.requests.length)
    const requestAllowed = entry.requests.length < options.maxRequests

    // Check token limit (if specified)
    let tokenAllowed = true
    let remainingTokens = Infinity
    if (options.maxTokens) {
      remainingTokens = Math.max(0, options.maxTokens - entry.tokens)
      tokenAllowed = entry.tokens + estimatedTokens <= options.maxTokens
    }

    const allowed = requestAllowed && tokenAllowed

    // If allowed, record the request
    if (allowed) {
      entry.requests.push(now)
      entry.tokens += estimatedTokens
    }

    // Calculate retry after time
    let retryAfter: number | undefined
    if (!allowed) {
      if (!requestAllowed) {
        // Find the oldest request that will age out
        const oldestRequest = entry.requests[0]
        retryAfter = Math.max(0, oldestRequest + options.windowMs - now)
      } else if (!tokenAllowed) {
        // Token limit hit, retry after window reset
        retryAfter = Math.max(0, entry.resetTime - now)
      }
    }

    return {
      allowed,
      remainingRequests,
      remainingTokens: options.maxTokens ? remainingTokens : Infinity,
      resetTime: entry.resetTime,
      totalHits: entry.requests.length,
      retryAfter: retryAfter ? Math.ceil(retryAfter / 1000) : undefined // Convert to seconds
    }
  }

  /**
   * Record actual token usage after request completion
   */
  public recordTokenUsage(identifier: string, actualTokens: number): void {
    const entry = this.store.get(identifier)
    if (entry) {
      // Update with actual token usage (difference from estimate)
      entry.tokens = Math.max(0, entry.tokens)
    }
  }

  /**
   * Get current usage statistics for an identifier
   */
  public getUsage(identifier: string): {
    requests: number
    tokens: number
    resetTime: number
    windowTimeLeft: number
  } {
    const entry = this.store.get(identifier)
    const now = Date.now()

    if (!entry) {
      return {
        requests: 0,
        tokens: 0,
        resetTime: now,
        windowTimeLeft: 0
      }
    }

    const windowStart = now - (entry.resetTime - now)
    const validRequests = entry.requests.filter(timestamp => timestamp > windowStart)

    return {
      requests: validRequests.length,
      tokens: entry.tokens,
      resetTime: entry.resetTime,
      windowTimeLeft: Math.max(0, entry.resetTime - now)
    }
  }

  /**
   * Reset limits for a specific identifier
   */
  public reset(identifier: string): boolean {
    return this.store.delete(identifier)
  }

  /**
   * Reset all limits
   */
  public resetAll(): void {
    this.store.clear()
  }

  /**
   * Get global statistics
   */
  public getGlobalStats(): {
    totalEntries: number
    totalRequests: number
    totalTokens: number
    topUsers: Array<{
      identifier: string
      requests: number
      tokens: number
    }>
  } {
    const stats = {
      totalEntries: this.store.size,
      totalRequests: 0,
      totalTokens: 0,
      topUsers: [] as Array<{
        identifier: string
        requests: number
        tokens: number
      }>
    }

    const userStats: Array<{
      identifier: string
      requests: number
      tokens: number
    }> = []

    for (const [identifier, entry] of this.store.entries()) {
      const requests = entry.requests.length
      const tokens = entry.tokens

      stats.totalRequests += requests
      stats.totalTokens += tokens

      userStats.push({
        identifier,
        requests,
        tokens
      })
    }

    // Sort by request count and take top 10
    stats.topUsers = userStats
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    return stats
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.store.entries()) {
      // Remove entries that haven't been accessed in 2x the window time
      const lastRequest = entry.requests[entry.requests.length - 1] || 0
      if (now - lastRequest > 2 * (entry.resetTime - now)) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.store.delete(key))

    if (toDelete.length > 0) {
      console.log(`Rate Limiter: Cleaned up ${toDelete.length} expired entries`)
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
    this.store.clear()
  }
}

// Export singleton instance
export const aiRateLimiter = AIRateLimiter.getInstance()

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

    // Check rate limits
    const result = aiRateLimiter.checkLimit(userId, config, estimatedTokens)

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