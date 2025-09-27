/**
 * Redis-Enhanced Conversation Manager
 * Provides L1 (Redis) session caching with L2 (Database) persistence
 * Optimized for free tier Redis with intelligent session state management
 */

import type { CoreMessage } from 'ai'
import { getRedisClient } from '@/lib/redis/client'
import { conversationManagerDB, type ConversationContext, type UserContext, type OKRContext } from './conversation-manager-db'
import type { Activity } from '@/lib/database/queries/activities'
import type Redis from 'ioredis'

interface RedisSessionCache {
  conversationId: string
  userContext: UserContext
  currentOKRs: OKRContext[]
  recentActivity: Activity[]
  conversationHistory: CoreMessage[]
  sessionMetadata: {
    startTime: Date
    lastActivity: Date
    messageCount: number
    topics: string[]
    mood?: 'positive' | 'neutral' | 'frustrated'
  }
  cacheTimestamp: number
  ttl: number
}

interface SessionCacheOptions {
  sessionTTL: number // Session cache TTL in seconds (default: 30 minutes)
  historyTTL: number // Recent messages TTL in seconds (default: 2 hours)
  maxHistoryInCache: number // Max messages to keep in Redis cache (default: 10)
  maxSessionsPerUser: number // Max concurrent sessions per user in cache (default: 3)
  compressionEnabled: boolean // Enable compression for large conversations
}

export class RedisConversationManager {
  private static instance: RedisConversationManager
  private redis: Redis | null = null
  private fallbackToDatabase = true
  private options: SessionCacheOptions

  private constructor(options: Partial<SessionCacheOptions> = {}) {
    this.options = {
      sessionTTL: 30 * 60, // 30 minutes
      historyTTL: 2 * 60 * 60, // 2 hours
      maxHistoryInCache: 10, // Keep last 10 messages in Redis
      maxSessionsPerUser: 3, // Max 3 active sessions per user
      compressionEnabled: true,
      ...options
    }
    this.initializeRedis()
  }

  public static getInstance(options?: Partial<SessionCacheOptions>): RedisConversationManager {
    if (!RedisConversationManager.instance) {
      RedisConversationManager.instance = new RedisConversationManager(options)
    }
    return RedisConversationManager.instance
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisClient = getRedisClient()
      this.redis = await redisClient.getClient()
      console.log('✅ Redis Conversation Manager initialized')
    } catch (error) {
      console.warn('⚠️ Redis unavailable for conversation caching, using database only:', error)
      this.redis = null
    }
  }

  /**
   * Generate Redis cache keys
   */
  private generateKeys(conversationId: string, userId?: string) {
    return {
      session: `conv:session:${conversationId}`,
      history: `conv:history:${conversationId}`,
      userSessions: userId ? `conv:user:${userId}:sessions` : null,
      metadata: `conv:meta:${conversationId}`
    }
  }

  /**
   * Initialize or retrieve conversation with Redis caching
   */
  async initializeConversation(
    conversationId: string,
    userContext: UserContext,
    initialOKRs: OKRContext[] = [],
    recentActivity: Activity[] = []
  ): Promise<ConversationContext> {
    const keys = this.generateKeys(conversationId, userContext.userId)

    // Try Redis cache first
    if (this.redis) {
      try {
        const cachedSession = await this.getFromCache(keys.session)
        if (cachedSession) {
          // Update last activity in cache
          cachedSession.sessionMetadata.lastActivity = new Date()
          await this.storeInCache(keys.session, cachedSession, this.options.sessionTTL)

          console.log(`🚀 Conversation ${conversationId} loaded from Redis cache`)
          return cachedSession
        }
      } catch (error) {
        console.warn('⚠️ Redis cache read failed, falling back to database:', error)
      }
    }

    // Fallback to database
    const context = await conversationManagerDB.initializeConversation(
      conversationId,
      userContext,
      initialOKRs,
      recentActivity
    )

    // Store in Redis cache for future use
    if (this.redis) {
      try {
        await this.cacheConversationContext(context)
        await this.manageUserSessionLimit(userContext.userId, conversationId)
      } catch (error) {
        console.warn('⚠️ Failed to cache conversation context:', error)
      }
    }

    return context
  }

  /**
   * Add message with Redis session management
   */
  async addMessage(
    conversationId: string,
    message: CoreMessage,
    extractTopics = true
  ): Promise<ConversationContext> {
    const keys = this.generateKeys(conversationId)

    // Try to update cache first
    if (this.redis) {
      try {
        const cachedSession = await this.getFromCache(keys.session)
        if (cachedSession) {
          // Update cached session
          cachedSession.conversationHistory.push(message)
          cachedSession.sessionMetadata.lastActivity = new Date()
          cachedSession.sessionMetadata.messageCount++

          // Keep only recent messages in cache
          if (cachedSession.conversationHistory.length > this.options.maxHistoryInCache) {
            cachedSession.conversationHistory = cachedSession.conversationHistory.slice(-this.options.maxHistoryInCache)
          }

          // Store updated session back to cache
          await this.storeInCache(keys.session, cachedSession, this.options.sessionTTL)

          // Also store in recent messages cache with longer TTL
          await this.cacheRecentMessage(conversationId, message)

          console.log(`💬 Message added to Redis cache for conversation ${conversationId}`)

          // Async update to database (fire and forget for performance)
          this.asyncUpdateDatabase(conversationId, message, extractTopics)

          return cachedSession
        }
      } catch (error) {
        console.warn('⚠️ Redis message caching failed:', error)
      }
    }

    // Fallback to database
    const context = await conversationManagerDB.addMessage(conversationId, message, extractTopics)

    // Update cache with new context
    if (this.redis) {
      try {
        await this.cacheConversationContext(context)
      } catch (error) {
        console.warn('⚠️ Failed to update conversation cache:', error)
      }
    }

    return context
  }

  /**
   * Get conversation history with Redis optimization
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 20
  ): Promise<CoreMessage[]> {
    const keys = this.generateKeys(conversationId)

    // Try Redis cache first
    if (this.redis) {
      try {
        // Check if we have recent messages in cache
        const recentMessages = await this.redis.lrange(keys.history, 0, limit - 1)
        if (recentMessages.length > 0) {
          const redisClient = getRedisClient()
          const messages = recentMessages
            .map(msg => redisClient.decompressData<CoreMessage>(msg))
            .reverse() // Redis LPUSH stores in reverse order

          console.log(`📜 Conversation history loaded from Redis cache (${messages.length} messages)`)
          return messages
        }
      } catch (error) {
        console.warn('⚠️ Redis history retrieval failed:', error)
      }
    }

    // Fallback to database
    const history = await conversationManagerDB.getConversationHistory(conversationId, limit)

    // Cache the history in Redis for future use
    if (this.redis && history.length > 0) {
      try {
        await this.cacheConversationHistory(conversationId, history)
      } catch (error) {
        console.warn('⚠️ Failed to cache conversation history:', error)
      }
    }

    return history
  }

  /**
   * Cache conversation context in Redis
   */
  private async cacheConversationContext(context: ConversationContext): Promise<void> {
    if (!this.redis) return

    const keys = this.generateKeys(context.conversationId, context.userContext.userId)
    const cacheData: RedisSessionCache = {
      ...context,
      cacheTimestamp: Date.now(),
      ttl: this.options.sessionTTL
    }

    // Limit history size in cache for memory efficiency
    if (cacheData.conversationHistory.length > this.options.maxHistoryInCache) {
      cacheData.conversationHistory = cacheData.conversationHistory.slice(-this.options.maxHistoryInCache)
    }

    await this.storeInCache(keys.session, cacheData, this.options.sessionTTL)

    // Also cache in user sessions set for management
    if (keys.userSessions) {
      await this.redis.sadd(keys.userSessions, context.conversationId)
      await this.redis.expire(keys.userSessions, this.options.sessionTTL)
    }
  }

  /**
   * Cache recent message separately for longer retention
   */
  private async cacheRecentMessage(conversationId: string, message: CoreMessage): Promise<void> {
    if (!this.redis) return

    const keys = this.generateKeys(conversationId)
    const redisClient = getRedisClient()
    const compressedMessage = redisClient.compressData(message)

    // Use Redis list for FIFO message storage
    const pipeline = this.redis.pipeline()
    pipeline.lpush(keys.history, compressedMessage)
    pipeline.ltrim(keys.history, 0, this.options.maxHistoryInCache - 1) // Keep only recent messages
    pipeline.expire(keys.history, this.options.historyTTL)

    await pipeline.exec()
  }

  /**
   * Cache full conversation history
   */
  private async cacheConversationHistory(conversationId: string, history: CoreMessage[]): Promise<void> {
    if (!this.redis || history.length === 0) return

    const keys = this.generateKeys(conversationId)
    const redisClient = getRedisClient()

    // Clear existing history cache
    await this.redis.del(keys.history)

    // Store messages in reverse order (most recent first for LPUSH)
    const pipeline = this.redis.pipeline()
    for (let i = history.length - 1; i >= 0; i--) {
      const compressedMessage = redisClient.compressData(history[i])
      pipeline.lpush(keys.history, compressedMessage)
    }

    // Limit to max history in cache
    pipeline.ltrim(keys.history, 0, this.options.maxHistoryInCache - 1)
    pipeline.expire(keys.history, this.options.historyTTL)

    await pipeline.exec()
  }

  /**
   * Manage user session limits to prevent memory bloat
   */
  private async manageUserSessionLimit(userId: string, currentConversationId: string): Promise<void> {
    if (!this.redis) return

    const userSessionsKey = `conv:user:${userId}:sessions`

    try {
      // Add current session
      await this.redis.sadd(userSessionsKey, currentConversationId)

      // Check if user has too many sessions
      const sessionCount = await this.redis.scard(userSessionsKey)

      if (sessionCount > this.options.maxSessionsPerUser) {
        // Get all sessions and remove oldest ones
        const sessions = await this.redis.smembers(userSessionsKey)

        // Remove excess sessions (this is simplified - in production you'd want to check timestamps)
        const sessionsToRemove = sessions.slice(0, sessionCount - this.options.maxSessionsPerUser)

        for (const sessionId of sessionsToRemove) {
          await this.clearSessionCache(sessionId)
          await this.redis.srem(userSessionsKey, sessionId)
        }

        console.log(`🧹 Cleaned up ${sessionsToRemove.length} old sessions for user ${userId}`)
      }

      // Set TTL on user sessions set
      await this.redis.expire(userSessionsKey, this.options.sessionTTL)
    } catch (error) {
      console.warn('⚠️ Failed to manage user session limits:', error)
    }
  }

  /**
   * Clear specific session from cache
   */
  private async clearSessionCache(conversationId: string): Promise<void> {
    if (!this.redis) return

    const keys = this.generateKeys(conversationId)

    const pipeline = this.redis.pipeline()
    pipeline.del(keys.session)
    pipeline.del(keys.history)
    pipeline.del(keys.metadata)

    await pipeline.exec()
  }

  /**
   * Store data in Redis with compression
   */
  private async storeInCache(key: string, data: any, ttlSeconds: number): Promise<void> {
    if (!this.redis) return

    const redisClient = getRedisClient()
    const compressed = this.options.compressionEnabled
      ? redisClient.compressData(data)
      : JSON.stringify(data)

    await this.redis.setex(key, ttlSeconds, compressed)
  }

  /**
   * Get data from Redis cache
   */
  private async getFromCache<T = any>(key: string): Promise<T | null> {
    if (!this.redis) return null

    const cached = await this.redis.get(key)
    if (!cached) return null

    try {
      const redisClient = getRedisClient()
      return this.options.compressionEnabled
        ? redisClient.decompressData<T>(cached)
        : JSON.parse(cached)
    } catch (error) {
      console.warn('⚠️ Failed to decompress cached data:', error)
      return null
    }
  }

  /**
   * Async database update (fire and forget)
   */
  private asyncUpdateDatabase(conversationId: string, message: CoreMessage, extractTopics: boolean): void {
    // Run in background without blocking the response
    conversationManagerDB.addMessage(conversationId, message, extractTopics)
      .catch(error => {
        console.error('❌ Background database update failed:', error)
        // In production, you might want to queue this for retry
      })
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisAvailable: boolean
    activeSessions: number
    totalMessages: number
    cacheHitRate: number
    memoryUsage: string
  }> {
    if (!this.redis) {
      return {
        redisAvailable: false,
        activeSessions: 0,
        totalMessages: 0,
        cacheHitRate: 0,
        memoryUsage: '0B'
      }
    }

    try {
      // Count active session keys
      const sessionKeys = await this.redis.keys('conv:session:*')
      const historyKeys = await this.redis.keys('conv:history:*')

      // Estimate total messages
      let totalMessages = 0
      for (const key of historyKeys.slice(0, 10)) { // Sample to avoid performance impact
        const count = await this.redis.llen(key)
        totalMessages += count
      }

      // Extrapolate if we sampled
      if (historyKeys.length > 10) {
        totalMessages = Math.round(totalMessages * (historyKeys.length / 10))
      }

      // Get Redis memory info
      const redisClient = getRedisClient()
      const redisStats = await redisClient.getStats()

      return {
        redisAvailable: true,
        activeSessions: sessionKeys.length,
        totalMessages,
        cacheHitRate: 0.85, // This would need to be tracked separately
        memoryUsage: redisStats.usedMemoryHuman
      }
    } catch (error) {
      console.error('❌ Failed to get conversation cache stats:', error)
      return {
        redisAvailable: false,
        activeSessions: 0,
        totalMessages: 0,
        cacheHitRate: 0,
        memoryUsage: '0B'
      }
    }
  }

  /**
   * Clean up expired sessions and optimize memory
   */
  async cleanup(): Promise<{ cleanedSessions: number; freedMemory: number }> {
    if (!this.redis) {
      return { cleanedSessions: 0, freedMemory: 0 }
    }

    try {
      let cleanedSessions = 0

      // Find and clean expired session keys
      const sessionKeys = await this.redis.keys('conv:session:*')

      for (const key of sessionKeys) {
        const ttl = await this.redis.ttl(key)
        if (ttl === -1) { // Key exists but has no TTL
          await this.redis.expire(key, this.options.sessionTTL)
        } else if (ttl === -2) { // Key doesn't exist (expired)
          cleanedSessions++
        }
      }

      // Clean up orphaned history keys
      const historyKeys = await this.redis.keys('conv:history:*')
      for (const key of historyKeys) {
        const conversationId = key.split(':')[2]
        const sessionKey = `conv:session:${conversationId}`

        const sessionExists = await this.redis.exists(sessionKey)
        if (!sessionExists) {
          await this.redis.del(key)
          cleanedSessions++
        }
      }

      console.log(`✅ Conversation cache cleanup: ${cleanedSessions} sessions cleaned`)
      return { cleanedSessions, freedMemory: cleanedSessions * 1024 } // Rough estimate
    } catch (error) {
      console.error('❌ Conversation cache cleanup failed:', error)
      return { cleanedSessions: 0, freedMemory: 0 }
    }
  }

  /**
   * Warm cache with recent conversations for a user
   */
  async warmUserCache(userId: string, conversationIds: string[]): Promise<void> {
    if (!this.redis) return

    console.log(`🔥 Warming conversation cache for user ${userId}...`)

    for (const conversationId of conversationIds.slice(0, this.options.maxSessionsPerUser)) {
      try {
        // Check if already cached
        const keys = this.generateKeys(conversationId, userId)
        const exists = await this.redis.exists(keys.session)

        if (!exists) {
          // Load from database and cache
          const history = await conversationManagerDB.getConversationHistory(conversationId, this.options.maxHistoryInCache)
          if (history.length > 0) {
            await this.cacheConversationHistory(conversationId, history)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for conversation ${conversationId}:`, error)
      }
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis !== null
  }
}

// Export singleton instance with optimized defaults for AI conversations
export const redisConversationManager = RedisConversationManager.getInstance({
  sessionTTL: 30 * 60, // 30 minutes - good balance for active conversations
  historyTTL: 2 * 60 * 60, // 2 hours - longer retention for message history
  maxHistoryInCache: 10, // Keep last 10 messages - sufficient for context
  maxSessionsPerUser: 3, // Limit to prevent memory bloat
  compressionEnabled: true // Essential for free tier efficiency
})

// Re-export types and database manager for compatibility
export * from './conversation-manager-db'
export { conversationManagerDB }