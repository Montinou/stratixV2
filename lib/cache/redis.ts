/**
 * Redis Caching Layer for Onboarding Infrastructure
 * Specialized caching for onboarding workflow with session management,
 * AI response caching, and dynamic content optimization
 */

import { getRedisClient } from '@/lib/redis/client';
import { MultiTierCacheManager } from '@/lib/redis/cache-manager';
import { isFeatureEnabled } from './edge-config';
import type { OnboardingStepInfo } from '@/lib/database/onboarding-types';

export interface OnboardingCacheEntry {
  userId: string;
  sessionId: string;
  currentStep: number;
  stepData: Record<string, any>;
  completedSteps: number[];
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface AICacheEntry {
  prompt: string;
  response: string;
  model: string;
  timestamp: number;
  context: Record<string, any>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface DynamicContentCache {
  contentType: 'step_suggestions' | 'ai_hints' | 'personalized_content' | 'validation_rules';
  userId: string;
  stepNumber: number;
  content: any;
  personalizationLevel: 'low' | 'medium' | 'high';
  timestamp: number;
}

export class OnboardingRedisCache {
  private static instance: OnboardingRedisCache;
  private cacheManager: MultiTierCacheManager;
  private redisClient: any;
  private enabled: boolean = true;

  private constructor() {
    this.cacheManager = MultiTierCacheManager.getInstance({
      namespace: 'onboarding',
      l1TTL: 2 * 60 * 1000, // 2 minutes for frequently accessed data
      l2TTL: 15 * 60 * 1000, // 15 minutes for session data
      l3TTL: 2 * 60 * 60 * 1000, // 2 hours for AI responses
      compress: true,
      maxL1Size: 200,
      priority: 'speed'
    });

    this.initializeRedis();
  }

  public static getInstance(): OnboardingRedisCache {
    if (!OnboardingRedisCache.instance) {
      OnboardingRedisCache.instance = new OnboardingRedisCache();
    }
    return OnboardingRedisCache.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.enabled = await isFeatureEnabled('redis_caching');
      if (!this.enabled) {
        console.log('Redis caching disabled by feature flag');
        return;
      }

      this.redisClient = getRedisClient();
      console.log('✅ Onboarding Redis cache initialized');
    } catch (error) {
      console.warn('⚠️ Redis cache initialization failed, operating in fallback mode:', error);
      this.enabled = false;
    }
  }

  /**
   * Session Management Cache Operations
   */

  /**
   * Store onboarding session data
   */
  public async setOnboardingSession(
    sessionId: string,
    userId: string,
    sessionData: Partial<OnboardingCacheEntry>
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry: OnboardingCacheEntry = {
        sessionId,
        userId,
        currentStep: sessionData.currentStep || 1,
        stepData: sessionData.stepData || {},
        completedSteps: sessionData.completedSteps || [],
        timestamp: Date.now(),
        expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
        version: '1.0',
        ...sessionData
      };

      await this.cacheManager.set(
        'session',
        { sessionId, userId },
        entry,
        {
          l1: 2 * 60 * 1000, // 2 minutes
          l2: 15 * 60 * 1000, // 15 minutes
          l3: 2 * 60 * 60 * 1000 // 2 hours
        }
      );

      // Also store by userId for quick lookup
      await this.cacheManager.set(
        'user_session',
        { userId },
        { sessionId, lastActivity: Date.now() },
        { l1: 5 * 60 * 1000, l2: 30 * 60 * 1000 }
      );

      console.debug(`Onboarding session cached: ${sessionId} for user: ${userId}`);
    } catch (error) {
      console.error('Failed to cache onboarding session:', error);
    }
  }

  /**
   * Get onboarding session data
   */
  public async getOnboardingSession(
    sessionId: string,
    userId?: string
  ): Promise<OnboardingCacheEntry | null> {
    if (!this.enabled) return null;

    try {
      const session = await this.cacheManager.get<OnboardingCacheEntry>(
        'session',
        { sessionId, userId: userId || 'unknown' }
      );

      if (session && session.expiresAt > Date.now()) {
        return session;
      }

      if (session && session.expiresAt <= Date.now()) {
        // Session expired, clean it up
        await this.deleteOnboardingSession(sessionId, userId);
        return null;
      }

      return null;
    } catch (error) {
      console.error('Failed to get onboarding session:', error);
      return null;
    }
  }

  /**
   * Get user's current session
   */
  public async getUserCurrentSession(userId: string): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const userSession = await this.cacheManager.get<{ sessionId: string; lastActivity: number }>(
        'user_session',
        { userId }
      );

      return userSession?.sessionId || null;
    } catch (error) {
      console.error('Failed to get user current session:', error);
      return null;
    }
  }

  /**
   * Update session step progress
   */
  public async updateSessionProgress(
    sessionId: string,
    userId: string,
    currentStep: number,
    stepData: Record<string, any>,
    completedSteps: number[]
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const existing = await this.getOnboardingSession(sessionId, userId);
      if (!existing) {
        console.warn(`Session not found for update: ${sessionId}`);
        return;
      }

      const updated: OnboardingCacheEntry = {
        ...existing,
        currentStep,
        stepData: { ...existing.stepData, ...stepData },
        completedSteps,
        timestamp: Date.now()
      };

      await this.setOnboardingSession(sessionId, userId, updated);
    } catch (error) {
      console.error('Failed to update session progress:', error);
    }
  }

  /**
   * Delete onboarding session
   */
  public async deleteOnboardingSession(sessionId: string, userId?: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.cacheManager.delete('session', { sessionId, userId: userId || 'unknown' });

      if (userId) {
        await this.cacheManager.delete('user_session', { userId });
      }

      console.debug(`Onboarding session deleted: ${sessionId}`);
    } catch (error) {
      console.error('Failed to delete onboarding session:', error);
    }
  }

  /**
   * AI Response Caching Operations
   */

  /**
   * Cache AI response for future use
   */
  public async cacheAIResponse(
    prompt: string,
    response: string,
    context: Record<string, any>,
    model: string = 'default',
    usage?: AICacheEntry['usage']
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry: AICacheEntry = {
        prompt,
        response,
        model,
        timestamp: Date.now(),
        context,
        usage
      };

      // Create a hash of the prompt and context for caching
      const promptHash = this.hashString(JSON.stringify({ prompt, context, model }));

      await this.cacheManager.set(
        'ai_response',
        { hash: promptHash },
        entry,
        {
          l1: 10 * 60 * 1000, // 10 minutes
          l2: 60 * 60 * 1000, // 1 hour
          l3: 6 * 60 * 60 * 1000 // 6 hours
        }
      );

      console.debug(`AI response cached for prompt hash: ${promptHash}`);
    } catch (error) {
      console.error('Failed to cache AI response:', error);
    }
  }

  /**
   * Get cached AI response
   */
  public async getCachedAIResponse(
    prompt: string,
    context: Record<string, any>,
    model: string = 'default'
  ): Promise<AICacheEntry | null> {
    if (!this.enabled) return null;

    try {
      const promptHash = this.hashString(JSON.stringify({ prompt, context, model }));

      const cached = await this.cacheManager.get<AICacheEntry>(
        'ai_response',
        { hash: promptHash }
      );

      // Check if the cached response is still fresh (within 1 hour)
      if (cached && (Date.now() - cached.timestamp) < (60 * 60 * 1000)) {
        console.debug(`AI response cache hit for hash: ${promptHash}`);
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached AI response:', error);
      return null;
    }
  }

  /**
   * Dynamic Content Caching Operations
   */

  /**
   * Cache personalized content for user
   */
  public async cachePersonalizedContent(
    userId: string,
    stepNumber: number,
    contentType: DynamicContentCache['contentType'],
    content: any,
    personalizationLevel: DynamicContentCache['personalizationLevel'] = 'medium'
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry: DynamicContentCache = {
        contentType,
        userId,
        stepNumber,
        content,
        personalizationLevel,
        timestamp: Date.now()
      };

      await this.cacheManager.set(
        'personalized_content',
        { userId, stepNumber, contentType },
        entry,
        {
          l1: 5 * 60 * 1000, // 5 minutes
          l2: 30 * 60 * 1000, // 30 minutes
          l3: 2 * 60 * 60 * 1000 // 2 hours
        }
      );

      console.debug(`Personalized content cached: ${contentType} for user ${userId}, step ${stepNumber}`);
    } catch (error) {
      console.error('Failed to cache personalized content:', error);
    }
  }

  /**
   * Get cached personalized content
   */
  public async getPersonalizedContent(
    userId: string,
    stepNumber: number,
    contentType: DynamicContentCache['contentType']
  ): Promise<DynamicContentCache | null> {
    if (!this.enabled) return null;

    try {
      const cached = await this.cacheManager.get<DynamicContentCache>(
        'personalized_content',
        { userId, stepNumber, contentType }
      );

      // Content is valid for 30 minutes
      if (cached && (Date.now() - cached.timestamp) < (30 * 60 * 1000)) {
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Failed to get personalized content:', error);
      return null;
    }
  }

  /**
   * Step Data Caching Operations
   */

  /**
   * Cache step configuration with user customizations
   */
  public async cacheStepConfig(
    userId: string,
    stepNumber: number,
    stepInfo: OnboardingStepInfo,
    customizations?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry = {
        stepInfo,
        customizations: customizations || {},
        userId,
        timestamp: Date.now()
      };

      await this.cacheManager.set(
        'step_config',
        { userId, stepNumber },
        entry,
        {
          l1: 10 * 60 * 1000, // 10 minutes
          l2: 60 * 60 * 1000, // 1 hour
          l3: 4 * 60 * 60 * 1000 // 4 hours
        }
      );
    } catch (error) {
      console.error('Failed to cache step config:', error);
    }
  }

  /**
   * Get cached step configuration
   */
  public async getStepConfig(
    userId: string,
    stepNumber: number
  ): Promise<{ stepInfo: OnboardingStepInfo; customizations: Record<string, any> } | null> {
    if (!this.enabled) return null;

    try {
      return await this.cacheManager.get(
        'step_config',
        { userId, stepNumber }
      );
    } catch (error) {
      console.error('Failed to get step config:', error);
      return null;
    }
  }

  /**
   * Utility Methods
   */

  /**
   * Generate hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Bulk invalidate cache for user
   */
  public async invalidateUserCache(userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      // Invalidate all user-related cache entries
      const patterns = [
        { operation: 'user_session', params: { userId } },
        { operation: 'personalized_content', params: { userId } },
        { operation: 'step_config', params: { userId } }
      ];

      for (const pattern of patterns) {
        await this.cacheManager.delete(pattern.operation, pattern.params);
      }

      console.debug(`Cache invalidated for user: ${userId}`);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public async getCacheStats(): Promise<{
    enabled: boolean;
    stats: any;
    health: any;
  }> {
    try {
      const stats = await this.cacheManager.getStats();

      let health = { status: 'unknown' };
      if (this.redisClient) {
        health = await this.redisClient.checkHealth();
      }

      return {
        enabled: this.enabled,
        stats,
        health
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        enabled: this.enabled,
        stats: null,
        health: { status: 'error', error: error.message }
      };
    }
  }

  /**
   * Warm up cache with common data
   */
  public async warmUpCache(userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      console.log(`🔥 Warming up cache for user: ${userId}`);

      // Pre-load commonly accessed data
      const operations = [
        {
          operation: 'user_session',
          params: { userId },
          fetcher: async () => ({ sessionId: null, lastActivity: Date.now() })
        }
      ];

      await this.cacheManager.warmCache(operations);
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }

  /**
   * Health check for cache system
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      if (!this.enabled) {
        return {
          status: 'degraded',
          details: { message: 'Cache disabled by feature flag' }
        };
      }

      const stats = await this.getCacheStats();

      if (stats.health.status === 'error') {
        return {
          status: 'unhealthy',
          details: stats.health
        };
      }

      return {
        status: 'healthy',
        details: {
          enabled: this.enabled,
          cacheStats: stats.stats,
          redisHealth: stats.health
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
}

// Export singleton instance
export const onboardingCache = OnboardingRedisCache.getInstance();