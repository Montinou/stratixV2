// Simple in-memory rate limiter
// In production, this should be replaced with Redis or Upstash

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private limits = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async limit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{
    success: boolean;
    remaining: number;
    reset: number;
    total: number;
  }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    const record = this.limits.get(key);

    if (!record || now >= record.resetTime) {
      // Create new record or reset expired one
      this.limits.set(key, { count: 1, resetTime });
      return {
        success: true,
        remaining: limit - 1,
        reset: resetTime,
        total: limit
      };
    }

    if (record.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        reset: record.resetTime,
        total: limit
      };
    }

    // Increment counter
    record.count++;
    return {
      success: true,
      remaining: limit - record.count,
      reset: record.resetTime,
      total: limit
    };
  }

  async reset(key: string): Promise<void> {
    this.limits.delete(key);
  }

  async getRemainingLimit(key: string, limit: number): Promise<number> {
    const record = this.limits.get(key);
    if (!record || Date.now() >= record.resetTime) {
      return limit;
    }
    return Math.max(0, limit - record.count);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now >= record.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Create singleton instance
export const ratelimit = new MemoryRateLimiter();

// Utility functions for common rate limiting patterns
export class RateLimitUtils {

  /**
   * Check if user has exceeded AI usage limits
   */
  static async checkAIUsageLimit(
    userId: string,
    operation: 'analysis' | 'validation' | 'completion'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limits = {
      analysis: { limit: 10, window: 60 * 60 * 1000 }, // 10 per hour
      validation: { limit: 30, window: 60 * 60 * 1000 }, // 30 per hour
      completion: { limit: 15, window: 60 * 60 * 1000 }  // 15 per hour
    };

    const config = limits[operation];
    const key = `ai_usage:${operation}:${userId}`;

    const result = await ratelimit.limit(key, config.limit, config.window);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset
    };
  }

  /**
   * Check session operation limits
   */
  static async checkSessionLimit(
    userId: string,
    operation: 'create' | 'update' | 'delete'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limits = {
      create: { limit: 5, window: 60 * 60 * 1000 },   // 5 per hour
      update: { limit: 100, window: 60 * 60 * 1000 }, // 100 per hour
      delete: { limit: 3, window: 60 * 60 * 1000 }    // 3 per hour
    };

    const config = limits[operation];
    const key = `session:${operation}:${userId}`;

    const result = await ratelimit.limit(key, config.limit, config.window);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset
    };
  }

  /**
   * Check organization operation limits
   */
  static async checkOrganizationLimit(
    userId: string,
    operation: 'create' | 'update' | 'invite' | 'remove'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limits = {
      create: { limit: 2, window: 24 * 60 * 60 * 1000 }, // 2 per day
      update: { limit: 20, window: 60 * 60 * 1000 },     // 20 per hour
      invite: { limit: 10, window: 60 * 60 * 1000 },     // 10 per hour
      remove: { limit: 5, window: 60 * 60 * 1000 }       // 5 per hour
    };

    const config = limits[operation];
    const key = `org:${operation}:${userId}`;

    const result = await ratelimit.limit(key, config.limit, config.window);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset
    };
  }

  /**
   * Check IP-based limits to prevent abuse
   */
  static async checkIPLimit(
    ipAddress: string,
    endpoint: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `ip:${endpoint}:${ipAddress}`;
    const limit = 200; // 200 requests per hour per IP
    const window = 60 * 60 * 1000;

    const result = await ratelimit.limit(key, limit, window);

    return {
      allowed: result.success,
      remaining: result.remaining,
      resetTime: result.reset
    };
  }

  /**
   * Get rate limit status for multiple operations
   */
  static async getRateLimitStatus(
    userId: string
  ): Promise<{
    ai_analysis: { remaining: number; resetTime: number };
    ai_validation: { remaining: number; resetTime: number };
    ai_completion: { remaining: number; resetTime: number };
    session_operations: { create: number; update: number; delete: number };
    organization_operations: { create: number; update: number; invite: number };
  }> {
    const aiAnalysisRemaining = await ratelimit.getRemainingLimit(`ai_usage:analysis:${userId}`, 10);
    const aiValidationRemaining = await ratelimit.getRemainingLimit(`ai_usage:validation:${userId}`, 30);
    const aiCompletionRemaining = await ratelimit.getRemainingLimit(`ai_usage:completion:${userId}`, 15);

    const sessionCreateRemaining = await ratelimit.getRemainingLimit(`session:create:${userId}`, 5);
    const sessionUpdateRemaining = await ratelimit.getRemainingLimit(`session:update:${userId}`, 100);
    const sessionDeleteRemaining = await ratelimit.getRemainingLimit(`session:delete:${userId}`, 3);

    const orgCreateRemaining = await ratelimit.getRemainingLimit(`org:create:${userId}`, 2);
    const orgUpdateRemaining = await ratelimit.getRemainingLimit(`org:update:${userId}`, 20);
    const orgInviteRemaining = await ratelimit.getRemainingLimit(`org:invite:${userId}`, 10);

    const hourFromNow = Date.now() + (60 * 60 * 1000);

    return {
      ai_analysis: { remaining: aiAnalysisRemaining, resetTime: hourFromNow },
      ai_validation: { remaining: aiValidationRemaining, resetTime: hourFromNow },
      ai_completion: { remaining: aiCompletionRemaining, resetTime: hourFromNow },
      session_operations: {
        create: sessionCreateRemaining,
        update: sessionUpdateRemaining,
        delete: sessionDeleteRemaining
      },
      organization_operations: {
        create: orgCreateRemaining,
        update: orgUpdateRemaining,
        invite: orgInviteRemaining
      }
    };
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  static async resetUserLimits(userId: string): Promise<void> {
    const patterns = [
      `ai_usage:analysis:${userId}`,
      `ai_usage:validation:${userId}`,
      `ai_usage:completion:${userId}`,
      `session:create:${userId}`,
      `session:update:${userId}`,
      `session:delete:${userId}`,
      `org:create:${userId}`,
      `org:update:${userId}`,
      `org:invite:${userId}`,
      `org:remove:${userId}`
    ];

    for (const pattern of patterns) {
      await ratelimit.reset(pattern);
    }
  }

  /**
   * Create a rate limit middleware function
   */
  static createMiddleware(
    type: 'ai' | 'session' | 'organization',
    operation: string,
    customLimit?: { limit: number; window: number }
  ) {
    return async (userId: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
      let key: string;
      let limit: number;
      let window: number;

      if (customLimit) {
        key = `custom:${type}:${operation}:${userId}`;
        limit = customLimit.limit;
        window = customLimit.window;
      } else {
        switch (type) {
          case 'ai':
            return this.checkAIUsageLimit(userId, operation as any);
          case 'session':
            return this.checkSessionLimit(userId, operation as any);
          case 'organization':
            return this.checkOrganizationLimit(userId, operation as any);
          default:
            throw new Error(`Unknown rate limit type: ${type}`);
        }
      }

      const result = await ratelimit.limit(key, limit, window);

      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTime: result.reset
      };
    };
  }
}

// Export the rate limiter and utilities
export default ratelimit;