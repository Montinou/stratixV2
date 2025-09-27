/**
 * Unified Benchmarking Service
 *
 * Consolidates benchmarking functionality from multiple files into a single,
 * comprehensive benchmarking system.
 *
 * Replaces:
 * - lib/ai/benchmarking.ts
 * - Benchmarking aspects of lib/ai/ab-testing.ts
 * - Quality benchmarking from lib/ai/quality-metrics.ts
 */

import { metricsCollector, CostCalculator, instrumentAIOperation } from './unified-performance-service'
import type {
  BenchmarkConfig,
  BenchmarkTestCase,
  BenchmarkResult,
  QualityEvaluationCriteria,
  PerformanceMetrics
} from './unified-performance-service'

// ============================================================================
// BENCHMARKING INTERFACES
// ============================================================================

export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  version: string
  testCases: BenchmarkTestCase[]
  modelsToTest: string[]
  targetMetrics: BenchmarkTargetMetric[]
  executionConfig: BenchmarkExecutionConfig
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, any>
}

export interface BenchmarkTargetMetric {
  name: string
  type: 'latency' | 'cost' | 'quality' | 'throughput' | 'reliability'
  target: number
  threshold: 'minimum' | 'maximum' | 'optimal'
  weight: number // For composite scoring
}

export interface BenchmarkExecutionConfig {
  parallel: boolean
  timeout: number
  retries: number
  cooldownBetweenTests: number
  randomizeOrder: boolean
  minSampleSize: number
  maxSampleSize: number
}

export interface BenchmarkExecution {
  id: string
  suiteId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  progress: {
    completed: number
    total: number
    currentTest?: string
    currentModel?: string
  }
  results: BenchmarkResult[]
  summary?: BenchmarkSummary
  error?: string
}

export interface BenchmarkSummary {
  totalTests: number
  passedTests: number
  failedTests: number
  averageScore: number
  topPerformer: string
  worstPerformer: string
  modelRankings: ModelRanking[]
  insights: BenchmarkInsight[]
  recommendations: string[]
  executionTime: number
}

export interface ModelRanking {
  model: string
  provider: string
  score: number
  rank: number
  metrics: {
    averageLatency: number
    averageCost: number
    averageQuality: number
    successRate: number
    efficiency: number
  }
  strengths: string[]
  weaknesses: string[]
  bestUseCase: string
  confidence: number
}

export interface BenchmarkInsight {
  type: 'performance' | 'cost' | 'quality' | 'reliability' | 'efficiency'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  confidence: number
  models: string[]
  data: Record<string, any>
}

// ============================================================================
// DEFAULT BENCHMARK SUITES
// ============================================================================

export const DEFAULT_OKR_BENCHMARK_SUITE: BenchmarkSuite = {
  id: 'okr_comprehensive_v1',
  name: 'OKR Management Comprehensive Benchmark',
  description: 'Comprehensive benchmark suite for OKR management AI operations',
  version: '1.0.0',
  testCases: [
    {
      id: 'okr_generation_basic',
      name: 'Generación Básica de OKR',
      category: 'text_generation',
      prompt: 'Genera un OKR completo para una empresa de tecnología que quiere mejorar su productividad en el Q4. Incluye 1 objetivo y 3 resultados clave medibles.',
      expectedLatency: 5000,
      qualityCriteria: {
        weights: {
          relevance: 0.25,
          coherence: 0.20,
          completeness: 0.25,
          accuracy: 0.15,
          creativity: 0.10,
          safety: 0.05
        },
        thresholds: {
          minimum: 60,
          good: 75,
          excellent: 90
        },
        specificCriteria: {
          minLength: 200,
          maxLength: 800,
          requiredElements: ['objetivo', 'resultado clave', 'medible'],
          domainKnowledge: ['OKR', 'productividad', 'Q4', 'tecnología']
        }
      },
      metadata: { category: 'okr_creation', difficulty: 'medium' }
    },
    {
      id: 'performance_analysis',
      name: 'Análisis de Rendimiento Empresarial',
      category: 'analysis',
      prompt: 'Analiza estos datos de rendimiento: Ventas Q3: 500K, Q2: 450K, Q1: 400K. Empleados: 50. Satisfacción cliente: 85%. Proporciona 3 insights clave y 2 recomendaciones.',
      expectedLatency: 4000,
      qualityCriteria: {
        weights: {
          relevance: 0.20,
          coherence: 0.15,
          completeness: 0.20,
          accuracy: 0.30,
          creativity: 0.10,
          safety: 0.05
        },
        thresholds: {
          minimum: 65,
          good: 80,
          excellent: 92
        },
        specificCriteria: {
          minLength: 300,
          maxLength: 1000,
          requiredElements: ['insight', 'recomendación', 'datos'],
          domainKnowledge: ['análisis', 'rendimiento', 'métricas', 'ventas']
        }
      },
      metadata: { category: 'analytics', difficulty: 'high' }
    },
    {
      id: 'strategic_planning',
      name: 'Planificación Estratégica',
      category: 'text_generation',
      prompt: 'Crea un plan estratégico trimestral para un equipo de desarrollo que necesita mejorar la velocidad de entrega del 60% al 85% mientras mantiene la calidad.',
      expectedLatency: 6000,
      qualityCriteria: {
        weights: {
          relevance: 0.25,
          coherence: 0.20,
          completeness: 0.25,
          accuracy: 0.15,
          creativity: 0.12,
          safety: 0.03
        },
        thresholds: {
          minimum: 70,
          good: 82,
          excellent: 95
        },
        specificCriteria: {
          minLength: 400,
          maxLength: 1200,
          requiredElements: ['plan', 'estrategia', 'velocidad', 'calidad'],
          domainKnowledge: ['desarrollo', 'entrega', 'estrategia', 'trimestral']
        }
      },
      metadata: { category: 'planning', difficulty: 'high' }
    },
    {
      id: 'quick_insight',
      name: 'Insight Rápido',
      category: 'chat_completion',
      prompt: '¿Cuál es la métrica más importante para medir el éxito de un OKR?',
      expectedLatency: 2000,
      qualityCriteria: {
        weights: {
          relevance: 0.30,
          coherence: 0.25,
          completeness: 0.20,
          accuracy: 0.15,
          creativity: 0.05,
          safety: 0.05
        },
        thresholds: {
          minimum: 60,
          good: 75,
          excellent: 88
        },
        specificCriteria: {
          minLength: 50,
          maxLength: 300,
          requiredElements: ['métrica', 'OKR'],
          domainKnowledge: ['medición', 'éxito', 'objetivo']
        }
      },
      metadata: { category: 'consultation', difficulty: 'easy' }
    },
    {
      id: 'complex_reasoning',
      name: 'Razonamiento Complejo Multi-paso',
      category: 'analysis',
      prompt: 'Una empresa tiene 3 departamentos: Ventas (10 empleados, 120% productividad), Marketing (8 empleados, 95% productividad), Desarrollo (15 empleados, 110% productividad). Con presupuesto para 5 empleados más, ¿cómo optimizar la distribución para maximizar el output total? Muestra tu razonamiento paso a paso.',
      expectedLatency: 8000,
      qualityCriteria: {
        weights: {
          relevance: 0.22,
          coherence: 0.20,
          completeness: 0.25,
          accuracy: 0.25,
          creativity: 0.06,
          safety: 0.02
        },
        thresholds: {
          minimum: 70,
          good: 85,
          excellent: 95
        },
        specificCriteria: {
          minLength: 300,
          maxLength: 1000,
          requiredElements: ['razonamiento', 'paso', 'optimización', 'distribución'],
          domainKnowledge: ['productividad', 'departamento', 'empleados', 'output']
        }
      },
      metadata: { category: 'complex_analysis', difficulty: 'very_high' }
    }
  ],
  modelsToTest: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-sonnet-20240229',
    'anthropic/claude-3-haiku-20240307'
  ],
  targetMetrics: [
    { name: 'quality', type: 'quality', target: 80, threshold: 'minimum', weight: 0.4 },
    { name: 'latency', type: 'latency', target: 5000, threshold: 'maximum', weight: 0.3 },
    { name: 'cost', type: 'cost', target: 0.02, threshold: 'maximum', weight: 0.2 },
    { name: 'reliability', type: 'reliability', target: 95, threshold: 'minimum', weight: 0.1 }
  ],
  executionConfig: {
    parallel: false,
    timeout: 30000,
    retries: 2,
    cooldownBetweenTests: 1000,
    randomizeOrder: true,
    minSampleSize: 10,
    maxSampleSize: 50
  },
  createdAt: new Date(),
  updatedAt: new Date()
}

// ============================================================================
// UNIFIED BENCHMARKING SERVICE
// ============================================================================

export class UnifiedBenchmarkingService {
  private suites: BenchmarkSuite[] = []
  private executions: BenchmarkExecution[] = []
  private results: BenchmarkResult[] = []

  constructor() {
    // Initialize with default suites
    this.suites.push(DEFAULT_OKR_BENCHMARK_SUITE)
  }

  /**
   * Create a new benchmark suite
   */
  public createSuite(
    suiteData: Omit<BenchmarkSuite, 'id' | 'createdAt' | 'updatedAt'>
  ): string {
    const id = this.generateSuiteId()
    const suite: BenchmarkSuite = {
      ...suiteData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.suites.push(suite)
    return id
  }

  /**
   * Execute a benchmark suite
   */
  public async executeSuite(
    suiteId: string,
    options?: {
      modelsToTest?: string[]
      testCasesToRun?: string[]
      userId?: string
      sessionId?: string
    }
  ): Promise<string> {
    const suite = this.suites.find(s => s.id === suiteId)
    if (!suite) {
      throw new Error(`Benchmark suite not found: ${suiteId}`)
    }

    const executionId = this.generateExecutionId()
    const modelsToTest = options?.modelsToTest || suite.modelsToTest
    const testCasesToRun = suite.testCases.filter(tc =>
      !options?.testCasesToRun || options.testCasesToRun.includes(tc.id)
    )

    const execution: BenchmarkExecution = {
      id: executionId,
      suiteId,
      status: 'pending',
      startedAt: new Date(),
      progress: {
        completed: 0,
        total: modelsToTest.length * testCasesToRun.length
      },
      results: []
    }

    this.executions.push(execution)

    // Start execution asynchronously
    this.runBenchmarkExecution(execution, suite, modelsToTest, testCasesToRun, options)
      .catch(error => {
        execution.status = 'failed'
        execution.error = error.message
        execution.completedAt = new Date()
      })

    return executionId
  }

  /**
   * Get benchmark execution status and results
   */
  public getExecution(executionId: string): BenchmarkExecution | null {
    return this.executions.find(e => e.id === executionId) || null
  }

  /**
   * Get all benchmark suites
   */
  public getSuites(): BenchmarkSuite[] {
    return [...this.suites]
  }

  /**
   * Get benchmark results with filtering
   */
  public getResults(filters?: {
    suiteId?: string
    model?: string
    testCaseId?: string
    startDate?: Date
    endDate?: Date
  }): BenchmarkResult[] {
    let filtered = [...this.results]

    if (filters?.suiteId) {
      filtered = filtered.filter(r => r.benchmarkId === filters.suiteId)
    }
    if (filters?.model) {
      filtered = filtered.filter(r => r.model === filters.model)
    }
    if (filters?.testCaseId) {
      filtered = filtered.filter(r => r.testCaseId === filters.testCaseId)
    }
    if (filters?.startDate) {
      filtered = filtered.filter(r => r.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      filtered = filtered.filter(r => r.timestamp <= filters.endDate!)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Compare models across benchmarks
   */
  public compareModels(
    suiteId: string,
    executionId?: string
  ): ModelRanking[] {
    const results = executionId
      ? this.executions.find(e => e.id === executionId)?.results || []
      : this.results.filter(r => r.benchmarkId === suiteId)

    if (results.length === 0) {
      return []
    }

    const modelGroups = this.groupResultsByModel(results)
    const rankings: ModelRanking[] = []

    modelGroups.forEach((modelResults, model) => {
      const metrics = this.calculateModelMetrics(modelResults)
      const score = this.calculateModelScore(modelResults)

      rankings.push({
        model,
        provider: model.split('/')[0],
        score,
        rank: 0, // Will be assigned after sorting
        metrics,
        strengths: this.identifyModelStrengths(modelResults),
        weaknesses: this.identifyModelWeaknesses(modelResults),
        bestUseCase: this.determineBestUseCase(modelResults),
        confidence: this.calculateConfidence(modelResults.length)
      })
    })

    // Sort and assign ranks
    rankings.sort((a, b) => b.score - a.score)
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1
    })

    return rankings
  }

  /**
   * Generate insights from benchmark results
   */
  public generateInsights(
    suiteId: string,
    executionId?: string
  ): BenchmarkInsight[] {
    const results = executionId
      ? this.executions.find(e => e.id === executionId)?.results || []
      : this.results.filter(r => r.benchmarkId === suiteId)

    const insights: BenchmarkInsight[] = []

    // Cost efficiency insights
    const costInsight = this.analyzeCostEfficiency(results)
    if (costInsight) insights.push(costInsight)

    // Performance insights
    const performanceInsight = this.analyzePerformance(results)
    if (performanceInsight) insights.push(performanceInsight)

    // Quality insights
    const qualityInsight = this.analyzeQuality(results)
    if (qualityInsight) insights.push(qualityInsight)

    // Reliability insights
    const reliabilityInsight = this.analyzeReliability(results)
    if (reliabilityInsight) insights.push(reliabilityInsight)

    return insights
  }

  // ========================================================================
  // PRIVATE IMPLEMENTATION METHODS
  // ========================================================================

  private async runBenchmarkExecution(
    execution: BenchmarkExecution,
    suite: BenchmarkSuite,
    modelsToTest: string[],
    testCasesToRun: BenchmarkTestCase[],
    options?: {
      userId?: string
      sessionId?: string
    }
  ): Promise<void> {
    execution.status = 'running'
    const startTime = Date.now()

    try {
      const results: BenchmarkResult[] = []

      for (const model of modelsToTest) {
        for (const testCase of testCasesToRun) {
          execution.progress.currentModel = model
          execution.progress.currentTest = testCase.name

          try {
            const result = await this.runSingleTest(
              suite.id,
              testCase,
              model,
              options
            )
            results.push(result)
            execution.results.push(result)

            execution.progress.completed++

            // Respect cooldown between tests
            if (suite.executionConfig.cooldownBetweenTests > 0) {
              await this.sleep(suite.executionConfig.cooldownBetweenTests)
            }

          } catch (error) {
            console.error(`Test failed: ${testCase.id} on ${model}`, error)

            // Create failed result
            const failedResult: BenchmarkResult = {
              benchmarkId: suite.id,
              testCaseId: testCase.id,
              model,
              metrics: {} as PerformanceMetrics, // Empty metrics for failed test
              rank: 999,
              passed: false,
              issues: [error instanceof Error ? error.message : 'Unknown error'],
              timestamp: new Date()
            }

            results.push(failedResult)
            execution.results.push(failedResult)
            execution.progress.completed++
          }
        }
      }

      // Generate summary
      execution.summary = this.generateBenchmarkSummary(results, modelsToTest)
      execution.status = 'completed'
      execution.completedAt = new Date()

      // Store results
      this.results.push(...results)

    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      execution.completedAt = new Date()
      throw error
    }
  }

  private async runSingleTest(
    suiteId: string,
    testCase: BenchmarkTestCase,
    model: string,
    options?: {
      userId?: string
      sessionId?: string
    }
  ): Promise<BenchmarkResult> {
    const provider = model.split('/')[0]

    // Use the unified instrumentation
    const result = await instrumentAIOperation(
      `benchmark_${testCase.id}`,
      model,
      provider,
      async () => {
        // Simulate AI operation - in real implementation, this would call the actual AI service
        return this.simulateAICall(testCase.prompt, model)
      },
      {
        userId: options?.userId,
        sessionId: options?.sessionId,
        metadata: {
          benchmarkId: suiteId,
          testCaseId: testCase.id,
          category: testCase.category
        }
      }
    )

    // Calculate quality score
    const qualityScore = await this.evaluateQuality(
      testCase.prompt,
      result.toString(),
      testCase.qualityCriteria
    )

    // Update metrics with quality score
    result.metrics.qualityScore = qualityScore

    // Determine if test passed
    const passed = this.evaluateTestPassing(result.metrics, testCase)
    const issues = this.identifyIssues(result.metrics, testCase)

    return {
      benchmarkId: suiteId,
      testCaseId: testCase.id,
      model,
      metrics: result.metrics,
      rank: 0, // Will be calculated later
      passed,
      issues,
      timestamp: new Date()
    }
  }

  private async simulateAICall(prompt: string, model: string): Promise<string> {
    // Simulate AI response - in real implementation, this would call the actual AI gateway
    const delay = Math.random() * 3000 + 1000 // 1-4 seconds
    await this.sleep(delay)

    return `AI response for prompt: "${prompt.substring(0, 50)}..." using model ${model}`
  }

  private async evaluateQuality(
    prompt: string,
    response: string,
    criteria: QualityEvaluationCriteria
  ): Promise<number> {
    // Simplified quality evaluation - in real implementation, would use more sophisticated methods
    let score = 70 // Base score

    // Length check
    if (criteria.specificCriteria?.minLength && response.length < criteria.specificCriteria.minLength) {
      score -= 15
    }

    // Required elements check
    if (criteria.specificCriteria?.requiredElements) {
      const foundElements = criteria.specificCriteria.requiredElements.filter(element =>
        response.toLowerCase().includes(element.toLowerCase())
      ).length
      const elementRatio = foundElements / criteria.specificCriteria.requiredElements.length
      score += elementRatio * 20
    }

    // Domain knowledge check
    if (criteria.specificCriteria?.domainKnowledge) {
      const foundKnowledge = criteria.specificCriteria.domainKnowledge.filter(term =>
        response.toLowerCase().includes(term.toLowerCase())
      ).length
      score += Math.min(foundKnowledge * 2, 10)
    }

    return Math.max(0, Math.min(100, score))
  }

  private evaluateTestPassing(
    metrics: PerformanceMetrics,
    testCase: BenchmarkTestCase
  ): boolean {
    if (!metrics.success) return false
    if (metrics.duration > testCase.expectedLatency * 1.5) return false
    if (metrics.qualityScore && metrics.qualityScore < testCase.qualityCriteria.thresholds.minimum) return false
    return true
  }

  private identifyIssues(
    metrics: PerformanceMetrics,
    testCase: BenchmarkTestCase
  ): string[] {
    const issues: string[] = []

    if (!metrics.success) {
      issues.push(`Request failed: ${metrics.error || 'Unknown error'}`)
    }

    if (metrics.duration > testCase.expectedLatency) {
      issues.push(`High latency: ${metrics.duration}ms > ${testCase.expectedLatency}ms expected`)
    }

    if (metrics.qualityScore && metrics.qualityScore < testCase.qualityCriteria.thresholds.good) {
      issues.push(`Low quality score: ${metrics.qualityScore.toFixed(1)}`)
    }

    if (metrics.cost > 0.05) { // $0.05 threshold
      issues.push(`High cost: $${metrics.cost.toFixed(4)} per request`)
    }

    return issues
  }

  private generateBenchmarkSummary(
    results: BenchmarkResult[],
    modelsToTest: string[]
  ): BenchmarkSummary {
    const passedTests = results.filter(r => r.passed).length
    const failedTests = results.length - passedTests

    // Calculate average score across all results
    const validScores = results
      .filter(r => r.metrics.qualityScore !== undefined)
      .map(r => r.metrics.qualityScore!)
    const averageScore = validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : 0

    // Find top and worst performers
    const modelScores = modelsToTest.map(model => {
      const modelResults = results.filter(r => r.model === model)
      const modelScore = this.calculateModelScore(modelResults)
      return { model, score: modelScore }
    }).sort((a, b) => b.score - a.score)

    const topPerformer = modelScores[0]?.model || ''
    const worstPerformer = modelScores[modelScores.length - 1]?.model || ''

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      averageScore,
      topPerformer,
      worstPerformer,
      modelRankings: this.compareModels('', ''), // Will be populated by calling method
      insights: this.generateInsights('', ''), // Will be populated by calling method
      recommendations: this.generateRecommendations(results),
      executionTime: results.length > 0
        ? Math.max(...results.map(r => r.timestamp.getTime())) - Math.min(...results.map(r => r.timestamp.getTime()))
        : 0
    }
  }

  private generateRecommendations(results: BenchmarkResult[]): string[] {
    const recommendations: string[] = []

    const failureRate = (results.filter(r => !r.passed).length / results.length) * 100
    if (failureRate > 20) {
      recommendations.push(`High failure rate (${failureRate.toFixed(1)}%) - review test configuration`)
    }

    const highCostResults = results.filter(r => r.metrics.cost > 0.02)
    if (highCostResults.length > results.length * 0.3) {
      recommendations.push('Consider more cost-effective models for high-volume usage')
    }

    const slowResults = results.filter(r => r.metrics.duration > 8000)
    if (slowResults.length > results.length * 0.3) {
      recommendations.push('Optimize for better latency in time-sensitive applications')
    }

    return recommendations
  }

  // Helper methods for calculations

  private groupResultsByModel(results: BenchmarkResult[]): Map<string, BenchmarkResult[]> {
    const groups = new Map<string, BenchmarkResult[]>()

    results.forEach(result => {
      if (!groups.has(result.model)) {
        groups.set(result.model, [])
      }
      groups.get(result.model)!.push(result)
    })

    return groups
  }

  private calculateModelMetrics(results: BenchmarkResult[]): ModelRanking['metrics'] {
    const successful = results.filter(r => r.metrics.success)

    return {
      averageLatency: this.calculateMean(successful.map(r => r.metrics.duration)),
      averageCost: this.calculateMean(results.map(r => r.metrics.cost)),
      averageQuality: this.calculateMean(
        results.filter(r => r.metrics.qualityScore).map(r => r.metrics.qualityScore!)
      ),
      successRate: (successful.length / results.length) * 100,
      efficiency: this.calculateMean(results.map(r => r.metrics.efficiency))
    }
  }

  private calculateModelScore(results: BenchmarkResult[]): number {
    const metrics = this.calculateModelMetrics(results)

    // Weighted scoring
    const weights = { quality: 0.4, latency: 0.25, cost: 0.25, reliability: 0.1 }

    const qualityScore = Math.min(metrics.averageQuality / 100, 1)
    const latencyScore = Math.max(0, 1 - (metrics.averageLatency / 10000))
    const costScore = Math.max(0, 1 - (metrics.averageCost / 0.1))
    const reliabilityScore = metrics.successRate / 100

    return (
      qualityScore * weights.quality +
      latencyScore * weights.latency +
      costScore * weights.cost +
      reliabilityScore * weights.reliability
    ) * 100
  }

  private identifyModelStrengths(results: BenchmarkResult[]): string[] {
    const metrics = this.calculateModelMetrics(results)
    const strengths: string[] = []

    if (metrics.averageQuality > 85) strengths.push('High quality responses')
    if (metrics.averageLatency < 3000) strengths.push('Fast response times')
    if (metrics.averageCost < 0.01) strengths.push('Cost effective')
    if (metrics.successRate > 98) strengths.push('High reliability')
    if (metrics.efficiency > 10) strengths.push('Excellent efficiency')

    return strengths.length > 0 ? strengths : ['Standard performance']
  }

  private identifyModelWeaknesses(results: BenchmarkResult[]): string[] {
    const metrics = this.calculateModelMetrics(results)
    const weaknesses: string[] = []

    if (metrics.averageQuality < 70) weaknesses.push('Quality needs improvement')
    if (metrics.averageLatency > 8000) weaknesses.push('Slow response times')
    if (metrics.averageCost > 0.05) weaknesses.push('High cost per request')
    if (metrics.successRate < 95) weaknesses.push('Reliability issues')

    return weaknesses.length > 0 ? weaknesses : ['No significant weaknesses']
  }

  private determineBestUseCase(results: BenchmarkResult[]): string {
    const metrics = this.calculateModelMetrics(results)

    if (metrics.averageQuality > 85 && metrics.averageLatency < 3000) {
      return 'High-quality real-time applications'
    } else if (metrics.averageCost < 0.005) {
      return 'High-volume cost-sensitive operations'
    } else if (metrics.averageLatency < 2000) {
      return 'Time-critical applications'
    } else if (metrics.averageQuality > 80) {
      return 'Quality-focused applications'
    } else {
      return 'General purpose usage'
    }
  }

  private calculateConfidence(sampleSize: number): number {
    if (sampleSize < 5) return 0.3
    if (sampleSize < 10) return 0.6
    if (sampleSize < 20) return 0.8
    return 0.95
  }

  private analyzeCostEfficiency(results: BenchmarkResult[]): BenchmarkInsight | null {
    const costs = results.map(r => r.metrics.cost)
    const avgCost = this.calculateMean(costs)

    if (avgCost > 0.02) {
      return {
        type: 'cost',
        title: 'High Average Cost Detected',
        description: `Average cost per request is $${avgCost.toFixed(4)}, which may impact budget for high-volume usage`,
        impact: 'medium',
        confidence: 0.85,
        models: [...new Set(results.map(r => r.model))],
        data: { averageCost: avgCost, threshold: 0.02 }
      }
    }

    return null
  }

  private analyzePerformance(results: BenchmarkResult[]): BenchmarkInsight | null {
    const latencies = results.filter(r => r.metrics.success).map(r => r.metrics.duration)
    const avgLatency = this.calculateMean(latencies)

    if (avgLatency > 6000) {
      return {
        type: 'performance',
        title: 'High Latency Detected',
        description: `Average response time is ${(avgLatency / 1000).toFixed(1)} seconds, which may affect user experience`,
        impact: 'high',
        confidence: 0.9,
        models: [...new Set(results.map(r => r.model))],
        data: { averageLatency: avgLatency, threshold: 6000 }
      }
    }

    return null
  }

  private analyzeQuality(results: BenchmarkResult[]): BenchmarkInsight | null {
    const qualities = results.filter(r => r.metrics.qualityScore).map(r => r.metrics.qualityScore!)
    const avgQuality = this.calculateMean(qualities)

    if (avgQuality < 75) {
      return {
        type: 'quality',
        title: 'Low Quality Scores',
        description: `Average quality score is ${avgQuality.toFixed(1)}, below recommended threshold`,
        impact: 'high',
        confidence: 0.8,
        models: [...new Set(results.map(r => r.model))],
        data: { averageQuality: avgQuality, threshold: 75 }
      }
    }

    return null
  }

  private analyzeReliability(results: BenchmarkResult[]): BenchmarkInsight | null {
    const successRate = (results.filter(r => r.metrics.success).length / results.length) * 100

    if (successRate < 95) {
      return {
        type: 'reliability',
        title: 'Reliability Issues',
        description: `Success rate is ${successRate.toFixed(1)}%, indicating potential reliability concerns`,
        impact: 'high',
        confidence: 0.95,
        models: [...new Set(results.map(r => r.model))],
        data: { successRate, threshold: 95 }
      }
    }

    return null
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateSuiteId(): string {
    return `suite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const benchmarkingService = new UnifiedBenchmarkingService()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick benchmark execution for common use cases
 */
export async function quickBenchmark(
  models: string[],
  testPrompts: string[],
  userId?: string
): Promise<string> {
  const suite = benchmarkingService.createSuite({
    name: 'Quick Benchmark',
    description: 'Ad-hoc benchmark for model comparison',
    version: '1.0.0',
    testCases: testPrompts.map((prompt, index) => ({
      id: `quick_test_${index}`,
      name: `Test ${index + 1}`,
      category: 'text_generation',
      prompt,
      expectedLatency: 5000,
      qualityCriteria: {
        weights: {
          relevance: 0.3,
          coherence: 0.2,
          completeness: 0.2,
          accuracy: 0.15,
          creativity: 0.1,
          safety: 0.05
        },
        thresholds: {
          minimum: 60,
          good: 75,
          excellent: 90
        }
      }
    })),
    modelsToTest: models,
    targetMetrics: [
      { name: 'quality', type: 'quality', target: 75, threshold: 'minimum', weight: 0.5 },
      { name: 'latency', type: 'latency', target: 5000, threshold: 'maximum', weight: 0.3 },
      { name: 'cost', type: 'cost', target: 0.02, threshold: 'maximum', weight: 0.2 }
    ],
    executionConfig: {
      parallel: false,
      timeout: 30000,
      retries: 1,
      cooldownBetweenTests: 500,
      randomizeOrder: false,
      minSampleSize: 1,
      maxSampleSize: 10
    }
  })

  return benchmarkingService.executeSuite(suite, { userId })
}

export default benchmarkingService