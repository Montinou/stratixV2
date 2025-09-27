import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AIPerformanceMonitor } from '../performance-monitor'

/**
 * Comprehensive test suite for AI Performance Monitor
 * Tests performance tracking, bottleneck detection, alerting, and analytics
 */

describe('AIPerformanceMonitor', () => {
  let monitor: AIPerformanceMonitor

  beforeEach(() => {
    // Create fresh monitor instance with test configuration
    monitor = AIPerformanceMonitor.getInstance({
      alertThresholds: {
        responseTime: 1000, // 1 second
        errorRate: 10, // 10%
        memoryUsage: 80, // 80%
        costPerHour: 5, // $5/hour
        cacheHitRatio: 50 // 50%
      },
      samplingInterval: 100, // 100ms for fast testing
      retentionPeriod: 5000, // 5 seconds
      maxAlerts: 10,
      enableBottleneckDetection: true,
      enablePredictiveAnalytics: true
    })
  })

  afterEach(() => {
    monitor.stop()
  })

  describe('Request Tracking', () => {
    it('should track request lifecycle correctly', () => {
      const requestId = 'test-request-1'
      const operation = 'test-operation'

      // Start request
      monitor.startRequest(requestId, operation)

      // Simulate processing time
      const mockDelay = 500
      vi.advanceTimersByTime(mockDelay)

      // End request
      const responseTime = monitor.endRequest(requestId, true, 0.05, false)

      expect(responseTime).toBeGreaterThanOrEqual(mockDelay)
    })

    it('should handle request tracking with different outcomes', () => {
      const successId = 'success-request'
      const failureId = 'failure-request'
      const cacheHitId = 'cache-hit-request'

      // Successful request
      monitor.startRequest(successId, 'success-op')
      monitor.endRequest(successId, true, 0.02, false)

      // Failed request
      monitor.startRequest(failureId, 'failure-op')
      monitor.endRequest(failureId, false, 0.01, false)

      // Cache hit request
      monitor.startRequest(cacheHitId, 'cache-op')
      monitor.endRequest(cacheHitId, true, 0, true)

      // All requests should be tracked
      const status = monitor.getStatus()
      expect(status.metrics).toBeDefined()
    })

    it('should handle missing request gracefully', () => {
      // Try to end a request that was never started
      const responseTime = monitor.endRequest('non-existent-request', true)
      expect(responseTime).toBe(0)
    })
  })

  describe('Metrics Collection', () => {
    it('should collect and calculate metrics correctly', async () => {
      // Generate some test metrics
      for (let i = 0; i < 5; i++) {
        const requestId = `metrics-test-${i}`
        monitor.startRequest(requestId, 'metrics-operation')

        // Simulate variable processing times
        await new Promise(resolve => setTimeout(resolve, 50 + i * 10))

        monitor.endRequest(requestId, true, 0.01 + i * 0.005, i % 2 === 0)
      }

      // Wait for metrics collection cycle
      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      expect(status.metrics).toBeDefined()
      expect(status.metrics!.throughput).toBeGreaterThanOrEqual(0)
    })

    it('should calculate accurate error rates', async () => {
      // Create requests with known success/failure pattern
      const requests = [
        { id: 'req1', success: true },
        { id: 'req2', success: false },
        { id: 'req3', success: false },
        { id: 'req4', success: true },
        { id: 'req5', success: true }
      ]

      for (const req of requests) {
        monitor.startRequest(req.id, 'error-test')
        monitor.endRequest(req.id, req.success, 0.01, false)
      }

      // Wait for metrics processing
      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      // 2 failures out of 5 requests = 40% error rate
      expect(status.metrics?.errorRate).toBeCloseTo(40, 1)
    })
  })

  describe('Bottleneck Detection', () => {
    it('should detect high response time bottlenecks', async () => {
      const alertCallback = vi.fn()
      monitor.onAlert(alertCallback)

      // Simulate high response time request
      const requestId = 'slow-request'
      monitor.startRequest(requestId, 'slow-operation')

      // Simulate delay longer than threshold (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1200))

      monitor.endRequest(requestId, true, 0.01, false)

      // Wait for bottleneck analysis
      await new Promise(resolve => setTimeout(resolve, 200))

      const status = monitor.getStatus()
      expect(status.recentBottlenecks.length).toBeGreaterThan(0)

      const highLatencyBottleneck = status.recentBottlenecks.find(
        b => b.type === 'high_latency'
      )
      expect(highLatencyBottleneck).toBeDefined()
      expect(highLatencyBottleneck?.severity).toMatch(/high|critical/)
    })

    it('should detect cache performance bottlenecks', async () => {
      // Mock low cache hit ratio
      vi.spyOn(monitor as any, 'getCacheStats').mockResolvedValue({
        hitRate: 0.3, // 30% hit rate (below 50% threshold)
        size: 100
      })

      // Trigger metrics collection which includes bottleneck analysis
      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      const cacheBottleneck = status.recentBottlenecks.find(
        b => b.type === 'cache_miss'
      )

      expect(cacheBottleneck).toBeDefined()
      expect(cacheBottleneck?.recommendations).toContain('Review cache TTL settings')
    })

    it('should provide actionable recommendations for bottlenecks', async () => {
      // Simulate memory pressure
      vi.spyOn(monitor as any, 'getMemoryUsage').mockReturnValue(90) // 90% memory usage

      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      const memoryBottleneck = status.recentBottlenecks.find(
        b => b.type === 'memory_pressure'
      )

      expect(memoryBottleneck).toBeDefined()
      expect(memoryBottleneck?.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/memory|cache|cleanup|scaling/)
        ])
      )
    })
  })

  describe('Alert System', () => {
    it('should create alerts for threshold violations', async () => {
      const alertCallback = vi.fn()
      monitor.onAlert(alertCallback)

      // Mock high error rate
      vi.spyOn(monitor as any, 'calculateAverageMetrics').mockReturnValue({
        responseTime: 500,
        cacheHitRatio: 80,
        costPerRequest: 0.01,
        errorRate: 15, // Above 10% threshold
        throughput: 10,
        memoryUsage: 50,
        activeConnections: 1,
        queueLength: 0,
        timestamp: new Date()
      })

      // Wait for alert check cycle
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(alertCallback).toHaveBeenCalled()

      const alert = alertCallback.mock.calls[0][0]
      expect(alert.type).toBe('error')
      expect(alert.severity).toMatch(/warning|critical/)
      expect(alert.message).toContain('error rate')
    })

    it('should acknowledge and resolve alerts', async () => {
      const alertCallback = vi.fn()
      monitor.onAlert(alertCallback)

      // Trigger an alert
      vi.spyOn(monitor as any, 'calculateAverageMetrics').mockReturnValue({
        responseTime: 2000, // Above 1000ms threshold
        cacheHitRatio: 80,
        costPerRequest: 0.01,
        errorRate: 5,
        throughput: 10,
        memoryUsage: 50,
        activeConnections: 1,
        queueLength: 0,
        timestamp: new Date()
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(alertCallback).toHaveBeenCalled()
      const alert = alertCallback.mock.calls[0][0]

      // Acknowledge alert
      const acknowledged = monitor.acknowledgeAlert(alert.id)
      expect(acknowledged).toBe(true)

      // Resolve alert
      const resolved = monitor.resolveAlert(alert.id)
      expect(resolved).toBe(true)

      const status = monitor.getStatus()
      const activeAlerts = status.activeAlerts.filter(a => !a.resolvedAt)
      expect(activeAlerts.length).toBe(0)
    })

    it('should limit maximum number of alerts', async () => {
      // Configure monitor with low alert limit
      const limitedMonitor = AIPerformanceMonitor.getInstance({
        maxAlerts: 3,
        alertThresholds: {
          responseTime: 1,
          errorRate: 1,
          memoryUsage: 1,
          costPerHour: 1,
          cacheHitRatio: 99
        }
      })

      // Mock conditions that trigger multiple alerts
      vi.spyOn(limitedMonitor as any, 'calculateAverageMetrics').mockReturnValue({
        responseTime: 2000,
        cacheHitRatio: 10,
        costPerRequest: 10,
        errorRate: 50,
        throughput: 100,
        memoryUsage: 95,
        activeConnections: 1,
        queueLength: 0,
        timestamp: new Date()
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const status = limitedMonitor.getStatus()
      expect(status.activeAlerts.length).toBeLessThanOrEqual(3)

      limitedMonitor.stop()
    })
  })

  describe('Performance Insights', () => {
    it('should generate performance trends', async () => {
      // Generate varied performance data over time
      const performanceData = [
        { responseTime: 800, errorRate: 2, cacheHitRatio: 70, costPerRequest: 0.01 },
        { responseTime: 900, errorRate: 3, cacheHitRatio: 75, costPerRequest: 0.02 },
        { responseTime: 700, errorRate: 1, cacheHitRatio: 80, costPerRequest: 0.015 },
        { responseTime: 600, errorRate: 1, cacheHitRatio: 85, costPerRequest: 0.01 }
      ]

      // Mock metrics progression
      let dataIndex = 0
      vi.spyOn(monitor as any, 'calculateAverageMetrics').mockImplementation(() => ({
        ...performanceData[Math.min(dataIndex++, performanceData.length - 1)],
        throughput: 10,
        memoryUsage: 50,
        activeConnections: 1,
        queueLength: 0,
        timestamp: new Date()
      }))

      // Wait for enough data points
      await new Promise(resolve => setTimeout(resolve, 500))

      const insights = monitor.generateInsights()

      expect(insights.trends.responseTime).toMatch(/improving|degrading|stable/)
      expect(insights.trends.errorRate).toMatch(/improving|degrading|stable/)
      expect(insights.trends.cacheEfficiency).toMatch(/improving|degrading|stable/)
      expect(insights.optimizations).toBeInstanceOf(Array)
      expect(insights.optimizations.length).toBeGreaterThan(0)
    })

    it('should provide cost predictions', async () => {
      // Mock current metrics with known values
      vi.spyOn(monitor as any, 'calculateAverageMetrics').mockReturnValue({
        responseTime: 500,
        cacheHitRatio: 75,
        costPerRequest: 0.02,
        errorRate: 2,
        throughput: 60, // 60 requests per minute
        memoryUsage: 60,
        activeConnections: 5,
        queueLength: 0,
        timestamp: new Date()
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const insights = monitor.generateInsights()

      // Expected: 60 req/min * 60 min = 3600 req/hour * $0.02 = $72/hour
      expect(insights.predictions.nextHourCost).toBeCloseTo(72, 1)
      expect(insights.predictions.nextHourRequests).toBeCloseTo(3600, 100)
    })

    it('should identify resource needs', async () => {
      // Mock high resource usage
      vi.spyOn(monitor as any, 'calculateAverageMetrics').mockReturnValue({
        responseTime: 1500, // High response time
        cacheHitRatio: 40, // Low cache hit ratio
        costPerRequest: 0.01,
        errorRate: 2,
        throughput: 10,
        memoryUsage: 85, // High memory usage
        activeConnections: 1,
        queueLength: 0,
        timestamp: new Date()
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const insights = monitor.generateInsights()

      expect(insights.predictions.resourceNeeds).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/memory|performance|cache/)
        ])
      )
    })
  })

  describe('Reporting and Data Export', () => {
    it('should generate comprehensive performance reports', async () => {
      // Generate some test data
      for (let i = 0; i < 3; i++) {
        monitor.startRequest(`report-test-${i}`, 'report-operation')
        await new Promise(resolve => setTimeout(resolve, 100))
        monitor.endRequest(`report-test-${i}`, true, 0.01, false)
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      const report = monitor.getReport(5000) // Last 5 seconds

      expect(report.summary).toBeDefined()
      expect(report.insights).toBeDefined()
      expect(report.bottlenecks).toBeInstanceOf(Array)
      expect(report.alerts).toBeInstanceOf(Array)
      expect(report.recommendations).toBeInstanceOf(Array)
    })

    it('should export performance data', () => {
      const exportData = monitor.exportData()

      expect(exportData.config).toBeDefined()
      expect(exportData.metrics).toBeInstanceOf(Array)
      expect(exportData.bottlenecks).toBeInstanceOf(Array)
      expect(exportData.alerts).toBeInstanceOf(Array)
      expect(exportData.currentRequests).toBeInstanceOf(Array)
      expect(exportData.timestamp).toBeDefined()
    })

    it('should filter reports by time range', async () => {
      const oldTimestamp = Date.now() - 10000 // 10 seconds ago

      // Mock some old data
      vi.spyOn(monitor as any, 'metrics', 'get').mockReturnValue([
        {
          responseTime: 500,
          timestamp: new Date(oldTimestamp)
        },
        {
          responseTime: 600,
          timestamp: new Date() // Recent
        }
      ])

      const shortReport = monitor.getReport(5000) // Last 5 seconds
      const longReport = monitor.getReport(15000) // Last 15 seconds

      // Short report should have less data than long report
      expect(shortReport.summary).toBeDefined()
      expect(longReport.summary).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle monitoring errors gracefully', async () => {
      // Mock an error in metrics collection
      vi.spyOn(monitor as any, 'getCacheStats').mockRejectedValue(new Error('Cache unavailable'))

      // Should not crash despite cache error
      await new Promise(resolve => setTimeout(resolve, 200))

      const status = monitor.getStatus()
      expect(status.overall).toMatch(/healthy|degraded|unhealthy/)
    })

    it('should clean up old data according to retention policy', async () => {
      // Create monitor with short retention
      const shortRetentionMonitor = AIPerformanceMonitor.getInstance({
        retentionPeriod: 100, // 100ms retention
        samplingInterval: 50
      })

      // Generate some data
      shortRetentionMonitor.startRequest('cleanup-test', 'cleanup-op')
      shortRetentionMonitor.endRequest('cleanup-test', true)

      // Wait for data to be created and then aged out
      await new Promise(resolve => setTimeout(resolve, 200))

      const exportData = shortRetentionMonitor.exportData()

      // Old data should be cleaned up
      expect(exportData.metrics.length).toBeLessThan(5)

      shortRetentionMonitor.stop()
    })

    it('should handle concurrent request tracking', async () => {
      const concurrentRequests = []

      // Start many concurrent requests
      for (let i = 0; i < 20; i++) {
        const requestId = `concurrent-${i}`
        monitor.startRequest(requestId, 'concurrent-op')

        concurrentRequests.push(
          new Promise(resolve => {
            setTimeout(() => {
              monitor.endRequest(requestId, true, 0.01, false)
              resolve(null)
            }, Math.random() * 100)
          })
        )
      }

      // Wait for all requests to complete
      await Promise.all(concurrentRequests)

      const status = monitor.getStatus()
      expect(status.metrics?.activeConnections).toBe(0) // All should be completed
    })
  })

  describe('Integration with Cache System', () => {
    it('should integrate cache statistics correctly', async () => {
      // Mock cache stats to simulate integration
      vi.spyOn(monitor as any, 'getCacheStats').mockResolvedValue({
        hitRate: 0.8,
        size: 1500
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      expect(status.metrics?.cacheHitRatio).toBeCloseTo(80, 1)
    })

    it('should detect cache-related bottlenecks', async () => {
      // Mock poor cache performance
      vi.spyOn(monitor as any, 'getCacheStats').mockResolvedValue({
        hitRate: 0.25, // 25% hit rate (below 50% threshold)
        size: 100
      })

      await new Promise(resolve => setTimeout(resolve, 150))

      const status = monitor.getStatus()
      const cacheBottleneck = status.recentBottlenecks.find(
        b => b.type === 'cache_miss'
      )

      expect(cacheBottleneck).toBeDefined()
      expect(cacheBottleneck?.severity).toMatch(/medium|critical/)
    })
  })
})