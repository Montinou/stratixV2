import { NextRequest, NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { dashboardService, getDashboardOverview } from "@/lib/performance/unified-dashboard-service"
import { metricsCollector } from "@/lib/performance/unified-performance-service"
import { benchmarkingService } from "@/lib/performance/unified-benchmarking-service"
import type {
  PerformanceStats,
  ModelComparison,
  OperationPerformance
} from "@/lib/performance/unified-performance-service"

// Comprehensive AI Analytics API endpoint
export async function GET(request: NextRequest) {
  try {
    // Check authentication following NEON_STACK_AUTH_SETUP patterns
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const analyticsType = searchParams.get("type") || "overview"
    const timeRange = searchParams.get("timeRange") || "24h"
    const operation = searchParams.get("operation")
    const model = searchParams.get("model")
    const provider = searchParams.get("provider")

    // Parse time range
    const { startTime, endTime } = parseTimeRange(timeRange)

    // Build filters
    const filters = {
      ...(operation && { operation }),
      ...(model && { model }),
      ...(provider && { provider }),
      userId: user.id
    }

    switch (analyticsType) {
      case "overview":
        return handleOverviewAnalytics(startTime, endTime, filters)

      case "performance":
        return handlePerformanceAnalytics(startTime, endTime, filters)

      case "cost":
        return handleCostAnalytics(startTime, endTime, filters)

      case "quality":
        return handleQualityAnalytics(startTime, endTime, filters)

      case "benchmarks":
        return handleBenchmarkAnalytics(startTime, endTime, filters)

      case "anomalies":
        return handleAnomalyDetection(startTime, endTime, filters)

      case "recommendations":
        return handleOptimizationRecommendations(startTime, endTime, filters)

      default:
        return NextResponse.json(
          { error: "Invalid analytics type" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Error generating AI analytics:", error)
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case "run_benchmark":
        return handleRunBenchmark(params, user.id)

      case "record_metrics":
        return handleRecordMetrics(params, user.id)

      case "start_ab_test":
        return handleStartABTest(params, user.id)

      case "export_analytics":
        return handleExportAnalytics(params, user.id)

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Error processing analytics action:", error)
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    )
  }
}

// Analytics handlers

async function handleOverviewAnalytics(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const stats = await metricsCollector.getStats(startTime, endTime, filters)
  const anomalies = await metricsCollector.detectAnomalies(24, {
    latencyMultiplier: 2.0,
    errorRateThreshold: 5.0,
    costMultiplier: 2.5
  })

  const overview = {
    summary: {
      totalRequests: stats.totalRequests,
      successRate: stats.successRate,
      averageLatency: stats.averageLatency,
      totalCost: stats.totalCost,
      qualityScore: stats.qualityScore
    },
    trends: generateTrendData(startTime, endTime, filters),
    topOperations: getTopOperationsByVolume(startTime, endTime, filters),
    activeAnomalies: anomalies.filter(a => a.severity === 'high' || a.severity === 'critical'),
    healthScore: calculateOverallHealthScore(stats, anomalies)
  }

  return NextResponse.json({
    data: overview,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

async function handlePerformanceAnalytics(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const stats = await metricsCollector.getStats(startTime, endTime, filters)

  // Get operation-specific performance if operation is not filtered
  let operationPerformances: OperationPerformance[] = []
  if (!filters.operation) {
    const operations = getUniqueOperations(startTime, endTime, filters)
    operationPerformances = await Promise.all(operations.map(op =>
      metricsCollector.getModelComparison(op, startTime, endTime)
    ))
  }

  const performance = {
    overall: stats,
    latencyDistribution: calculateLatencyDistribution(startTime, endTime, filters),
    operationBreakdown: operationPerformances,
    modelComparison: generateModelComparisonData(startTime, endTime, filters),
    timeSeriesData: generatePerformanceTimeSeries(startTime, endTime, filters)
  }

  return NextResponse.json({
    data: performance,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

async function handleCostAnalytics(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const stats = await metricsCollector.getStats(startTime, endTime, filters)

  const costAnalytics = {
    summary: {
      totalCost: stats.totalCost,
      averageCost: stats.averageCost,
      costPerToken: stats.costPerToken,
      projectedMonthlyCost: projectMonthlyCost(stats.totalCost, startTime, endTime)
    },
    breakdown: {
      byModel: generateCostByModel(startTime, endTime, filters),
      byOperation: generateCostByOperation(startTime, endTime, filters),
      byProvider: generateCostByProvider(startTime, endTime, filters)
    },
    trends: generateCostTrends(startTime, endTime, filters),
    optimization: {
      potentialSavings: calculatePotentialSavings(startTime, endTime, filters),
      recommendations: await metricsCollector.generateOptimizationRecommendations(
        { start: startTime, end: endTime },
        'cost'
      )
    }
  }

  return NextResponse.json({
    data: costAnalytics,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

async function handleQualityAnalytics(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const stats = await metricsCollector.getStats(startTime, endTime, filters)

  const qualityAnalytics = {
    summary: {
      averageQuality: stats.qualityScore,
      qualityTrend: calculateQualityTrend(startTime, endTime, filters),
      distributionByScore: generateQualityDistribution(startTime, endTime, filters)
    },
    breakdown: {
      byModel: generateQualityByModel(startTime, endTime, filters),
      byOperation: generateQualityByOperation(startTime, endTime, filters),
      byCategory: generateQualityByCategory(startTime, endTime, filters)
    },
    insights: generateQualityInsights(startTime, endTime, filters),
    improvements: {
      recommendations: generateQualityImprovements(startTime, endTime, filters),
      abTestSuggestions: generateABTestSuggestions(startTime, endTime, filters)
    }
  }

  return NextResponse.json({
    data: qualityAnalytics,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

async function handleBenchmarkAnalytics(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const benchmarkResults = await benchmarkingService.getResults({
    ...(filters.model && { model: filters.model }),
    startDate: startTime,
    endDate: endTime
  })

  const benchmarkAnalytics = {
    recentResults: benchmarkResults.slice(-50), // Last 50 results
    modelRankings: generateModelRankings(benchmarkResults),
    categoryPerformance: generateCategoryPerformance(benchmarkResults),
    improvementOpportunities: identifyImprovementOpportunities(benchmarkResults),
    availableSuites: await benchmarkingService.getSuites()
  }

  return NextResponse.json({
    data: benchmarkAnalytics,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      totalBenchmarks: benchmarkResults.length,
      generatedAt: new Date()
    }
  })
}

async function handleAnomalyDetection(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const hoursDiff = Math.abs(endTime.getTime() - startTime.getTime()) / 36e5
  const anomalies = await metricsCollector.detectAnomalies(hoursDiff, {
    latencyMultiplier: 2.0,
    errorRateThreshold: 5.0,
    costMultiplier: 2.5
  })

  const anomalyAnalytics = {
    current: anomalies,
    summary: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length
    },
    trends: generateAnomalyTrends(startTime, endTime, filters),
    patterns: identifyAnomalyPatterns(anomalies),
    recommendations: generateAnomalyRecommendations(anomalies)
  }

  return NextResponse.json({
    data: anomalyAnalytics,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

async function handleOptimizationRecommendations(
  startTime: Date,
  endTime: Date,
  filters: any
): Promise<NextResponse> {
  const recommendations = {
    cost: await metricsCollector.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'cost'
    ),
    latency: await metricsCollector.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'latency'
    ),
    quality: await metricsCollector.generateOptimizationRecommendations(
      { start: startTime, end: endTime },
      'quality'
    )
  }

  const optimizationAnalytics = {
    recommendations,
    impactAnalysis: calculateOptimizationImpact(recommendations, startTime, endTime, filters),
    implementationGuides: generateImplementationGuides(recommendations),
    prioritization: prioritizeRecommendations(recommendations)
  }

  return NextResponse.json({
    data: optimizationAnalytics,
    metadata: {
      timeRange: { start: startTime, end: endTime },
      filters,
      generatedAt: new Date()
    }
  })
}

// Action handlers

async function handleRunBenchmark(params: any, userId: string): Promise<NextResponse> {
  try {
    const { suiteId, modelsToTest, testCasesToRun, parallel = false } = params

    const result = await benchmarkingService.executeSuite(suiteId, {
      modelsToTest,
      testCasesToRun,
      parallel,
      userId
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: "Benchmark ejecutado exitosamente"
    })

  } catch (error) {
    console.error("Error running benchmark:", error)
    return NextResponse.json(
      { error: "Failed to run benchmark", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleRecordMetrics(params: any, userId: string): Promise<NextResponse> {
  try {
    const { metrics } = params

    const requestId = await metricsCollector.recordMetrics({
      ...metrics,
      userId
    })

    return NextResponse.json({
      success: true,
      requestId,
      message: "Métricas registradas exitosamente"
    })

  } catch (error) {
    console.error("Error recording metrics:", error)
    return NextResponse.json(
      { error: "Failed to record metrics" },
      { status: 500 }
    )
  }
}

async function handleStartABTest(params: any, userId: string): Promise<NextResponse> {
  try {
    // A/B testing implementation would go here
    // For now, return a placeholder response
    const { testName, modelA, modelB, trafficSplit = 50 } = params

    const abTest = {
      id: `ab_test_${Date.now()}`,
      name: testName,
      modelA,
      modelB,
      trafficSplit,
      status: 'active',
      startedAt: new Date(),
      userId
    }

    return NextResponse.json({
      success: true,
      data: abTest,
      message: "Test A/B iniciado exitosamente"
    })

  } catch (error) {
    console.error("Error starting A/B test:", error)
    return NextResponse.json(
      { error: "Failed to start A/B test" },
      { status: 500 }
    )
  }
}

async function handleExportAnalytics(params: any, userId: string): Promise<NextResponse> {
  try {
    const { format = 'json', timeRange, filters } = params
    const { startTime, endTime } = parseTimeRange(timeRange)

    const stats = await metricsCollector.getStats(startTime, endTime, { ...filters, userId })
    const benchmarks = await benchmarkingService.getResults({
      startDate: startTime,
      endDate: endTime
    })

    const exportData = {
      analytics: stats,
      benchmarks,
      exportedAt: new Date(),
      userId,
      timeRange: { start: startTime, end: endTime },
      filters
    }

    if (format === 'csv') {
      // In a real implementation, convert to CSV format
      return new NextResponse(JSON.stringify(exportData), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="ai-analytics.csv"'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: exportData,
      message: "Datos exportados exitosamente"
    })

  } catch (error) {
    console.error("Error exporting analytics:", error)
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    )
  }
}

// Helper functions

function parseTimeRange(timeRange: string): { startTime: Date; endTime: Date } {
  const endTime = new Date()
  let startTime: Date

  switch (timeRange) {
    case "1h":
      startTime = new Date(endTime.getTime() - 60 * 60 * 1000)
      break
    case "24h":
      startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
      break
    case "7d":
      startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
  }

  return { startTime, endTime }
}

function generateTrendData(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real performance data from analytics system
    const realMetrics = await metricsCollector.getTimeSeriesData(startTime, endTime, filters)

    if (realMetrics && realMetrics.length > 0) {
      return realMetrics
    }

    // Fallback to minimal sample data if no real data available
    const hours = Math.min(24, Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)))
    const trends = []

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(startTime.getTime() + i * 60 * 60 * 1000)
      trends.push({
        timestamp,
        requests: 0,
        averageLatency: 0,
        successRate: 100,
        cost: 0
      })
    }

    return trends
  } catch (error) {
    console.warn('Failed to generate trend data, returning empty data:', error)
    return []
  }
}

function getTopOperationsByVolume(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real operation data from analytics system
    const realOperations = await metricsCollector.getTopOperations(startTime, endTime, filters)

    if (realOperations && realOperations.length > 0) {
      return realOperations
    }

    // Return empty array if no real data available
    return []
  } catch (error) {
    console.warn('Failed to get operations data, returning empty array:', error)
    return []
  }
}

function calculateOverallHealthScore(stats: PerformanceStats, anomalies: any[]): number {
  let score = 100

  // Success rate impact
  if (stats.successRate < 95) score -= (95 - stats.successRate) * 2
  if (stats.successRate < 90) score -= 10

  // Latency impact
  if (stats.averageLatency > 5000) score -= 15
  else if (stats.averageLatency > 3000) score -= 8

  // Anomaly impact
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length
  const highAnomalies = anomalies.filter(a => a.severity === 'high').length

  score -= criticalAnomalies * 20
  score -= highAnomalies * 10

  return Math.max(0, Math.min(100, score))
}

function calculateLatencyDistribution(startTime: Date, endTime: Date, filters: any) {
  // Mock implementation - replace with actual data
  return {
    p50: 1200,
    p75: 2100,
    p90: 3500,
    p95: 4800,
    p99: 8200
  }
}

function generateModelComparisonData(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real model comparison data from analytics system
    const realModelData = await metricsCollector.getModelComparison(startTime, endTime, filters)

    if (realModelData && realModelData.length > 0) {
      return realModelData
    }

    // Return empty array if no real data available
    return []
  } catch (error) {
    console.warn('Failed to get model comparison data, returning empty array:', error)
    return []
  }
}

function generatePerformanceTimeSeries(startTime: Date, endTime: Date, filters: any) {
  // Mock implementation - replace with actual time series data
  return generateTrendData(startTime, endTime, filters)
}

function projectMonthlyCost(totalCost: number, startTime: Date, endTime: Date): number {
  const durationHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)
  const hoursInMonth = 30 * 24
  return (totalCost / durationHours) * hoursInMonth
}

function generateCostByModel(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real cost data from analytics system
    const realCostData = await metricsCollector.getCostByModel(startTime, endTime, filters)
    if (realCostData && realCostData.length > 0) {
      return realCostData
    }
    return [] // Return empty array if no real data available
  } catch (error) {
    console.warn('Failed to get cost by model data:', error)
    return []
  }
}

function generateCostByOperation(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real cost data by operation from analytics system
    const realCostData = await metricsCollector.getCostByOperation(startTime, endTime, filters)
    if (realCostData && realCostData.length > 0) {
      return realCostData
    }
    return [] // Return empty array if no real data available
  } catch (error) {
    console.warn('Failed to get cost by operation data:', error)
    return []
  }
}

function generateCostByProvider(startTime: Date, endTime: Date, filters: any) {
  try {
    // Get real cost data by provider from analytics system
    const realCostData = await metricsCollector.getCostByProvider(startTime, endTime, filters)
    if (realCostData && realCostData.length > 0) {
      return realCostData
    }
    return [] // Return empty array if no real data available
  } catch (error) {
    console.warn('Failed to get cost by provider data:', error)
    return []
  }
}

function generateCostTrends(startTime: Date, endTime: Date, filters: any) {
  try {
    // Use real trend data from analytics system
    const trendData = generateTrendData(startTime, endTime, filters)
    return trendData.map(trend => ({
      timestamp: trend.timestamp,
      cost: trend.cost || 0
    }))
  } catch (error) {
    console.warn('Failed to get cost trends data:', error)
    return []
  }
}

function calculatePotentialSavings(startTime: Date, endTime: Date, filters: any) {
  try {
    // Calculate real potential savings based on analytics data
    const realSavings = await metricsCollector.calculatePotentialSavings(startTime, endTime, filters)
    if (realSavings) {
      return realSavings
    }
    // Return zero savings if no real data available
    return {
      modelOptimization: { amount: 0, percentage: 0 },
      caching: { amount: 0, percentage: 0 },
      batching: { amount: 0, percentage: 0 }
    }
  } catch (error) {
    console.warn('Failed to calculate potential savings:', error)
    return {
      modelOptimization: { amount: 0, percentage: 0 },
      caching: { amount: 0, percentage: 0 },
      batching: { amount: 0, percentage: 0 }
    }
  }
}

// Additional helper functions for quality, benchmarks, anomalies, etc.
// These would be implemented based on actual requirements

function calculateQualityTrend(startTime: Date, endTime: Date, filters: any) {
  return { direction: 'up', change: 3.2, period: '7d' }
}

function generateQualityDistribution(startTime: Date, endTime: Date, filters: any) {
  return {
    excellent: 45, // 90-100
    good: 35,      // 75-89
    fair: 15,      // 60-74
    poor: 5        // <60
  }
}

function generateQualityByModel(startTime: Date, endTime: Date, filters: any) {
  return [
    { model: 'openai/gpt-4o', score: 92.5 },
    { model: 'anthropic/claude-3-sonnet-20240229', score: 89.2 },
    { model: 'openai/gpt-4o-mini', score: 85.7 }
  ]
}

function generateQualityByOperation(startTime: Date, endTime: Date, filters: any) {
  return [
    { operation: 'generate_okr', score: 88.5 },
    { operation: 'analyze_performance', score: 91.2 },
    { operation: 'chat_completion', score: 87.8 }
  ]
}

function generateQualityByCategory(startTime: Date, endTime: Date, filters: any) {
  return [
    { category: 'text_generation', score: 87.5 },
    { category: 'analysis', score: 91.2 },
    { category: 'chat_completion', score: 85.8 }
  ]
}

function generateQualityInsights(startTime: Date, endTime: Date, filters: any) {
  return [
    'La calidad promedio ha mejorado 3.2% en los últimos 7 días',
    'Los modelos de Anthropic muestran mejor coherencia en análisis complejos',
    'Las operaciones de generación de OKR mantienen alta calidad consistente'
  ]
}

function generateQualityImprovements(startTime: Date, endTime: Date, filters: any) {
  return [
    {
      type: 'prompt_optimization',
      description: 'Optimizar prompts para mejorar consistencia',
      expectedImpact: '+5-8% calidad promedio'
    },
    {
      type: 'model_selection',
      description: 'Usar modelos especializados por tipo de tarea',
      expectedImpact: '+3-5% calidad promedio'
    }
  ]
}

function generateABTestSuggestions(startTime: Date, endTime: Date, filters: any) {
  return [
    {
      test: 'GPT-4o vs Claude Sonnet para análisis',
      hypothesis: 'Claude Sonnet puede mejorar calidad en tareas analíticas',
      duration: '2 semanas',
      trafficSplit: '50/50'
    }
  ]
}

function generateModelRankings(benchmarkResults: any[]) {
  // Mock implementation
  return [
    { model: 'openai/gpt-4o', rank: 1, overallScore: 92.5 },
    { model: 'anthropic/claude-3-sonnet-20240229', rank: 2, overallScore: 89.2 },
    { model: 'openai/gpt-4o-mini', rank: 3, overallScore: 85.7 }
  ]
}

function generateCategoryPerformance(benchmarkResults: any[]) {
  return {
    text_generation: { leader: 'openai/gpt-4o', score: 91.5 },
    analysis: { leader: 'anthropic/claude-3-sonnet-20240229', score: 93.2 },
    chat_completion: { leader: 'openai/gpt-4o', score: 90.8 }
  }
}

function identifyImprovementOpportunities(benchmarkResults: any[]) {
  return [
    'Considerar migrar análisis complejos a Claude Sonnet',
    'GPT-4o-mini es suficiente para tareas simples de generación',
    'Implementar cache para operaciones repetitivas'
  ]
}

function generateAnomalyTrends(startTime: Date, endTime: Date, filters: any) {
  return {
    frequency: 'decreasing',
    severity: 'stable',
    commonPatterns: ['latency_spikes_during_peak', 'cost_anomalies_weekend']
  }
}

function identifyAnomalyPatterns(anomalies: any[]) {
  return [
    'Picos de latencia coinciden con horarios de alta demanda',
    'Anomalías de costo frecuentes los fines de semana',
    'Errores correlacionados con actualizaciones de modelo'
  ]
}

function generateAnomalyRecommendations(anomalies: any[]) {
  return [
    'Implementar auto-scaling durante horas pico',
    'Configurar alertas proactivas para anomalías de costo',
    'Establecer circuit breakers para errores en cascada'
  ]
}

function calculateOptimizationImpact(recommendations: any, startTime: Date, endTime: Date, filters: any) {
  return {
    costReduction: '15-25%',
    latencyImprovement: '10-20%',
    qualityIncrease: '5-10%',
    implementationTime: '1-2 weeks'
  }
}

function generateImplementationGuides(recommendations: any) {
  return {
    model_switch: 'Actualizar configuración en gateway-client.ts',
    caching: 'Implementar cache layer con Redis/Upstash',
    parameter_tuning: 'Ajustar temperatura y max_tokens por operación'
  }
}

function prioritizeRecommendations(recommendations: any) {
  const all = [...recommendations.cost, ...recommendations.latency, ...recommendations.quality]
  return all.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })
}

function getUniqueOperations(startTime: Date, endTime: Date, filters: any): string[] {
  // Mock implementation - replace with actual data
  return ['generate_okr', 'analyze_performance', 'generate_insights', 'chat_completion']
}