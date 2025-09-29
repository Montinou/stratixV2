import { Redis } from 'ioredis';

/**
 * Redis cache client adapted for internal tooling template
 * Provides graceful fallbacks when Redis is unavailable
 */

let redis: Redis | null = null;

// Initialize Redis client if URL is provided
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redis.on('error', (error) => {
      console.warn('Redis connection error:', error.message);
      // Don't throw error to maintain graceful fallback
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  } catch (error) {
    console.warn('Failed to initialize Redis:', error);
    redis = null;
  }
}

export class CacheService {
  private static readonly DEFAULT_TTL = 300; // 5 minutes

  /**
   * Get value from cache with graceful fallback
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set(key: string, value: unknown, ttlSeconds = this.DEFAULT_TTL): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn('Redis set error:', error);
      // Graceful fallback - don't throw error
    }
  }

  /**
   * Delete key from cache
   */
  static async del(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      console.warn('Redis del error:', error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!redis) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.warn('Redis delPattern error:', error);
    }
  }

  /**
   * Check if Redis is available
   */
  static isAvailable(): boolean {
    return redis !== null && redis.status === 'ready';
  }

  /**
   * Cache wrapper for function calls
   */
  static async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds = this.DEFAULT_TTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Generate cache keys for OKR entities
   */
  static generateKey(type: string, ...identifiers: string[]): string {
    return `stratix:${type}:${identifiers.join(':')}`;
  }

  /**
   * Cache OKR-specific data
   */
  static async cacheObjectives(companyId: string, tenantId: string, data: unknown): Promise<void> {
    const key = this.generateKey('objectives', companyId, tenantId);
    await this.set(key, data, 300); // 5 minutes
  }

  static async getCachedObjectives(companyId: string, tenantId: string): Promise<unknown> {
    const key = this.generateKey('objectives', companyId, tenantId);
    return await this.get(key);
  }

  static async cacheUserDashboard(userId: string, data: unknown): Promise<void> {
    const key = this.generateKey('dashboard', userId);
    await this.set(key, data, 180); // 3 minutes
  }

  static async getCachedUserDashboard(userId: string): Promise<unknown> {
    const key = this.generateKey('dashboard', userId);
    return await this.get(key);
  }

  static async cacheAnalytics(companyId: string, tenantId: string, data: unknown): Promise<void> {
    const key = this.generateKey('analytics', companyId, tenantId);
    await this.set(key, data, 600); // 10 minutes
  }

  static async getCachedAnalytics(companyId: string, tenantId: string): Promise<unknown> {
    const key = this.generateKey('analytics', companyId, tenantId);
    return await this.get(key);
  }

  /**
   * Invalidate caches for specific entities
   */
  static async invalidateObjectives(companyId: string, tenantId: string): Promise<void> {
    await this.del(this.generateKey('objectives', companyId, tenantId));
    await this.del(this.generateKey('analytics', companyId, tenantId));
  }

  static async invalidateUserCache(userId: string): Promise<void> {
    await this.del(this.generateKey('dashboard', userId));
  }

  static async invalidateCompanyCache(companyId: string): Promise<void> {
    await this.delPattern(this.generateKey('*', companyId, '*'));
  }

  /**
   * Cache AI responses to avoid duplicate calls
   */
  static async cacheAIResponse(prompt: string, model: string, response: unknown): Promise<void> {
    const promptHash = Buffer.from(prompt).toString('base64').slice(0, 32);
    const key = this.generateKey('ai', model, promptHash);
    await this.set(key, response, 3600); // 1 hour
  }

  static async getCachedAIResponse(prompt: string, model: string): Promise<unknown> {
    const promptHash = Buffer.from(prompt).toString('base64').slice(0, 32);
    const key = this.generateKey('ai', model, promptHash);
    return await this.get(key);
  }

  /**
   * Cache conversation context
   */
  static async cacheConversationContext(conversationId: string, context: unknown): Promise<void> {
    const key = this.generateKey('conversation', conversationId);
    await this.set(key, context, 1800); // 30 minutes
  }

  static async getCachedConversationContext(conversationId: string): Promise<unknown> {
    const key = this.generateKey('conversation', conversationId);
    return await this.get(key);
  }

  /**
   * Health check for Redis connection
   */
  static async healthCheck(): Promise<{ status: string; latency?: number }> {
    if (!redis) {
      return { status: 'unavailable' };
    }

    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'error' };
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<Record<string, unknown>> {
    if (!redis) {
      return { status: 'unavailable' };
    }

    try {
      const info = await redis.info('memory');
      const keyspace = await redis.info('keyspace');

      return {
        status: 'available',
        memory: info,
        keyspace: keyspace,
      };
    } catch (error) {
      return { status: 'error', error: (error as Error).message };
    }
  }

  /**
   * Cleanup expired keys and optimize memory
   */
  static async cleanup(): Promise<void> {
    if (!redis) return;

    try {
      // Get all our application keys
      const keys = await redis.keys('stratix:*');

      // Check TTL for each key and remove expired ones
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // Key exists but has no TTL, set a default TTL
          await redis.expire(key, this.DEFAULT_TTL);
        }
      }
    } catch (error) {
      console.warn('Redis cleanup error:', error);
    }
  }
}

// Export Redis instance for direct access if needed
export { redis };