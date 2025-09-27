/**
 * AI Rate Limiter - Redis-optimized implementation with database fallback
 * L1: Redis sliding window -> L2: Database persistence
 * Optimized for free tier Redis usage with intelligent memory management
 */

// Export Redis implementation as primary
export * from './rate-limiter-redis'
export { redisRateLimiter as aiRateLimiter } from './rate-limiter-redis'

// Also export database implementation for fallback scenarios
export * from './rate-limiter-db'
export { aiRateLimiterDB } from './rate-limiter-db'