import { generateText, gateway } from "ai"
import { performanceAnalytics, type PerformanceMetrics, type ModelPerformance } from "./performance-analytics"

// Benchmarking interfaces
export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  testCases: BenchmarkTestCase[]
  industryStandards?: IndustryBenchmark[]
  createdAt: Date
  updatedAt: Date
}

export interface BenchmarkTestCase {
  id: string
  name: string
  prompt: string
  expectedOutputCriteria: QualityCriteria[]
  weight: number // Importance weight for overall score
  category: 'clarity' | 'accuracy' | 'creativity' | 'speed' | 'cost'
}

export interface QualityCriteria {
  type: 'length' | 'keywords' | 'sentiment' | 'structure' | 'relevance'
  expected: any
  weight: number
  tolerance?: number
}

export interface IndustryBenchmark {
  category: string
  metric: string
  average: number
  percentile_50: number
  percentile_75: number
  percentile_90: number
  percentile_95: number
  unit: string
  source: string
  lastUpdated: Date
}

export interface BenchmarkResult {
  modelId: string
  suiteId: string
  testCaseId: string
  score: number
  metrics: {
    responseTime: number
    tokenUsage: number
    cost: number
    qualityScore: number
    errorOccurred: boolean
  }
  output: string
  timestamp: Date
}

export interface ComparisonReport {
  models: string[]
  overallWinner: string
  categoryWinners: Record<string, string>
  detailedResults: BenchmarkResult[]
  recommendations: string[]
  industryComparison?: IndustryComparisonData
}

export interface IndustryComparisonData {
  metric: string
  ourPerformance: number
  industryAverage: number
  percentileRanking: number
  gap: number
  recommendation: string
}

// AI Gateway client
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

export class AIBenchmarkingSystem {
  private static instance: AIBenchmarkingSystem
  private benchmarkSuites: BenchmarkSuite[] = []
  private benchmarkResults: BenchmarkResult[] = []
  private industryBenchmarks: IndustryBenchmark[] = []

  static getInstance(): AIBenchmarkingSystem {
    if (!AIBenchmarkingSystem.instance) {
      AIBenchmarkingSystem.instance = new AIBenchmarkingSystem()
    }
    return AIBenchmarkingSystem.instance
  }

  constructor() {
    this.initializeDefaultSuites()
    this.loadIndustryBenchmarks()
  }

  // Create comprehensive benchmark suite for OKR-specific tasks
  private initializeDefaultSuites(): void {
    const okrBenchmarkSuite: BenchmarkSuite = {
      id: 'okr-standard-v1',
      name: 'OKR Management Standard Benchmark',
      description: 'Comprehensive benchmark for OKR management AI capabilities',
      testCases: [
        {
          id: 'objective-analysis',
          name: 'Objective Performance Analysis',
          prompt: 'Analiza el siguiente objetivo: "Aumentar la satisfacción del cliente en un 25% este trimestre". Progreso actual: 15%. Proporciona insights y recomendaciones.',
          expectedOutputCriteria: [
            {
              type: 'length',
              expected: { min: 200, max: 500 },
              weight: 0.1
            },
            {
              type: 'keywords',
              expected: ['satisfacción', 'cliente', 'progreso', 'recomendaciones', 'estrategia'],
              weight: 0.3
            },
            {
              type: 'structure',
              expected: 'structured_analysis',
              weight: 0.2
            },
            {
              type: 'relevance',
              expected: 'high',
              weight: 0.4
            }
          ],
          weight: 0.25,
          category: 'accuracy'
        },
        {
          id: 'team-insights',
          name: 'Team Performance Insights',
          prompt: 'Un equipo de 8 personas tiene 12 objetivos activos, 3 completados y un progreso promedio del 65%. Genera insights para el gerente.',
          expectedOutputCriteria: [
            {
              type: 'keywords',
              expected: ['equipo', 'rendimiento', 'progreso', 'objetivos', 'liderazgo'],
              weight: 0.4
            },
            {
              type: 'length',
              expected: { min: 150, max: 400 },
              weight: 0.1
            },
            {
              type: 'relevance',
              expected: 'high',
              weight: 0.5
            }
          ],
          weight: 0.25,
          category: 'clarity'
        },
        {
          id: 'strategic-recommendations',
          name: 'Strategic Recommendations',
          prompt: 'Basándote en estos datos: 40% de objetivos retrasados, alta rotación en el departamento de ventas, y disminución del 10% en productividad. Proporciona recomendaciones estratégicas.',
          expectedOutputCriteria: [
            {
              type: 'keywords',
              expected: ['estrategia', 'recomendaciones', 'productividad', 'retención', 'mejora'],
              weight: 0.4
            },
            {
              type: 'structure',
              expected: 'actionable_recommendations',
              weight: 0.3
            },
            {
              type: 'relevance',
              expected: 'high',
              weight: 0.3
            }
          ],
          weight: 0.3,
          category: 'creativity'
        },
        {
          id: 'quick-status',
          name: 'Quick Status Summary',
          prompt: 'Proporciona un resumen rápido: 5 objetivos, 2 completados, 1 retrasado, 2 en progreso.',
          expectedOutputCriteria: [
            {
              type: 'length',
              expected: { min: 50, max: 150 },
              weight: 0.3
            },
            {
              type: 'keywords',
              expected: ['resumen', 'objetivos', 'estado', 'progreso'],
              weight: 0.4
            },
            {
              type: 'relevance',
              expected: 'high',
              weight: 0.3
            }
          ],
          weight: 0.2,
          category: 'speed'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.benchmarkSuites.push(okrBenchmarkSuite)
  }

  // Load industry benchmarks (in production, fetch from external sources)
  private loadIndustryBenchmarks(): void {
    const industryData: IndustryBenchmark[] = [
      {
        category: 'AI Response Time',
        metric: 'average_response_time_ms',
        average: 2500,
        percentile_50: 1800,
        percentile_75: 3200,
        percentile_90: 5000,
        percentile_95: 7500,
        unit: 'milliseconds',
        source: 'AI Industry Report 2024',
        lastUpdated: new Date('2024-01-01')
      },
      {
        category: 'AI Cost Efficiency',
        metric: 'cost_per_1k_tokens',
        average: 0.002,
        percentile_50: 0.0015,
        percentile_75: 0.003,
        percentile_90: 0.005,
        percentile_95: 0.008,
        unit: 'USD',
        source: 'LLM Pricing Analysis Q4 2024',
        lastUpdated: new Date('2024-10-01')
      },
      {
        category: 'AI Quality Score',
        metric: 'quality_score',
        average: 0.78,
        percentile_50: 0.75,
        percentile_75: 0.85,
        percentile_90: 0.92,
        percentile_95: 0.95,
        unit: 'score',
        source: 'AI Quality Benchmarks 2024',
        lastUpdated: new Date('2024-09-01')
      },
      {
        category: 'Error Rate',
        metric: 'error_rate',
        average: 0.03,
        percentile_50: 0.02,
        percentile_75: 0.04,
        percentile_90: 0.07,
        percentile_95: 0.12,
        unit: 'percentage',
        source: 'AI Reliability Study 2024',
        lastUpdated: new Date('2024-08-01')
      }
    ]

    this.industryBenchmarks.push(...industryData)
  }

  // Run comprehensive benchmark against multiple models
  async runBenchmark(models: string[], suiteId?: string): Promise<ComparisonReport> {
    const suite = suiteId
      ? this.benchmarkSuites.find(s => s.id === suiteId)
      : this.benchmarkSuites[0] // Default to first suite

    if (!suite) {
      throw new Error(`Benchmark suite ${suiteId} not found`)
    }

    console.log(`🔄 Iniciando benchmark "${suite.name}" para ${models.length} modelos...`)

    const allResults: BenchmarkResult[] = []
    const modelScores: Record<string, number> = {}
    const categoryScores: Record<string, Record<string, number>> = {}

    // Initialize category tracking
    models.forEach(model => {
      categoryScores[model] = {}
    })

    // Run each test case for each model
    for (const testCase of suite.testCases) {
      console.log(`📝 Ejecutando test case: ${testCase.name}`)

      for (const model of models) {
        try {
          const result = await this.runSingleTest(model, testCase)
          allResults.push(result)

          // Track scores
          if (!modelScores[model]) modelScores[model] = 0
          modelScores[model] += result.score * testCase.weight

          if (!categoryScores[model][testCase.category]) {
            categoryScores[model][testCase.category] = 0
          }
          categoryScores[model][testCase.category] += result.score * testCase.weight

        } catch (error) {
          console.error(`❌ Error en ${model} para ${testCase.name}:`, error)

          // Record failure
          const failureResult: BenchmarkResult = {
            modelId: model,
            suiteId: suite.id,
            testCaseId: testCase.id,
            score: 0,
            metrics: {
              responseTime: 30000,
              tokenUsage: 0,
              cost: 0,
              qualityScore: 0,
              errorOccurred: true
            },
            output: 'ERROR: Failed to generate response',
            timestamp: new Date()
          }

          allResults.push(failureResult)
        }
      }
    }

    // Store results
    this.benchmarkResults.push(...allResults)

    // Determine winners
    const overallWinner = Object.entries(modelScores).reduce((best, [model, score]) =>
      score > (modelScores[best] || 0) ? model : best
    , models[0])

    const categoryWinners: Record<string, string> = {}
    const categories = [...new Set(suite.testCases.map(tc => tc.category))]

    categories.forEach(category => {
      const categoryWinner = models.reduce((best, model) =>
        (categoryScores[model][category] || 0) > (categoryScores[best][category] || 0) ? model : best
      )
      categoryWinners[category] = categoryWinner
    })

    // Generate recommendations
    const recommendations = this.generateRecommendations(allResults, modelScores)

    // Compare with industry benchmarks
    const industryComparison = await this.compareWithIndustry(allResults)

    console.log(`✅ Benchmark completado. Ganador general: ${overallWinner}`)

    return {
      models,
      overallWinner,
      categoryWinners,
      detailedResults: allResults,
      recommendations,
      industryComparison
    }
  }

  // Run single test case
  private async runSingleTest(model: string, testCase: BenchmarkTestCase): Promise<BenchmarkResult> {
    const startTime = new Date()

    const { text, usage } = await generateText({
      model: ai(model),
      prompt: testCase.prompt,
      maxTokens: 600
    })

    const endTime = new Date()
    const responseTime = endTime.getTime() - startTime.getTime()

    // Calculate cost
    const estimatedCost = this.estimateModelCost(model, usage?.totalTokens || 200)

    // Evaluate quality against criteria
    const qualityScore = await this.evaluateQuality(text, testCase.expectedOutputCriteria)

    // Calculate overall test score
    const score = this.calculateTestScore(qualityScore, responseTime, estimatedCost)

    // Track performance
    await performanceAnalytics.trackOperation(
      `benchmark-${testCase.id}`,
      model,
      startTime,
      endTime,
      {
        input: usage?.promptTokens || 100,
        output: usage?.completionTokens || 100
      },
      estimatedCost,
      true,
      qualityScore
    )

    return {
      modelId: model,
      suiteId: testCase.id.split('-')[0] || 'unknown',
      testCaseId: testCase.id,
      score,
      metrics: {
        responseTime,
        tokenUsage: usage?.totalTokens || 200,
        cost: estimatedCost,
        qualityScore,
        errorOccurred: false
      },
      output: text,
      timestamp: new Date()
    }
  }

  // Evaluate response quality against criteria
  private async evaluateQuality(output: string, criteria: QualityCriteria[]): Promise<number> {
    let totalScore = 0
    let totalWeight = 0

    for (const criterion of criteria) {
      let score = 0

      switch (criterion.type) {
        case 'length':
          const length = output.length
          const min = criterion.expected.min || 0
          const max = criterion.expected.max || Infinity
          score = (length >= min && length <= max) ? 1 : 0.5
          break

        case 'keywords':
          const keywords = criterion.expected as string[]
          const lowerOutput = output.toLowerCase()
          const foundKeywords = keywords.filter(keyword =>
            lowerOutput.includes(keyword.toLowerCase())
          )
          score = foundKeywords.length / keywords.length
          break

        case 'structure':
          score = await this.evaluateStructure(output, criterion.expected)
          break

        case 'relevance':
          score = await this.evaluateRelevance(output, criterion.expected)
          break

        case 'sentiment':
          score = await this.evaluateSentiment(output, criterion.expected)
          break

        default:
          score = 0.5 // Default neutral score
      }

      totalScore += score * criterion.weight
      totalWeight += criterion.weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0.5
  }

  // AI-powered structure evaluation
  private async evaluateStructure(output: string, expected: string): Promise<number> {
    try {
      const prompt = `
        Evalúa si el siguiente texto tiene una estructura ${expected}:

        Texto: "${output}"

        Criterios de estructura "${expected}":
        - structured_analysis: Debe tener secciones claras (situación actual, análisis, recomendaciones)
        - actionable_recommendations: Debe contener recomendaciones específicas y accionables
        - summary_format: Debe ser un resumen conciso y bien organizado

        Responde solo con un número del 0 al 1 (donde 1 es estructura perfecta).
      `

      const { text } = await generateText({
        model: ai('openai/gpt-4o-mini'),
        prompt,
        maxTokens: 10
      })

      const score = parseFloat(text.trim())
      return !isNaN(score) && score >= 0 && score <= 1 ? score : 0.5
    } catch (error) {
      console.warn('Structure evaluation failed:', error)
      return 0.5
    }
  }

  // AI-powered relevance evaluation
  private async evaluateRelevance(output: string, expected: string): Promise<number> {
    try {
      const prompt = `
        Evalúa qué tan relevante es esta respuesta para el contexto de gestión de OKRs:

        Respuesta: "${output}"

        Nivel esperado: ${expected}
        - high: Muy relevante y útil para gestión de OKRs
        - medium: Parcialmente relevante
        - low: Poco relevante

        Responde solo con un número del 0 al 1.
      `

      const { text } = await generateText({
        model: ai('openai/gpt-4o-mini'),
        prompt,
        maxTokens: 10
      })

      const score = parseFloat(text.trim())
      return !isNaN(score) && score >= 0 && score <= 1 ? score : 0.5
    } catch (error) {
      console.warn('Relevance evaluation failed:', error)
      return 0.5
    }
  }

  // Sentiment evaluation
  private async evaluateSentiment(output: string, expected: string): Promise<number> {
    // Simple sentiment check - in production, use more sophisticated sentiment analysis
    const positiveWords = ['excelente', 'bueno', 'positivo', 'mejora', 'éxito', 'progreso']
    const negativeWords = ['problema', 'malo', 'falla', 'error', 'retraso', 'crisis']

    const lowerOutput = output.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerOutput.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerOutput.includes(word)).length

    let score = 0.5 // Neutral default

    if (expected === 'positive') {
      score = positiveCount > negativeCount ? 0.8 : 0.3
    } else if (expected === 'negative') {
      score = negativeCount > positiveCount ? 0.8 : 0.3
    } else if (expected === 'neutral') {
      score = Math.abs(positiveCount - negativeCount) <= 1 ? 0.8 : 0.4
    }

    return score
  }

  // Calculate overall test score
  private calculateTestScore(qualityScore: number, responseTime: number, cost: number): number {
    // Normalize response time (penalty after 5 seconds)
    const timeScore = Math.max(0, 1 - (responseTime / 5000))

    // Normalize cost (penalty after $0.05 per request)
    const costScore = Math.max(0, 1 - (cost / 0.05))

    // Weighted combination
    return (qualityScore * 0.6) + (timeScore * 0.25) + (costScore * 0.15)
  }

  // Generate recommendations based on results
  private generateRecommendations(results: BenchmarkResult[], modelScores: Record<string, number>): string[] {
    const recommendations: string[] = []

    // Performance recommendations
    const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime, 0) / results.length
    if (avgResponseTime > 3000) {
      recommendations.push('Considere optimizar los tiempos de respuesta. El promedio actual supera los 3 segundos.')
    }

    // Cost optimization
    const avgCost = results.reduce((sum, r) => sum + r.metrics.cost, 0) / results.length
    if (avgCost > 0.03) {
      recommendations.push('Los costos por operación son elevados. Evalúe usar modelos más eficientes para tareas rutinarias.')
    }

    // Quality improvement
    const avgQuality = results.reduce((sum, r) => sum + r.metrics.qualityScore, 0) / results.length
    if (avgQuality < 0.7) {
      recommendations.push('La calidad promedio está por debajo del 70%. Revise los prompts y parámetros de los modelos.')
    }

    // Model-specific recommendations
    const sortedModels = Object.entries(modelScores).sort(([,a], [,b]) => b - a)
    const topModel = sortedModels[0]?.[0]
    const bottomModel = sortedModels[sortedModels.length - 1]?.[0]

    if (topModel && bottomModel && topModel !== bottomModel) {
      recommendations.push(`El modelo ${topModel} muestra el mejor rendimiento general. Considere priorizarlo para operaciones críticas.`)

      const topScore = modelScores[topModel]
      const bottomScore = modelScores[bottomModel]
      const improvement = ((topScore - bottomScore) / bottomScore) * 100

      if (improvement > 20) {
        recommendations.push(`Existe una diferencia significativa del ${improvement.toFixed(1)}% entre el mejor y peor modelo. Considere reorganizar la distribución de carga.`)
      }
    }

    // Error rate recommendations
    const errorRate = results.filter(r => r.metrics.errorOccurred).length / results.length
    if (errorRate > 0.05) {
      recommendations.push(`Tasa de error del ${(errorRate * 100).toFixed(1)}% requiere atención inmediata. Implemente mecanismos de failover.`)
    }

    return recommendations
  }

  // Compare performance with industry benchmarks
  private async compareWithIndustry(results: BenchmarkResult[]): Promise<IndustryComparisonData[]> {
    const comparisons: IndustryComparisonData[] = []

    if (results.length === 0) return comparisons

    // Response time comparison
    const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.responseTime, 0) / results.length
    const responseTimeBenchmark = this.industryBenchmarks.find(b => b.metric === 'average_response_time_ms')

    if (responseTimeBenchmark) {
      const percentileRanking = this.calculatePercentileRanking(avgResponseTime, responseTimeBenchmark)
      comparisons.push({
        metric: 'Tiempo de Respuesta',
        ourPerformance: avgResponseTime,
        industryAverage: responseTimeBenchmark.average,
        percentileRanking,
        gap: avgResponseTime - responseTimeBenchmark.average,
        recommendation: avgResponseTime > responseTimeBenchmark.average
          ? 'Su tiempo de respuesta está por encima del promedio de la industria. Considere optimizaciones.'
          : 'Su tiempo de respuesta está dentro de los estándares de la industria.'
      })
    }

    // Cost comparison
    const avgCost = results.reduce((sum, r) => sum + r.metrics.cost, 0) / results.length
    const costBenchmark = this.industryBenchmarks.find(b => b.metric === 'cost_per_1k_tokens')

    if (costBenchmark) {
      const normalizedCost = (avgCost / (results.reduce((sum, r) => sum + r.metrics.tokenUsage, 0) / results.length)) * 1000
      const percentileRanking = this.calculatePercentileRanking(normalizedCost, costBenchmark)

      comparisons.push({
        metric: 'Costo por 1K Tokens',
        ourPerformance: normalizedCost,
        industryAverage: costBenchmark.average,
        percentileRanking,
        gap: normalizedCost - costBenchmark.average,
        recommendation: normalizedCost > costBenchmark.average
          ? 'Sus costos están por encima del promedio de la industria. Evalúe optimizaciones de costo.'
          : 'Sus costos están competitivos con los estándares de la industria.'
      })
    }

    // Quality comparison
    const avgQuality = results.reduce((sum, r) => sum + r.metrics.qualityScore, 0) / results.length
    const qualityBenchmark = this.industryBenchmarks.find(b => b.metric === 'quality_score')

    if (qualityBenchmark) {
      const percentileRanking = this.calculatePercentileRanking(avgQuality, qualityBenchmark, true) // Higher is better
      comparisons.push({
        metric: 'Puntuación de Calidad',
        ourPerformance: avgQuality,
        industryAverage: qualityBenchmark.average,
        percentileRanking,
        gap: avgQuality - qualityBenchmark.average,
        recommendation: avgQuality < qualityBenchmark.average
          ? 'Su puntuación de calidad está por debajo del promedio de la industria. Revise los prompts y configuraciones.'
          : 'Su puntuación de calidad cumple o supera los estándares de la industria.'
      })
    }

    return comparisons
  }

  // Calculate percentile ranking
  private calculatePercentileRanking(value: number, benchmark: IndustryBenchmark, higherIsBetter = false): number {
    const percentiles = [
      { percentile: 50, value: benchmark.percentile_50 },
      { percentile: 75, value: benchmark.percentile_75 },
      { percentile: 90, value: benchmark.percentile_90 },
      { percentile: 95, value: benchmark.percentile_95 }
    ]

    if (higherIsBetter) {
      // For metrics where higher values are better (quality, efficiency)
      for (let i = percentiles.length - 1; i >= 0; i--) {
        if (value >= percentiles[i].value) {
          return percentiles[i].percentile
        }
      }
      return value >= benchmark.average ? 50 : 25
    } else {
      // For metrics where lower values are better (response time, cost, error rate)
      for (const { percentile, value: benchmarkValue } of percentiles) {
        if (value <= benchmarkValue) {
          return 100 - percentile // Invert for "lower is better"
        }
      }
      return value <= benchmark.average ? 50 : 25
    }
  }

  // Cost estimation (simplified)
  private estimateModelCost(model: string, tokens: number): number {
    const costPerThousandTokens: Record<string, number> = {
      'openai/gpt-4o': 0.015,
      'openai/gpt-4o-mini': 0.0015,
      'anthropic/claude-3-sonnet-20240229': 0.003,
      'anthropic/claude-3-haiku-20240307': 0.0005,
      'google/gemini-1.5-flash': 0.001,
      'default': 0.002
    }

    const cost = costPerThousandTokens[model] || costPerThousandTokens['default']
    return (tokens / 1000) * cost
  }

  // Get benchmark results for a specific model
  getBenchmarkResults(modelId?: string, suiteId?: string): BenchmarkResult[] {
    let results = this.benchmarkResults

    if (modelId) {
      results = results.filter(r => r.modelId === modelId)
    }

    if (suiteId) {
      results = results.filter(r => r.suiteId === suiteId)
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Get available benchmark suites
  getBenchmarkSuites(): BenchmarkSuite[] {
    return this.benchmarkSuites
  }

  // Add custom benchmark suite
  addBenchmarkSuite(suite: Omit<BenchmarkSuite, 'id' | 'createdAt' | 'updatedAt'>): string {
    const newSuite: BenchmarkSuite = {
      ...suite,
      id: `custom-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.benchmarkSuites.push(newSuite)
    return newSuite.id
  }

  // Update industry benchmarks
  updateIndustryBenchmarks(benchmarks: IndustryBenchmark[]): void {
    this.industryBenchmarks = benchmarks
  }

  // Get industry comparison data
  getIndustryBenchmarks(): IndustryBenchmark[] {
    return this.industryBenchmarks
  }
}

// Export singleton instance
export const aiBenchmarking = AIBenchmarkingSystem.getInstance()