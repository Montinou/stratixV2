/**
 * Multi-Tier Cache Manager
 * Implements L1 (Memory) -> L2 (Redis) -> L3 (Database) caching strategy
 * Optimized for free tier Redis with intelligent eviction and compression
 */

import { LRUCache } from 'lru-cache';
import { getRedisClient } from './client';
import type Redis from 'ioredis';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size?: number; // Estimated size in bytes
  compressed?: boolean;
}

interface CacheOptions {
  l1TTL?: number; // L1 cache TTL in ms (default: 5 minutes)
  l2TTL?: number; // L2 cache TTL in ms (default: 1 hour)
  l3TTL?: number; // L3 cache TTL in ms (default: 24 hours)
  namespace?: string;
  compress?: boolean; // Compress data for Redis storage
  maxL1Size?: number; // Max L1 cache entries
  priority?: 'speed' | 'memory' | 'balanced';
}

interface CacheStats {
  l1: {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  l2: {
    connected: boolean;
    memoryUsage: string;
    hits: number;
    misses: number;
    hitRate: number;
  };
  l3: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  total: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export class MultiTierCacheManager {
  private static instance: MultiTierCacheManager;
  private l1Cache: LRUCache<string, CacheEntry>;
  private redis: Redis | null = null;
  private stats = {
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    l3: { hits: 0, misses: 0 }
  };

  private constructor(
    private options: Required<CacheOptions> = {
      l1TTL: 5 * 60 * 1000, // 5 minutes
      l2TTL: 60 * 60 * 1000, // 1 hour
      l3TTL: 24 * 60 * 60 * 1000, // 24 hours
      namespace: 'cache',
      compress: true,
      maxL1Size: 500, // Reduced for memory efficiency
      priority: 'balanced'
    }
  ) {
    this.initializeL1Cache();
    this.initializeRedis();
  }

  public static getInstance(options?: Partial<CacheOptions>): MultiTierCacheManager {
    if (!MultiTierCacheManager.instance) {
      const defaultOptions: Required<CacheOptions> = {
        l1TTL: 5 * 60 * 1000,
        l2TTL: 60 * 60 * 1000,
        l3TTL: 24 * 60 * 60 * 1000,
        namespace: 'cache',
        compress: true,
        maxL1Size: 500,
        priority: 'balanced'
      };

      MultiTierCacheManager.instance = new MultiTierCacheManager({
        ...defaultOptions,
        ...options
      });
    }
    return MultiTierCacheManager.instance;
  }

  private initializeL1Cache(): void {
    // Configure L1 cache based on priority
    const sizeCalculation = (entry: CacheEntry) => {
      if (entry.size) return entry.size;

      // Estimate size based on data
      try {
        const jsonSize = JSON.stringify(entry.data).length;
        const entryOverhead = 100; // Estimated overhead
        return jsonSize + entryOverhead;
      } catch {
        return 1000; // Default fallback size
      }
    };

    this.l1Cache = new LRUCache<string, CacheEntry>({
      max: this.options.maxL1Size,
      ttl: this.options.l1TTL,
      sizeCalculation,
      // Memory-conscious settings for free tier
      maxSize: this.options.priority === 'memory' ? 10 * 1024 * 1024 : 50 * 1024 * 1024, // 10MB or 50MB
      allowStale: true, // Allow stale data for better performance
      updateAgeOnGet: true,
      dispose: (entry, key) => {
        // Log disposal for monitoring
        console.debug(`L1 cache disposed: ${key}`);
      }
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisClient = getRedisClient();
      this.redis = await redisClient.getClient();
      console.log('✅ Multi-tier cache connected to Redis');
    } catch (error) {
      console.warn('⚠️ Redis unavailable for multi-tier cache, using L1 + L3 only:', error);
      this.redis = null;
    }
  }

  /**
   * Generate cache key with namespace
   */
  private generateKey(operation: string, params: any): string {
    const redisClient = getRedisClient();
    const paramHash = redisClient.compressData(params);
    return redisClient.generateKey(this.options.namespace, operation, this.hashString(paramHash));
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get data from cache with L1 -> L2 -> L3 fallback
   */
  public async get<T>(
    operation: string,
    params: any,
    l3Fetcher?: () => Promise<T>
  ): Promise<T | null> {
    const key = this.generateKey(operation, params);
    const now = Date.now();

    try {
      // L1 Cache (Memory)
      const l1Entry = this.l1Cache.get(key);
      if (l1Entry && (now - l1Entry.timestamp) < this.options.l1TTL) {
        l1Entry.hits++;
        this.stats.l1.hits++;
        console.debug(`L1 cache hit: ${operation}`);
        return l1Entry.data as T;
      }
      this.stats.l1.misses++;

      // L2 Cache (Redis)
      if (this.redis) {
        try {
          const redisData = await this.redis.get(key);
          if (redisData) {
            const redisClient = getRedisClient();
            const entry: CacheEntry<T> = redisClient.decompressData(redisData);

            if ((now - entry.timestamp) < this.options.l2TTL) {
              // Store in L1 for faster future access
              this.l1Cache.set(key, {
                ...entry,
                hits: entry.hits + 1
              });

              this.stats.l2.hits++;
              console.debug(`L2 cache hit: ${operation}`);
              return entry.data;
            } else {
              // Expired in Redis, remove it
              await this.redis.del(key);
            }
          }
          this.stats.l2.misses++;
        } catch (error) {
          console.warn('⚠️ Redis L2 cache error:', error);
          this.stats.l2.misses++;
        }
      }

      // L3 Cache (Database/Source)
      if (l3Fetcher) {
        try {
          const data = await l3Fetcher();

          // Store in all available cache levels
          await this.set(operation, params, data);

          this.stats.l3.hits++;
          console.debug(`L3 cache hit: ${operation}`);
          return data;
        } catch (error) {
          console.error('❌ L3 cache fetch failed:', error);
          this.stats.l3.misses++;
          throw error;
        }
      }

      this.stats.l3.misses++;
      return null;
    } catch (error) {
      console.error('❌ Cache get operation failed:', error);
      return null;
    }
  }

  /**
   * Store data in all available cache levels
   */
  public async set<T>(
    operation: string,
    params: any,
    data: T,
    customTTL?: { l1?: number; l2?: number; l3?: number }
  ): Promise<void> {
    const key = this.generateKey(operation, params);
    const now = Date.now();

    const ttl = {
      l1: customTTL?.l1 || this.options.l1TTL,
      l2: customTTL?.l2 || this.options.l2TTL,
      l3: customTTL?.l3 || this.options.l3TTL
    };

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl.l1,
      hits: 0,
      compressed: this.options.compress
    };

    try {
      // Store in L1 (Memory)
      this.l1Cache.set(key, entry);

      // Store in L2 (Redis) if available
      if (this.redis) {
        try {
          const redisClient = getRedisClient();
          const compressedData = redisClient.compressData({
            ...entry,
            ttl: ttl.l2
          });

          // Set with TTL in Redis
          const ttlSeconds = Math.ceil(ttl.l2 / 1000);
          await this.redis.setex(key, ttlSeconds, compressedData);

          console.debug(`Stored in L2 cache: ${operation} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
          console.warn('⚠️ Failed to store in Redis L2 cache:', error);
        }
      }

      // L3 storage would be handled by the database layer
      console.debug(`Stored in cache: ${operation}`);
    } catch (error) {
      console.error('❌ Cache set operation failed:', error);
    }
  }

  /**
   * Check if key exists in any cache level
   */
  public async has(operation: string, params: any): Promise<boolean> {
    const key = this.generateKey(operation, params);

    // Check L1
    if (this.l1Cache.has(key)) {
      return true;
    }

    // Check L2 (Redis)
    if (this.redis) {
      try {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } catch (error) {
        console.warn('⚠️ Redis exists check failed:', error);
      }
    }

    return false;
  }

  /**
   * Delete from all cache levels
   */
  public async delete(operation: string, params: any): Promise<boolean> {
    const key = this.generateKey(operation, params);
    let deleted = false;

    try {
      // Delete from L1
      if (this.l1Cache.delete(key)) {
        deleted = true;
      }

      // Delete from L2 (Redis)
      if (this.redis) {
        try {
          const redisDeleted = await this.redis.del(key);
          if (redisDeleted > 0) {
            deleted = true;
          }
        } catch (error) {
          console.warn('⚠️ Redis delete failed:', error);
        }
      }

      return deleted;
    } catch (error) {
      console.error('❌ Cache delete operation failed:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  public async clear(): Promise<void> {
    try {
      // Clear L1
      this.l1Cache.clear();

      // Clear L2 (Redis) - only keys with our namespace
      if (this.redis) {
        try {
          const pattern = `${this.options.namespace}:*`;
          const keys = await this.redis.keys(pattern);

          if (keys.length > 0) {
            await this.redis.del(...keys);
            console.log(`Cleared ${keys.length} keys from Redis`);
          }
        } catch (error) {
          console.warn('⚠️ Redis clear failed:', error);
        }
      }

      // Reset stats
      this.stats = {
        l1: { hits: 0, misses: 0 },
        l2: { hits: 0, misses: 0 },
        l3: { hits: 0, misses: 0 }
      };

      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('❌ Cache clear operation failed:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  public async getStats(): Promise<CacheStats> {
    try {
      // L1 Stats
      const l1Size = this.l1Cache.size;
      const l1MaxSize = this.options.maxL1Size;
      const l1Hits = this.stats.l1.hits;
      const l1Misses = this.stats.l1.misses;
      const l1HitRate = l1Hits + l1Misses > 0 ? l1Hits / (l1Hits + l1Misses) : 0;

      // L2 Stats
      let l2Connected = false;
      let l2MemoryUsage = '0B';
      const l2Hits = this.stats.l2.hits;
      const l2Misses = this.stats.l2.misses;
      const l2HitRate = l2Hits + l2Misses > 0 ? l2Hits / (l2Hits + l2Misses) : 0;

      if (this.redis) {
        try {
          const redisClient = getRedisClient();
          const redisStats = await redisClient.getStats();
          l2Connected = redisStats.connected;
          l2MemoryUsage = redisStats.usedMemoryHuman;
        } catch (error) {
          console.warn('⚠️ Failed to get Redis stats:', error);
        }
      }

      // L3 Stats
      const l3Hits = this.stats.l3.hits;
      const l3Misses = this.stats.l3.misses;
      const l3HitRate = l3Hits + l3Misses > 0 ? l3Hits / (l3Hits + l3Misses) : 0;

      // Total Stats
      const totalHits = l1Hits + l2Hits + l3Hits;
      const totalMisses = l1Misses + l2Misses + l3Misses;
      const totalHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

      return {
        l1: {
          size: l1Size,
          maxSize: l1MaxSize,
          hits: l1Hits,
          misses: l1Misses,
          hitRate: l1HitRate
        },
        l2: {
          connected: l2Connected,
          memoryUsage: l2MemoryUsage,
          hits: l2Hits,
          misses: l2Misses,
          hitRate: l2HitRate
        },
        l3: {
          hits: l3Hits,
          misses: l3Misses,
          hitRate: l3HitRate
        },
        total: {
          hits: totalHits,
          misses: totalMisses,
          hitRate: totalHitRate
        }
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return {
        l1: { size: 0, maxSize: 0, hits: 0, misses: 0, hitRate: 0 },
        l2: { connected: false, memoryUsage: '0B', hits: 0, misses: 0, hitRate: 0 },
        l3: { hits: 0, misses: 0, hitRate: 0 },
        total: { hits: 0, misses: 0, hitRate: 0 }
      };
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  public async warmCache(
    operations: Array<{
      operation: string;
      params: any;
      fetcher: () => Promise<any>;
    }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    console.log(`🔥 Warming cache with ${operations.length} operations...`);

    for (const { operation, params, fetcher } of operations) {
      try {
        const data = await fetcher();
        await this.set(operation, params, data);
        success++;
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for ${operation}:`, error);
        failed++;
      }
    }

    console.log(`✅ Cache warming completed: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Clean up expired entries across all cache levels
   */
  public async cleanup(): Promise<void> {
    try {
      // L1 cleanup is handled automatically by LRU cache

      // L2 cleanup (Redis) - Redis handles expiration automatically
      // but we can manually clean up if needed
      if (this.redis) {
        const redisClient = getRedisClient();
        await redisClient.cleanup();
      }

      console.log('✅ Cache cleanup completed');
    } catch (error) {
      console.error('❌ Cache cleanup failed:', error);
    }
  }
}

/**
 * Create cache manager with optimized defaults for AI operations
 */
export function createAICacheManager(): MultiTierCacheManager {
  return MultiTierCacheManager.getInstance({
    namespace: 'ai',
    l1TTL: 5 * 60 * 1000, // 5 minutes for fast access
    l2TTL: 60 * 60 * 1000, // 1 hour for Redis storage
    l3TTL: 24 * 60 * 60 * 1000, // 24 hours for database persistence
    compress: true,
    maxL1Size: 300, // Reduced for AI data which can be large
    priority: 'balanced'
  });
}

// Export singleton instance for AI operations
export const aiCacheManager = createAICacheManager();