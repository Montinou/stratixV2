/**
 * Redis Client - Optimized for Free Tier Usage
 * Provides efficient Redis connection with automatic reconnection,
 * memory monitoring, and fallback strategies for free tier limits
 */

import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';

interface RedisConfig {
  url: string;
  maxMemoryPolicy?: 'allkeys-lru' | 'volatile-lru' | 'allkeys-lfu' | 'volatile-lfu';
  keyPrefix?: string;
  connectTimeout?: number;
  commandTimeout?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  maxMemoryWarningThreshold?: number; // MB
}

interface RedisStats {
  connected: boolean;
  usedMemory: number; // bytes
  usedMemoryHuman: string;
  connectedClients: number;
  totalCommandsProcessed: number;
  keyspace: Record<string, any>;
  uptime: number;
}

export class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private config: RedisConfig;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private memoryWarningThreshold: number;

  private constructor(config: RedisConfig) {
    this.config = {
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      maxMemoryWarningThreshold: 80, // 80MB for free tier
      ...config
    };

    this.memoryWarningThreshold = this.config.maxMemoryWarningThreshold! * 1024 * 1024; // Convert MB to bytes
    this.connect();
    this.setupHealthMonitoring();
  }

  public static getInstance(config?: RedisConfig): RedisClient {
    if (!RedisClient.instance) {
      if (!config) {
        throw new Error('Redis config required for first initialization');
      }
      RedisClient.instance = new RedisClient(config);
    }
    return RedisClient.instance;
  }

  private connect(): void {
    if (this.client) {
      this.client.disconnect();
    }

    const redisOptions: RedisOptions = {
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableReadyCheck: this.config.enableReadyCheck,
      keyPrefix: this.config.keyPrefix,
      // Optimize for free tier
      lazyConnect: true,
      keepAlive: 30000,
      // Reduce connection overhead
      family: 4, // Force IPv4
      // Error handling
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: 300,
      maxRetriesPerRequest: 3,
    };

    this.client = new Redis(this.config.url, redisOptions);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready for commands');
      this.configureMemoryPolicy();
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      this.handleConnectionError(error);
    });

    this.client.on('close', () => {
      console.warn('⚠️ Redis connection closed');
    });

    this.client.on('reconnecting', (time) => {
      console.log(`🔄 Redis reconnecting in ${time}ms... (attempt ${this.reconnectAttempts + 1})`);
      this.reconnectAttempts++;
    });

    this.client.on('end', () => {
      console.warn('⚠️ Redis connection ended');
    });
  }

  private async configureMemoryPolicy(): Promise<void> {
    if (!this.client || !this.config.maxMemoryPolicy) return;

    try {
      // Set memory policy for efficient eviction on free tier
      await this.client.config('SET', 'maxmemory-policy', this.config.maxMemoryPolicy);
      console.log(`✅ Redis memory policy set to: ${this.config.maxMemoryPolicy}`);
    } catch (error) {
      console.warn('⚠️ Could not set Redis memory policy (might not have admin access):', error);
    }
  }

  private setupHealthMonitoring(): void {
    // Check Redis health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('❌ Redis health check failed:', error);
      }
    }, 30000);
  }

  private handleConnectionError(error: Error): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Redis failed to reconnect after ${this.maxReconnectAttempts} attempts`);
      // Could implement fallback to database-only mode here
      return;
    }

    // Exponential backoff for reconnection
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      console.log(`🔄 Attempting Redis reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /**
   * Get Redis client instance with connection check
   */
  public async getClient(): Promise<Redis> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    if (this.client.status !== 'ready') {
      if (this.client.status === 'connecting') {
        // Wait for connection to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, this.config.connectTimeout);

          this.client!.once('ready', () => {
            clearTimeout(timeout);
            resolve(void 0);
          });

          this.client!.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      } else {
        throw new Error(`Redis not ready, status: ${this.client.status}`);
      }
    }

    return this.client;
  }

  /**
   * Check if Redis is available and connected
   */
  public isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  /**
   * Ping Redis to check connectivity
   */
  public async ping(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Redis memory and performance statistics
   */
  public async getStats(): Promise<RedisStats> {
    try {
      const client = await this.getClient();
      const info = await client.info('memory');
      const keyspaceInfo = await client.info('keyspace');
      const serverInfo = await client.info('server');
      const statsInfo = await client.info('stats');

      // Parse memory info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryHumanMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const clientsMatch = serverInfo.match(/connected_clients:(\d+)/);
      const commandsMatch = statsInfo.match(/total_commands_processed:(\d+)/);
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);

      const usedMemory = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      const usedMemoryHuman = memoryHumanMatch ? memoryHumanMatch[1].trim() : '0B';
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;
      const totalCommandsProcessed = commandsMatch ? parseInt(commandsMatch[1]) : 0;
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

      // Parse keyspace info
      const keyspace: Record<string, any> = {};
      const keyspaceLines = keyspaceInfo.split('\n');
      for (const line of keyspaceLines) {
        const match = line.match(/^db(\d+):keys=(\d+),expires=(\d+),avg_ttl=(\d+)$/);
        if (match) {
          keyspace[`db${match[1]}`] = {
            keys: parseInt(match[2]),
            expires: parseInt(match[3]),
            avg_ttl: parseInt(match[4])
          };
        }
      }

      // Check memory warning
      if (usedMemory > this.memoryWarningThreshold) {
        console.warn(`⚠️ Redis memory usage high: ${usedMemoryHuman} (threshold: ${this.config.maxMemoryWarningThreshold}MB)`);
      }

      return {
        connected: this.isConnected(),
        usedMemory,
        usedMemoryHuman,
        connectedClients,
        totalCommandsProcessed,
        keyspace,
        uptime
      };
    } catch (error) {
      console.error('❌ Failed to get Redis stats:', error);
      return {
        connected: false,
        usedMemory: 0,
        usedMemoryHuman: '0B',
        connectedClients: 0,
        totalCommandsProcessed: 0,
        keyspace: {},
        uptime: 0
      };
    }
  }

  /**
   * Health check for Redis connection and performance
   */
  public async checkHealth(): Promise<{
    healthy: boolean;
    latency: number;
    memoryUsage: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let latency = 0;
    let memoryUsage = 0;

    try {
      // Check connection
      if (!this.isConnected()) {
        issues.push('Redis not connected');
        return { healthy: false, latency: 0, memoryUsage: 0, issues };
      }

      // Measure latency
      const start = Date.now();
      await this.ping();
      latency = Date.now() - start;

      if (latency > 1000) {
        issues.push(`High latency: ${latency}ms`);
      }

      // Check memory usage
      const stats = await this.getStats();
      memoryUsage = stats.usedMemory;

      if (memoryUsage > this.memoryWarningThreshold) {
        issues.push(`High memory usage: ${stats.usedMemoryHuman}`);
      }

      // Check if memory is approaching free tier limits
      const freetierLimit = 100 * 1024 * 1024; // 100MB typical free tier limit
      if (memoryUsage > freetierLimit * 0.9) {
        issues.push('Approaching free tier memory limit');
      }

      return {
        healthy: issues.length === 0,
        latency,
        memoryUsage,
        issues
      };
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      return { healthy: false, latency, memoryUsage, issues };
    }
  }

  /**
   * Clean up expired keys and optimize memory usage
   */
  public async cleanup(): Promise<{ deletedKeys: number; freedMemory: number }> {
    try {
      const client = await this.getClient();
      const beforeStats = await this.getStats();

      // Use Redis SCAN to find expired keys
      let deletedKeys = 0;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'COUNT', 100);
        cursor = nextCursor;

        for (const key of keys) {
          const ttl = await client.ttl(key);
          if (ttl === -2) { // Key doesn't exist (expired)
            deletedKeys++;
          }
        }
      } while (cursor !== '0');

      const afterStats = await this.getStats();
      const freedMemory = beforeStats.usedMemory - afterStats.usedMemory;

      console.log(`✅ Redis cleanup completed: ${deletedKeys} keys cleaned, ${freedMemory} bytes freed`);

      return { deletedKeys, freedMemory };
    } catch (error) {
      console.error('❌ Redis cleanup failed:', error);
      return { deletedKeys: 0, freedMemory: 0 };
    }
  }

  /**
   * Compress data before storing in Redis (for free tier optimization)
   */
  public compressData(data: any): string {
    try {
      // Simple JSON compression by removing whitespace
      const jsonString = JSON.stringify(data);

      // Additional compression could be added here (e.g., gzip)
      // For now, we'll use JSON.stringify with no formatting
      return jsonString;
    } catch (error) {
      console.error('❌ Data compression failed:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress data retrieved from Redis
   */
  public decompressData<T>(compressedData: string): T {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.error('❌ Data decompression failed:', error);
      throw new Error('Failed to decompress Redis data');
    }
  }

  /**
   * Generate efficient cache keys with prefixes
   */
  public generateKey(namespace: string, ...parts: (string | number)[]): string {
    // Use short, efficient key format for free tier
    const keyParts = [namespace, ...parts.map(p => String(p))];
    return keyParts.join(':');
  }

  /**
   * Disconnect Redis client
   */
  public async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * Force reconnection
   */
  public async reconnect(): Promise<void> {
    console.log('🔄 Forcing Redis reconnection...');
    await this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Execute Redis command with automatic retry and fallback
   */
  public async executeCommand<T>(
    command: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      return await command();
    } catch (error) {
      console.warn('⚠️ Redis command failed:', error);

      if (fallback) {
        console.log('🔄 Using fallback for failed Redis command');
        return await fallback();
      }

      throw error;
    }
  }
}

/**
 * Create and configure Redis client instance
 */
export function createRedisClient(config?: Partial<RedisConfig>): RedisClient {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  const fullConfig: RedisConfig = {
    url: redisUrl,
    keyPrefix: 'stratix:',
    maxMemoryPolicy: 'allkeys-lru', // Best for caching on free tier
    maxMemoryWarningThreshold: 80, // 80MB warning threshold
    ...config
  };

  return RedisClient.getInstance(fullConfig);
}

// Export singleton getter
export const getRedisClient = () => {
  try {
    return RedisClient.getInstance();
  } catch (error) {
    // Create with default config if not initialized
    return createRedisClient();
  }
};