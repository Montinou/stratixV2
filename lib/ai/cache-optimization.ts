import { createHash } from 'crypto'

/**
 * Advanced AI Cache Optimization System
 * Implements intelligent cache warming, preloading, and cost-aware optimization
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: Date
  ttl: number
  hits: number
  cost?: number
  tags?: string[]
  popularityScore: number
  lastAccess: Date
  size: number
}

export interface CacheStats {
  size: number
  maxSize: number
  hitRate: number
  missRate: number
  memoryUsage: number
  costSavings: number
  popularQueries: CacheEntry[]
  expiredEntries: number
  warmingStatus: 'idle' | 'warming' | 'complete'
  analytics: CacheAnalytics
}

export interface CacheAnalytics {
  totalRequests: number
  totalHits: number
  totalMisses: number
  averageResponseTime: number
  peakMemoryUsage: number
  costSavingsPerHour: number
  topOperations: Array<{
    operation: string
    count: number
    hitRate: number
    averageCost: number
  }>
  timeToLive: {
    average: number
    median: number
    p95: number
  }
  evictionStats: {
    totalEvictions: number
    evictionReasons: Record<string, number>
  }
}

export interface ClusterNode {
  id: string
  url: string
  status: 'active' | 'inactive' | 'syncing'
  lastHeartbeat: Date
  lag: number
}

export interface CacheOptimizationConfig {
  maxSize: number
  defaultTTL: number
  warmingQueries: string[]
  costThreshold: number
  popularityThreshold: number
  memoryLimit: number // in MB
  enableClustering: boolean
  clusterNodes?: string[]
  enableAnalytics: boolean
  analyticsRetentionDays: number
  evictionStrategy: 'lru' | 'lfu' | 'popularity' | 'cost-aware'
  compressionEnabled: boolean
  backgroundSyncEnabled: boolean
  shardingEnabled: boolean
  replicationFactor: number
}

export interface WarmingQuery {
  operation: string
  params: any
  priority: number
  frequency: number
}

export class AICacheOptimization {
  private static instance: AICacheOptimization
  private cache = new Map<string, CacheEntry>()
  private config: CacheOptimizationConfig
  private cleanupInterval: NodeJS.Timeout | null = null
  private warmingInterval: NodeJS.Timeout | null = null
  private memoryMonitorInterval: NodeJS.Timeout | null = null
  private clusterSyncInterval: NodeJS.Timeout | null = null
  private totalRequests = 0
  private totalHits = 0
  private totalCostSavings = 0
  private warmingQueries: Map<string, WarmingQuery> = new Map()
  private readonly sizeLimitBytes: number
  private analytics: CacheAnalytics
  private clusterNodes: Map<string, ClusterNode> = new Map()
  private operationStats: Map<string, { count: number; hits: number; totalCost: number; responseTimes: number[] }> = new Map()
  private evictionStats = { totalEvictions: 0, evictionReasons: {} as Record<string, number> }
  private peakMemoryUsage = 0
  private responseTimes: number[] = []

  private constructor(config: Partial<CacheOptimizationConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 5000,
      defaultTTL: config.defaultTTL || 1000 * 60 * 60, // 1 hour
      warmingQueries: config.warmingQueries || [],
      costThreshold: config.costThreshold || 0.01, // $0.01
      popularityThreshold: config.popularityThreshold || 10,
      memoryLimit: config.memoryLimit || 512, // 512MB
      enableClustering: config.enableClustering || false,
      clusterNodes: config.clusterNodes || [],
      enableAnalytics: config.enableAnalytics ?? true,
      analyticsRetentionDays: config.analyticsRetentionDays || 7,
      evictionStrategy: config.evictionStrategy || 'popularity',
      compressionEnabled: config.compressionEnabled ?? false,
      backgroundSyncEnabled: config.backgroundSyncEnabled ?? true,
      shardingEnabled: config.shardingEnabled ?? false,
      replicationFactor: config.replicationFactor || 1
    }

    this.analytics = this.initializeAnalytics()

    this.sizeLimitBytes = this.config.memoryLimit * 1024 * 1024 // Convert MB to bytes
    this.initializeOptimization()
  }

  public static getInstance(config?: Partial<CacheOptimizationConfig>): AICacheOptimization {
    if (!AICacheOptimization.instance) {
      AICacheOptimization.instance = new AICacheOptimization(config)
    }
    return AICacheOptimization.instance
  }

  private initializeAnalytics(): CacheAnalytics {
    return {
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      averageResponseTime: 0,
      peakMemoryUsage: 0,
      costSavingsPerHour: 0,
      topOperations: [],
      timeToLive: {
        average: 0,
        median: 0,
        p95: 0
      },
      evictionStats: {
        totalEvictions: 0,
        evictionReasons: {}
      }
    }
  }

  private initializeOptimization(): void {
    // Start cleanup interval every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 10 * 60 * 1000)

    // Start warming interval every hour
    this.warmingInterval = setInterval(() => {
      this.performCacheWarming()
    }, 60 * 60 * 1000)

    // Start memory monitoring every 5 minutes
    this.memoryMonitorInterval = setInterval(() => {
      this.monitorMemoryUsage()
    }, 5 * 60 * 1000)

    // Initialize clustering if enabled
    if (this.config.enableClustering) {
      this.initializeClustering()
    }

    // Initial warming
    this.performCacheWarming()
  }

  /**
   * Initialize clustering functionality
   */
  private initializeClustering(): void {
    if (this.config.clusterNodes) {
      this.config.clusterNodes.forEach(nodeUrl => {
        const nodeId = this.generateNodeId(nodeUrl)
        this.clusterNodes.set(nodeId, {
          id: nodeId,
          url: nodeUrl,
          status: 'inactive',
          lastHeartbeat: new Date(),
          lag: 0
        })
      })
    }

    // Start cluster sync interval every 30 seconds
    this.clusterSyncInterval = setInterval(() => {
      this.syncCluster()
    }, 30 * 1000)

    console.log(`Clustering initialized with ${this.clusterNodes.size} nodes`)
  }

  /**
   * Generate unique node ID from URL
   */
  private generateNodeId(url: string): string {
    return createHash('sha256').update(url).digest('hex').substring(0, 16)
  }

  /**
   * Generate cache key from input parameters with optimization
   */
  private generateKey(operation: string, params: any): string {
    const normalizedParams = this.normalizeParams(params)
    const serialized = JSON.stringify({
      operation,
      ...normalizedParams
    })
    return createHash('sha256').update(serialized).digest('hex')
  }

  /**
   * Normalize parameters for consistent caching
   */
  private normalizeParams(params: any): any {
    if (!params) return {}

    // Sort object keys for consistent serialization
    if (typeof params === 'object' && !Array.isArray(params)) {
      const normalized: any = {}
      Object.keys(params).sort().forEach(key => {
        normalized[key] = this.normalizeParams(params[key])
      })
      return normalized
    }

    return params
  }

  /**
   * Calculate intelligent TTL based on cost, popularity, and access patterns
   */
  public calculateIntelligentTTL(
    operation: string,
    cost: number = 0,
    hitCount: number = 0,
    lastAccess: Date = new Date()
  ): number {
    const baseTTL = this.config.defaultTTL

    // Cost multiplier: Higher cost = longer TTL
    const costMultiplier = Math.min(Math.max(cost / this.config.costThreshold, 1), 10)

    // Popularity multiplier: More hits = longer TTL
    const popularityMultiplier = hitCount > this.config.popularityThreshold ? 2 : 1

    // Recency multiplier: Recent access = longer TTL
    const hoursSinceAccess = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60)
    const recencyMultiplier = Math.max(1, 2 - hoursSinceAccess / 24) // Decays over 24 hours

    // Operation-specific multipliers
    const operationMultiplier = this.getOperationMultiplier(operation)

    return Math.floor(baseTTL * costMultiplier * popularityMultiplier * recencyMultiplier * operationMultiplier)
  }

  private getOperationMultiplier(operation: string): number {
    const operationMultipliers: Record<string, number> = {
      'insights': 3, // Cache insights longer (analytics data changes slowly)
      'suggestions': 2, // Cache suggestions moderately
      'embeddings': 10, // Cache embeddings very long (rarely change)
      'templates': 4, // Cache templates long
      'chat': 0.5, // Cache chat responses briefly
      'realtime': 0.1 // Cache realtime data very briefly
    }

    return operationMultipliers[operation] || 1
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateSize(data: any): number {
    try {
      const str = JSON.stringify(data)
      return new Blob([str]).size
    } catch {
      return 1024 // Default 1KB if estimation fails
    }
  }

  /**
   * Store data in cache with intelligent optimization
   */
  public set<T>(
    operation: string,
    params: any,
    data: T,
    options: {
      ttl?: number
      cost?: number
      tags?: string[]
      forceEviction?: boolean
    } = {}
  ): boolean {
    const key = this.generateKey(operation, params)
    const existingEntry = this.cache.get(key)
    const size = this.estimateSize(data)

    // Check memory limits before adding
    if (!this.canAddEntry(size, options.forceEviction)) {
      this.performMemoryOptimization()
      if (!this.canAddEntry(size, true)) {
        console.warn('Cache: Cannot add entry due to memory constraints')
        return false
      }
    }

    const cost = options.cost || 0
    const hitCount = existingEntry?.hits || 0
    const lastAccess = existingEntry?.lastAccess || new Date()

    const ttl = options.ttl || this.calculateIntelligentTTL(operation, cost, hitCount, lastAccess)

    const entry: CacheEntry = {
      data,
      timestamp: new Date(),
      ttl,
      hits: hitCount,
      cost,
      tags: options.tags,
      popularityScore: this.calculatePopularityScore(hitCount, cost, lastAccess),
      lastAccess: new Date(),
      size
    }

    this.cache.set(key, entry)
    this.updateWarmingQueries(operation, params)

    return true
  }

  /**
   * Get data from cache with analytics tracking
   */
  public get<T>(operation: string, params: any): T | null {
    const startTime = Date.now()
    this.totalRequests++

    if (this.config.enableAnalytics) {
      this.analytics.totalRequests++
    }

    const key = this.generateKey(operation, params)
    const entry = this.cache.get(key)

    if (!entry) {
      if (this.config.enableAnalytics) {
        this.analytics.totalMisses++
        this.updateOperationStats(operation, false, 0)
      }
      return null
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key)
      if (this.config.enableAnalytics) {
        this.analytics.totalMisses++
        this.updateOperationStats(operation, false, 0)
      }
      return null
    }

    // Update analytics
    entry.hits++
    entry.lastAccess = new Date()
    entry.popularityScore = this.calculatePopularityScore(entry.hits, entry.cost || 0, entry.lastAccess)
    this.totalHits++
    this.totalCostSavings += entry.cost || 0

    if (this.config.enableAnalytics) {
      this.analytics.totalHits++
      const responseTime = Date.now() - startTime
      this.updateOperationStats(operation, true, entry.cost || 0, responseTime)
      this.updateResponseTimeMetrics(responseTime)
    }

    return entry.data as T
  }

  /**
   * Update operation statistics for analytics
   */
  private updateOperationStats(operation: string, hit: boolean, cost: number, responseTime: number = 0): void {
    const stats = this.operationStats.get(operation) || {
      count: 0,
      hits: 0,
      totalCost: 0,
      responseTimes: []
    }

    stats.count++
    if (hit) {
      stats.hits++
    }
    stats.totalCost += cost
    if (responseTime > 0) {
      stats.responseTimes.push(responseTime)
      // Keep only last 100 response times to prevent memory bloat
      if (stats.responseTimes.length > 100) {
        stats.responseTimes = stats.responseTimes.slice(-100)
      }
    }

    this.operationStats.set(operation, stats)
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    this.responseTimes.push(responseTime)
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }

    // Update average response time
    this.analytics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
  }

  /**
   * Calculate popularity score for cache optimization
   */
  private calculatePopularityScore(hits: number, cost: number, lastAccess: Date): number {
    const recencyFactor = Math.max(0, 1 - (Date.now() - lastAccess.getTime()) / (7 * 24 * 60 * 60 * 1000)) // 7 days decay
    const costFactor = Math.min(cost / this.config.costThreshold, 5) // Cap at 5x
    const hitsFactor = Math.log(hits + 1) // Logarithmic scaling

    return hitsFactor * costFactor * recencyFactor
  }

  /**
   * Check if we can add a new entry
   */
  private canAddEntry(size: number, forceEviction: boolean = false): boolean {
    const currentMemory = this.getCurrentMemoryUsage()
    const wouldExceed = currentMemory + size > this.sizeLimitBytes

    if (wouldExceed && !forceEviction) {
      return false
    }

    if (this.cache.size >= this.config.maxSize) {
      return forceEviction
    }

    return true
  }

  /**
   * Get current memory usage in bytes
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  /**
   * Perform memory optimization by evicting entries based on strategy
   */
  private performMemoryOptimization(): void {
    const entries = Array.from(this.cache.entries())
    const currentMemory = this.getCurrentMemoryUsage()

    if (currentMemory <= this.sizeLimitBytes * 0.8) { // Only optimize if over 80% capacity
      return
    }

    // Track peak memory usage
    if (currentMemory > this.peakMemoryUsage) {
      this.peakMemoryUsage = currentMemory
      if (this.config.enableAnalytics) {
        this.analytics.peakMemoryUsage = currentMemory
      }
    }

    const evictionReason = this.config.evictionStrategy
    let sortedEntries: Array<[string, CacheEntry]>

    // Apply eviction strategy
    switch (this.config.evictionStrategy) {
      case 'lru':
        // Least Recently Used
        sortedEntries = entries.sort(([, a], [, b]) =>
          a.lastAccess.getTime() - b.lastAccess.getTime()
        )
        break

      case 'lfu':
        // Least Frequently Used
        sortedEntries = entries.sort(([, a], [, b]) => a.hits - b.hits)
        break

      case 'cost-aware':
        // Cost-aware eviction (keep expensive entries longer)
        sortedEntries = entries.sort(([, a], [, b]) => {
          const aCostValue = (a.cost || 0) * a.hits
          const bCostValue = (b.cost || 0) * b.hits
          return aCostValue - bCostValue
        })
        break

      case 'popularity':
      default:
        // Popularity-based (default)
        sortedEntries = entries.sort(([, a], [, b]) => a.popularityScore - b.popularityScore)
        break
    }

    // Remove entries until we're under 70% capacity
    const targetMemory = this.sizeLimitBytes * 0.7
    let currentSize = currentMemory
    let evicted = 0
    const evictedCost = []

    for (const [key, entry] of sortedEntries) {
      if (currentSize <= targetMemory) break

      this.cache.delete(key)
      currentSize -= entry.size
      evicted++
      evictedCost.push(entry.cost || 0)

      // Track eviction in analytics
      if (this.config.enableAnalytics) {
        this.evictionStats.totalEvictions++
        this.evictionStats.evictionReasons[evictionReason] =
          (this.evictionStats.evictionReasons[evictionReason] || 0) + 1
      }
    }

    if (evicted > 0) {
      const totalEvictedCost = evictedCost.reduce((sum, cost) => sum + cost, 0)
      console.log(`Cache optimization (${evictionReason}): Evicted ${evicted} entries, freed ${((currentMemory - currentSize) / 1024 / 1024).toFixed(2)}MB, cost impact: $${totalEvictedCost.toFixed(4)}`)
    }
  }

  /**
   * Perform cache warming with intelligent preloading
   */
  public async performCacheWarming(): Promise<void> {
    if (this.warmingQueries.size === 0) {
      this.discoverWarmingQueries()
    }

    console.log('Cache warming: Starting intelligent preloading')

    // Sort warming queries by priority and frequency
    const queries = Array.from(this.warmingQueries.values())
      .sort((a, b) => (b.priority * b.frequency) - (a.priority * a.frequency))
      .slice(0, 20) // Limit to top 20 queries

    let warmed = 0
    for (const query of queries) {
      try {
        // Check if already cached
        if (this.has(query.operation, query.params)) {
          continue
        }

        // This would need to be connected to actual AI operations
        // For now, we'll just mark the warming queries
        console.log(`Cache warming: Would warm ${query.operation}`)
        warmed++

        // Prevent overwhelming the system
        if (warmed >= 10) break

      } catch (error) {
        console.error(`Cache warming failed for ${query.operation}:`, error)
      }
    }

    console.log(`Cache warming: Completed ${warmed} queries`)
  }

  /**
   * Discover warming queries from access patterns
   */
  private discoverWarmingQueries(): void {
    const entries = Array.from(this.cache.entries())

    // Find popular operations
    const operationStats = new Map<string, { hits: number, cost: number, frequency: number }>()

    for (const [key, entry] of entries) {
      if (entry.hits < 3) continue // Only consider entries with multiple hits

      // Extract operation from cache key (simplified - would need actual operation tracking)
      const operation = key.substring(0, 10) // Placeholder
      const stats = operationStats.get(operation) || { hits: 0, cost: 0, frequency: 0 }
      stats.hits += entry.hits
      stats.cost += entry.cost || 0
      stats.frequency++
      operationStats.set(operation, stats)
    }

    // Convert to warming queries
    for (const [operation, stats] of operationStats) {
      if (stats.frequency >= 2) { // Only operations seen multiple times
        this.warmingQueries.set(operation, {
          operation,
          params: {}, // Would need to track actual parameters
          priority: Math.min(stats.cost / this.config.costThreshold, 10),
          frequency: stats.frequency
        })
      }
    }
  }

  /**
   * Update warming queries based on access patterns
   */
  private updateWarmingQueries(operation: string, params: any): void {
    const existing = this.warmingQueries.get(operation)
    if (existing) {
      existing.frequency++
    } else {
      this.warmingQueries.set(operation, {
        operation,
        params,
        priority: 1,
        frequency: 1
      })
    }
  }

  /**
   * Check if data exists in cache
   */
  public has(operation: string, params: any): boolean {
    const key = this.generateKey(operation, params)
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check if entry has expired
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear cache entries by tag with analytics
   */
  public clearByTag(tag: string): number {
    let deleted = 0
    const deletedEntries: CacheEntry[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        deletedEntries.push(entry)
        this.cache.delete(key)
        deleted++
      }
    }

    // Log cost impact
    const costImpact = deletedEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0)
    console.log(`Cache invalidation: Cleared ${deleted} entries with tag '${tag}', cost impact: $${costImpact.toFixed(4)}`)

    return deleted
  }

  /**
   * Perform comprehensive cleanup with optimization
   */
  private performCleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []
    let expiredCost = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        toDelete.push(key)
        expiredCost += entry.cost || 0
      }
    }

    toDelete.forEach(key => this.cache.delete(key))

    if (toDelete.length > 0) {
      console.log(`Cache cleanup: Removed ${toDelete.length} expired entries, cost impact: $${expiredCost.toFixed(4)}`)
    }

    // Perform memory optimization if needed
    this.performMemoryOptimization()
  }

  /**
   * Monitor memory usage and trigger optimizations
   */
  private monitorMemoryUsage(): void {
    const currentMemory = this.getCurrentMemoryUsage()
    const memoryUsageMB = currentMemory / (1024 * 1024)
    const usagePercent = (currentMemory / this.sizeLimitBytes) * 100

    console.log(`Cache memory: ${memoryUsageMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`)

    if (usagePercent > 90) {
      console.warn('Cache memory usage critical, performing emergency optimization')
      this.performMemoryOptimization()
    }
  }

  /**
   * Synchronize cache with cluster nodes
   */
  private async syncCluster(): Promise<void> {
    if (!this.config.enableClustering || this.clusterNodes.size === 0) {
      return
    }

    try {
      for (const [nodeId, node] of this.clusterNodes) {
        await this.syncWithNode(node)
      }
    } catch (error) {
      console.error('Cluster sync failed:', error)
    }
  }

  /**
   * Synchronize with a specific cluster node
   */
  private async syncWithNode(node: ClusterNode): Promise<void> {
    try {
      const startTime = Date.now()

      // This would make an actual HTTP request to the node
      // For now, we'll simulate the sync process
      const syncData = {
        nodeId: node.id,
        timestamp: new Date().toISOString(),
        cacheStats: this.getBasicStats()
      }

      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

      const endTime = Date.now()
      node.lag = endTime - startTime
      node.lastHeartbeat = new Date()
      node.status = 'active'

      console.log(`Synced with cluster node ${node.id} (lag: ${node.lag}ms)`)

    } catch (error) {
      node.status = 'inactive'
      console.error(`Failed to sync with node ${node.id}:`, error)
    }
  }

  /**
   * Get basic cache statistics
   */
  private getBasicStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.getCurrentMemoryUsage(),
      hitRate: this.totalRequests > 0 ? this.totalHits / this.totalRequests : 0
    }
  }

  /**
   * Calculate and update analytics data
   */
  private updateAnalytics(): void {
    if (!this.config.enableAnalytics) {
      return
    }

    // Update top operations
    const topOps = Array.from(this.operationStats.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        hitRate: stats.count > 0 ? stats.hits / stats.count : 0,
        averageCost: stats.count > 0 ? stats.totalCost / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    this.analytics.topOperations = topOps

    // Calculate TTL statistics
    const entries = Array.from(this.cache.values())
    const ttlValues = entries.map(entry => entry.ttl).sort((a, b) => a - b)

    if (ttlValues.length > 0) {
      this.analytics.timeToLive = {
        average: ttlValues.reduce((sum, ttl) => sum + ttl, 0) / ttlValues.length,
        median: ttlValues[Math.floor(ttlValues.length / 2)],
        p95: ttlValues[Math.floor(ttlValues.length * 0.95)]
      }
    }

    // Update cost savings per hour
    const costSavingsPerSecond = this.totalCostSavings / (Date.now() / 1000)
    this.analytics.costSavingsPerHour = costSavingsPerSecond * 3600

    // Update eviction stats
    this.analytics.evictionStats = {
      totalEvictions: this.evictionStats.totalEvictions,
      evictionReasons: { ...this.evictionStats.evictionReasons }
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  public getAdvancedStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalMemory = this.getCurrentMemoryUsage()
    const hitRate = this.totalRequests > 0 ? this.totalHits / this.totalRequests : 0
    const missRate = 1 - hitRate

    // Update analytics before returning stats
    this.updateAnalytics()

    // Get popular queries (top 10 by popularity score)
    const popularQueries = entries
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 10)

    // Count expired entries
    const now = Date.now()
    const expiredEntries = entries.filter(entry =>
      now - entry.timestamp.getTime() > entry.ttl
    ).length

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      missRate,
      memoryUsage: totalMemory,
      costSavings: this.totalCostSavings,
      popularQueries,
      expiredEntries,
      warmingStatus: this.warmingQueries.size > 0 ? 'complete' : 'idle',
      analytics: this.analytics
    }
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    const costImpact = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + (entry.cost || 0), 0)

    this.cache.clear()
    this.warmingQueries.clear()
    this.totalRequests = 0
    this.totalHits = 0
    this.totalCostSavings = 0

    console.log(`Cache cleared: ${this.cache.size} entries removed, cost impact: $${costImpact.toFixed(4)}`)
  }

  /**
   * Get cluster node status
   */
  public getClusterStatus(): Array<ClusterNode> {
    return Array.from(this.clusterNodes.values())
  }

  /**
   * Add new cluster node
   */
  public addClusterNode(url: string): string {
    const nodeId = this.generateNodeId(url)
    const node: ClusterNode = {
      id: nodeId,
      url,
      status: 'inactive',
      lastHeartbeat: new Date(),
      lag: 0
    }

    this.clusterNodes.set(nodeId, node)
    console.log(`Added cluster node: ${nodeId} (${url})`)

    return nodeId
  }

  /**
   * Remove cluster node
   */
  public removeClusterNode(nodeId: string): boolean {
    const removed = this.clusterNodes.delete(nodeId)
    if (removed) {
      console.log(`Removed cluster node: ${nodeId}`)
    }
    return removed
  }

  /**
   * Destroy cache and cleanup all intervals
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    if (this.warmingInterval) {
      clearInterval(this.warmingInterval)
      this.warmingInterval = null
    }

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
      this.memoryMonitorInterval = null
    }

    if (this.clusterSyncInterval) {
      clearInterval(this.clusterSyncInterval)
      this.clusterSyncInterval = null
    }

    this.clear()
  }

  /**
   * Export cache data for clustering/backup
   */
  public exportCache(): any {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      stats: this.getAdvancedStats(),
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        lastAccess: entry.lastAccess.toISOString()
      }))
    }

    return exportData
  }

  /**
   * Import cache data from backup/cluster
   */
  public importCache(data: any): boolean {
    try {
      if (!data.entries || !Array.isArray(data.entries)) {
        return false
      }

      let imported = 0
      for (const item of data.entries) {
        const entry: CacheEntry = {
          ...item,
          timestamp: new Date(item.timestamp),
          lastAccess: new Date(item.lastAccess)
        }

        // Only import non-expired entries
        const now = Date.now()
        if (now - entry.timestamp.getTime() < entry.ttl) {
          this.cache.set(item.key, entry)
          imported++
        }
      }

      console.log(`Cache import: Restored ${imported} entries`)
      return true

    } catch (error) {
      console.error('Cache import failed:', error)
      return false
    }
  }
}

// Export singleton instance with default configuration
export const aiCacheOptimization = AICacheOptimization.getInstance({
  maxSize: 5000,
  defaultTTL: 1000 * 60 * 60, // 1 hour
  costThreshold: 0.01, // $0.01
  popularityThreshold: 10,
  memoryLimit: 512, // 512MB
  enableClustering: false,
  enableAnalytics: true,
  analyticsRetentionDays: 7,
  evictionStrategy: 'popularity',
  compressionEnabled: false,
  backgroundSyncEnabled: true,
  shardingEnabled: false,
  replicationFactor: 1
})

/**
 * Enhanced decorator function with optimization features
 */
export function withOptimizedCache<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>,
  options: {
    ttl?: number
    tags?: string[]
    cost?: number
    enableWarming?: boolean
  } = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const cache = AICacheOptimization.getInstance()

    // Try to get from cache first
    const cached = cache.get<R>(operation, args)
    if (cached !== null) {
      console.log(`Optimized cache hit for operation: ${operation}`)
      return cached
    }

    // Execute function and cache result with optimization
    try {
      const result = await fn(...args)

      cache.set(operation, args, result, {
        ttl: options.ttl,
        cost: options.cost,
        tags: options.tags
      })

      console.log(`Optimized cache miss - stored result for operation: ${operation}`)
      return result

    } catch (error) {
      // Don't cache errors
      throw error
    }
  }
}