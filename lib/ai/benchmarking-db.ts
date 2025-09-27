import { getDrizzleClient } from '@/lib/database/client'
import {
  aiBenchmarkSuites,
  aiBenchmarkTestCases,
  aiBenchmarkResults
} from '@/lib/database/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'
import { aiClient, AI_MODELS } from './gateway-client'
import { performanceAnalyticsDB, instrumentAIOperation } from './performance-analytics-db'
import type { AIPerformanceMetrics } from './performance-analytics-db'

// Benchmark test case interfaces
export interface BenchmarkTestCase {
  id: string
  name: string
  description: string
  category: 'text_generation' | 'chat_completion' | 'embedding' | 'analysis'
  prompt: string
  expectedOutputType: 'text' | 'json' | 'embedding' | 'structured'
  expectedLatency: number // max acceptable latency in ms
  qualityCriteria: QualityCriteria
  metadata?: Record<string, any>
}

export interface QualityCriteria {
  minLength?: number
  maxLength?: number
  mustContain?: string[]
  mustNotContain?: string[]
  jsonSchema?: object
  relevanceKeywords?: string[]
  coherenceThreshold?: number
  accuracyThreshold?: number
}

export interface BenchmarkResult {
  testCaseId: string
  model: string
  provider: string
  success: boolean
  latency: number
  cost: number
  qualityScore: number
  outputText: string
  tokensInput: number
  tokensOutput: number
  error?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ModelBenchmarkSummary {
  model: string
  provider: string
  totalTests: number
  successRate: number
  averageLatency: number
  medianLatency: number
  averageQuality: number
  totalCost: number
  costPerToken: number
  rank: number
  strengths: string[]
  weaknesses: string[]
  recommendedUseCase: string
}

export interface BenchmarkSuite {
  id: string
  name: string
  description: string
  testCases: BenchmarkTestCase[]
  modelsToTest: string[]
  createdAt: Date
  updatedAt: Date
}

// Pre-defined test cases for comprehensive benchmarking
export const DEFAULT_BENCHMARK_CASES: BenchmarkTestCase[] = [
  {
    id: 'okr_generation_basic',
    name: 'Generación Básica de OKR',
    description: 'Genera un OKR completo para una empresa de tecnología',
    category: 'text_generation',
    prompt: 'Genera un OKR completo para una empresa de tecnología que quiere mejorar su productividad en el Q4. Incluye 1 objetivo y 3 resultados clave medibles.',
    expectedOutputType: 'structured',
    expectedLatency: 5000,
    qualityCriteria: {
      minLength: 200,
      maxLength: 800,
      mustContain: ['objetivo', 'resultado clave', 'Q4'],
      mustNotContain: ['lorem ipsum', 'placeholder'],
      relevanceKeywords: ['productividad', 'tecnología', 'medible', 'trimestre']
    }
  },
  {
    id: 'business_analysis',
    name: 'Análisis de Rendimiento Empresarial',
    description: 'Analiza datos de rendimiento y proporciona insights',
    category: 'analysis',
    prompt: 'Analiza estos datos de rendimiento: Ventas Q3: 500K, Q2: 450K, Q1: 400K. Empleados: 50. Satisfacción cliente: 85%. Proporciona 3 insights clave y 2 recomendaciones.',
    expectedOutputType: 'structured',
    expectedLatency: 4000,
    qualityCriteria: {
      minLength: 300,
      maxLength: 1000,
      mustContain: ['insight', 'recomendación', 'análisis'],
      relevanceKeywords: ['crecimiento', 'tendencia', 'optimización', 'estrategia'],
      coherenceThreshold: 80
    }
  },
  {
    id: 'creative_suggestions',
    name: 'Sugerencias Creativas',
    description: 'Genera sugerencias creativas para innovación',
    category: 'text_generation',
    prompt: 'Genera 5 ideas creativas para mejorar la colaboración remota en equipos de desarrollo de software.',
    expectedOutputType: 'text',
    expectedLatency: 3000,
    qualityCriteria: {
      minLength: 400,
      maxLength: 1200,
      mustContain: ['colaboración', 'remoto', 'desarrollo'],
      relevanceKeywords: ['innovación', 'comunicación', 'herramienta', 'proceso'],
      coherenceThreshold: 75
    }
  },
  {
    id: 'complex_reasoning',
    name: 'Razonamiento Complejo',
    description: 'Resuelve un problema que requiere múltiples pasos de razonamiento',
    category: 'analysis',
    prompt: 'Una empresa tiene 3 departamentos. Ventas: 10 empleados, productividad 120%. Marketing: 8 empleados, productividad 95%. Desarrollo: 15 empleados, productividad 110%. Si pueden contratar 5 personas más y quieren maximizar el output total, ¿cómo deberían distribuirlas? Explica tu razonamiento paso a paso.',
    expectedOutputType: 'structured',
    expectedLatency: 6000,
    qualityCriteria: {
      minLength: 300,
      maxLength: 1000,
      mustContain: ['razonamiento', 'paso', 'distribución'],
      relevanceKeywords: ['optimización', 'cálculo', 'estrategia', 'productividad'],
      accuracyThreshold: 85
    }
  },
  {
    id: 'embedding_similarity',
    name: 'Similaridad de Embeddings',
    description: 'Genera embeddings para conceptos relacionados',
    category: 'embedding',
    prompt: 'objetivo estratégico empresarial',
    expectedOutputType: 'embedding',
    expectedLatency: 2000,
    qualityCriteria: {
      // For embeddings, quality is measured differently
      relevanceKeywords: ['embedding', 'vector']
    }
  },
  {
    id: 'conversation_context',
    name: 'Contexto Conversacional',
    description: 'Mantiene contexto en conversación multi-turno',
    category: 'chat_completion',
    prompt: 'Usuario: ¿Cuáles son los beneficios de los OKRs? Asistente: Los OKRs ofrecen múltiples beneficios... Usuario: ¿Y cuáles son los principales desafíos?',
    expectedOutputType: 'text',
    expectedLatency: 4000,
    qualityCriteria: {
      minLength: 150,
      maxLength: 600,
      mustContain: ['desafío', 'OKR'],
      relevanceKeywords: ['implementación', 'medición', 'alineación', 'seguimiento'],
      coherenceThreshold: 85
    }
  }
]

export class AIModelBenchmarkingDB {
  private db = getDrizzleClient()

  constructor() {
    // Initialize with default benchmark suite if not exists
    this.initializeDefaultSuite()
  }

  /**
   * Initialize default benchmark suite
   */
  private async initializeDefaultSuite(): Promise<void> {
    try {
      // Check if default suite exists
      const existing = await this.db
        .select()
        .from(aiBenchmarkSuites)
        .where(eq(aiBenchmarkSuites.suiteId, 'default_suite'))
        .limit(1)

      if (existing.length === 0) {
        // Create default suite
        await this.db
          .insert(aiBenchmarkSuites)
          .values({
            suiteId: 'default_suite',
            name: 'Suite de Benchmarking Completo',
            description: 'Suite completo de pruebas para evaluar modelos de IA en diferentes categorías',
            modelsToTest: JSON.stringify([
              'openai/gpt-4o',
              'openai/gpt-4o-mini',
              'anthropic/claude-3-haiku-20240307',
              'anthropic/claude-3-sonnet-20240229'
            ])
          })

        // Create test cases
        for (const testCase of DEFAULT_BENCHMARK_CASES) {
          await this.db
            .insert(aiBenchmarkTestCases)
            .values({
              suiteId: 'default_suite',
              testCaseId: testCase.id,
              name: testCase.name,
              description: testCase.description,
              category: testCase.category,
              prompt: testCase.prompt,
              expectedOutputType: testCase.expectedOutputType,
              expectedLatency: testCase.expectedLatency,
              qualityCriteria: JSON.stringify(testCase.qualityCriteria),
              metadata: JSON.stringify(testCase.metadata || {})
            })
        }
      }
    } catch (error) {
      console.error('Error initializing default benchmark suite:', error)
    }
  }

  /**
   * Run a comprehensive benchmark across multiple models
   */
  public async runBenchmarkSuite(
    suiteId: string,
    options?: {
      modelsToTest?: string[]
      testCasesToRun?: string[]
      parallel?: boolean
      userId?: string
    }
  ): Promise<{
    results: BenchmarkResult[]
    summary: ModelBenchmarkSummary[]
    executionTime: number
    timestamp: Date
  }> {
    const startTime = Date.now()

    try {
      // Get suite from database
      const suite = await this.db
        .select()
        .from(aiBenchmarkSuites)
        .where(eq(aiBenchmarkSuites.suiteId, suiteId))
        .limit(1)
        .then(results => results[0])

      if (!suite) {
        throw new Error(`Benchmark suite not found: ${suiteId}`)
      }

      // Get test cases
      let testCasesQuery = this.db
        .select()
        .from(aiBenchmarkTestCases)
        .where(eq(aiBenchmarkTestCases.suiteId, suiteId))

      if (options?.testCasesToRun) {
        testCasesQuery = this.db
          .select()
          .from(aiBenchmarkTestCases)
          .where(and(
            eq(aiBenchmarkTestCases.suiteId, suiteId),
            // TODO: Add IN filter for testCasesToRun
          ))
      }

      const testCases = await testCasesQuery

      const modelsToTest = options?.modelsToTest ||
        (typeof suite.modelsToTest === 'string' ? JSON.parse(suite.modelsToTest) : suite.modelsToTest) ||
        ['openai/gpt-4o', 'openai/gpt-4o-mini']

      console.log(`Running benchmark suite: ${suite.name}`)
      console.log(`Models: ${modelsToTest.join(', ')}`)
      console.log(`Test cases: ${testCases.length}`)

      const results: BenchmarkResult[] = []

      if (options?.parallel) {
        // Run all combinations in parallel
        const promises = modelsToTest.flatMap(model =>
          testCases.map(testCase =>
            this.runSingleBenchmark(testCase, model, options?.userId)
          )
        )

        const allResults = await Promise.allSettled(promises)
        allResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          } else {
            console.error('Benchmark failed:', result.reason)
          }
        })
      } else {
        // Run sequentially for more controlled execution
        for (const model of modelsToTest) {
          for (const testCase of testCases) {
            try {
              const result = await this.runSingleBenchmark(testCase, model, options?.userId)
              results.push(result)
            } catch (error) {
              console.error(`Benchmark failed for ${model} on ${testCase.testCaseId}:`, error)
            }
          }
        }
      }

      // Store results in database
      for (const result of results) {
        await this.db
          .insert(aiBenchmarkResults)
          .values({
            testCaseId: result.testCaseId,
            model: result.model,
            provider: result.provider,
            success: result.success,
            latency: result.latency,
            cost: result.cost.toString(),
            qualityScore: result.qualityScore,
            outputText: result.outputText,
            tokensInput: result.tokensInput,
            tokensOutput: result.tokensOutput,
            error: result.error,
            metadata: JSON.stringify(result.metadata || {}),
            timestamp: result.timestamp
          })
      }

      // Generate summary
      const summary = this.generateBenchmarkSummary(results, modelsToTest)

      const executionTime = Date.now() - startTime

      return {
        results,
        summary,
        executionTime,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Error running benchmark suite:', error)
      throw error
    }
  }

  /**
   * Run a single benchmark test case against a specific model
   */
  public async runSingleBenchmark(
    testCase: any, // DB test case
    model: string,
    userId?: string
  ): Promise<BenchmarkResult> {
    const provider = this.extractProvider(model)
    const startTime = Date.now()

    try {
      let result: any
      let outputText = ''
      let tokensInput = 0
      let tokensOutput = 0

      // Parse test case data
      const qualityCriteria = typeof testCase.qualityCriteria === 'string'
        ? JSON.parse(testCase.qualityCriteria)
        : testCase.qualityCriteria

      // Execute the appropriate AI operation based on test case category
      switch (testCase.category) {
        case 'text_generation':
          result = await instrumentAIOperation(
            `benchmark_${testCase.testCaseId}`,
            model,
            provider,
            () => aiClient.generateText(testCase.prompt, { model }),
            userId,
            { testCaseId: testCase.testCaseId, category: testCase.category }
          )
          outputText = result
          tokensInput = (result as any).usage?.promptTokens || this.estimateTokens(testCase.prompt)
          tokensOutput = (result as any).usage?.completionTokens || this.estimateTokens(outputText)
          break

        case 'chat_completion':
          const messages = this.parseConversationPrompt(testCase.prompt)
          result = await instrumentAIOperation(
            `benchmark_${testCase.testCaseId}`,
            model,
            provider,
            () => aiClient.generateChatCompletion(messages, { model }),
            userId,
            { testCaseId: testCase.testCaseId, category: testCase.category }
          )
          outputText = result
          tokensInput = (result as any).usage?.promptTokens || this.estimateTokens(testCase.prompt)
          tokensOutput = (result as any).usage?.completionTokens || this.estimateTokens(outputText)
          break

        case 'embedding':
          result = await instrumentAIOperation(
            `benchmark_${testCase.testCaseId}`,
            model,
            provider,
            () => aiClient.generateEmbedding(testCase.prompt, { model }),
            userId,
            { testCaseId: testCase.testCaseId, category: testCase.category }
          )
          outputText = `embedding_vector_${result.length}_dimensions`
          tokensInput = this.estimateTokens(testCase.prompt)
          tokensOutput = 0 // Embeddings don't have output tokens
          break

        case 'analysis':
          result = await instrumentAIOperation(
            `benchmark_${testCase.testCaseId}`,
            model,
            provider,
            () => aiClient.generateText(testCase.prompt, {
              model,
              temperature: 0.3 // Lower temperature for analysis tasks
            }),
            userId,
            { testCaseId: testCase.testCaseId, category: testCase.category }
          )
          outputText = result
          tokensInput = (result as any).usage?.promptTokens || this.estimateTokens(testCase.prompt)
          tokensOutput = (result as any).usage?.completionTokens || this.estimateTokens(outputText)
          break

        default:
          throw new Error(`Unsupported test case category: ${testCase.category}`)
      }

      const endTime = Date.now()
      const latency = endTime - startTime

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(outputText, qualityCriteria, testCase.category)

      // Calculate cost (simplified - in real implementation would use actual usage data)
      const cost = this.estimateCost(model, tokensInput, tokensOutput)

      return {
        testCaseId: testCase.testCaseId,
        model,
        provider,
        success: true,
        latency,
        cost,
        qualityScore,
        outputText,
        tokensInput,
        tokensOutput,
        timestamp: new Date(),
        metadata: {
          expectedLatency: testCase.expectedLatency,
          meetsLatencyExpectation: latency <= testCase.expectedLatency,
          testCategory: testCase.category
        }
      }

    } catch (error) {
      const endTime = Date.now()
      const latency = endTime - startTime

      return {
        testCaseId: testCase.testCaseId,
        model,
        provider,
        success: false,
        latency,
        cost: 0,
        qualityScore: 0,
        outputText: '',
        tokensInput: 0,
        tokensOutput: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  /**
   * Get benchmark results with filters
   */
  public async getBenchmarkResults(filters?: {
    model?: string
    testCaseId?: string
    startDate?: Date
    endDate?: Date
    suiteId?: string
  }): Promise<BenchmarkResult[]> {
    try {
      let query = this.db
        .select()
        .from(aiBenchmarkResults)

      // Apply filters
      const conditions = []
      if (filters?.model) {
        conditions.push(eq(aiBenchmarkResults.model, filters.model))
      }
      if (filters?.testCaseId) {
        conditions.push(eq(aiBenchmarkResults.testCaseId, filters.testCaseId))
      }
      if (filters?.startDate) {
        conditions.push(gte(aiBenchmarkResults.timestamp, filters.startDate))
      }
      if (filters?.endDate) {
        conditions.push(lte(aiBenchmarkResults.timestamp, filters.endDate))
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }

      const results = await query.orderBy(desc(aiBenchmarkResults.timestamp))

      return results.map(result => ({
        testCaseId: result.testCaseId,
        model: result.model,
        provider: result.provider,
        success: result.success,
        latency: result.latency,
        cost: parseFloat(result.cost.toString()),
        qualityScore: result.qualityScore,
        outputText: result.outputText || '',
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        error: result.error || undefined,
        timestamp: result.timestamp,
        metadata: typeof result.metadata === 'string' ? JSON.parse(result.metadata) : result.metadata
      }))
    } catch (error) {
      console.error('Error getting benchmark results:', error)
      return []
    }
  }

  /**
   * Get available benchmark suites
   */
  public async getBenchmarkSuites(): Promise<BenchmarkSuite[]> {
    try {
      const suites = await this.db.select().from(aiBenchmarkSuites)

      const result: BenchmarkSuite[] = []

      for (const suite of suites) {
        // Get test cases for this suite
        const testCases = await this.db
          .select()
          .from(aiBenchmarkTestCases)
          .where(eq(aiBenchmarkTestCases.suiteId, suite.suiteId))

        result.push({
          id: suite.suiteId,
          name: suite.name,
          description: suite.description || '',
          testCases: testCases.map(tc => ({
            id: tc.testCaseId,
            name: tc.name,
            description: tc.description || '',
            category: tc.category,
            prompt: tc.prompt,
            expectedOutputType: tc.expectedOutputType as any,
            expectedLatency: tc.expectedLatency,
            qualityCriteria: typeof tc.qualityCriteria === 'string' ? JSON.parse(tc.qualityCriteria) : tc.qualityCriteria,
            metadata: typeof tc.metadata === 'string' ? JSON.parse(tc.metadata) : tc.metadata
          })),
          modelsToTest: typeof suite.modelsToTest === 'string' ? JSON.parse(suite.modelsToTest) : suite.modelsToTest || [],
          createdAt: suite.createdAt,
          updatedAt: suite.updatedAt
        })
      }

      return result
    } catch (error) {
      console.error('Error getting benchmark suites:', error)
      return []
    }
  }

  /**
   * Create a custom benchmark suite
   */
  public async createBenchmarkSuite(suite: Omit<BenchmarkSuite, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const id = `suite_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

      // Create suite
      await this.db
        .insert(aiBenchmarkSuites)
        .values({
          suiteId: id,
          name: suite.name,
          description: suite.description,
          modelsToTest: JSON.stringify(suite.modelsToTest)
        })

      // Create test cases
      for (const testCase of suite.testCases) {
        await this.db
          .insert(aiBenchmarkTestCases)
          .values({
            suiteId: id,
            testCaseId: testCase.id,
            name: testCase.name,
            description: testCase.description,
            category: testCase.category,
            prompt: testCase.prompt,
            expectedOutputType: testCase.expectedOutputType,
            expectedLatency: testCase.expectedLatency,
            qualityCriteria: JSON.stringify(testCase.qualityCriteria),
            metadata: JSON.stringify(testCase.metadata || {})
          })
      }

      return id
    } catch (error) {
      console.error('Error creating benchmark suite:', error)
      throw error
    }
  }

  // Private helper methods

  private generateBenchmarkSummary(
    results: BenchmarkResult[],
    modelsToTest: string[]
  ): ModelBenchmarkSummary[] {
    const summaries: ModelBenchmarkSummary[] = []

    for (const model of modelsToTest) {
      const modelResults = results.filter(r => r.model === model)

      if (modelResults.length === 0) continue

      const successfulResults = modelResults.filter(r => r.success)
      const latencies = successfulResults.map(r => r.latency).sort((a, b) => a - b)
      const qualities = successfulResults.map(r => r.qualityScore).filter(q => q > 0)
      const costs = modelResults.map(r => r.cost)
      const totalTokens = modelResults.reduce((sum, r) => sum + r.tokensInput + r.tokensOutput, 0)

      const summary: ModelBenchmarkSummary = {
        model,
        provider: this.extractProvider(model),
        totalTests: modelResults.length,
        successRate: (successfulResults.length / modelResults.length) * 100,
        averageLatency: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0,
        medianLatency: latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0,
        averageQuality: qualities.length > 0 ? qualities.reduce((sum, q) => sum + q, 0) / qualities.length : 0,
        totalCost: costs.reduce((sum, c) => sum + c, 0),
        costPerToken: totalTokens > 0 ? costs.reduce((sum, c) => sum + c, 0) / totalTokens : 0,
        rank: 0, // Will be calculated after sorting
        strengths: this.identifyModelStrengths(modelResults),
        weaknesses: this.identifyModelWeaknesses(modelResults),
        recommendedUseCase: this.recommendUseCase(modelResults)
      }

      summaries.push(summary)
    }

    // Rank models by overall performance
    return this.rankModelsByPerformance(summaries)
  }

  private calculateQualityScore(
    output: string,
    criteria: QualityCriteria,
    category: string
  ): number {
    if (category === 'embedding') {
      // For embeddings, basic validation
      return output.includes('embedding_vector') ? 90 : 0
    }

    let score = 100

    // Length criteria
    if (criteria.minLength && output.length < criteria.minLength) {
      score -= 20
    }
    if (criteria.maxLength && output.length > criteria.maxLength) {
      score -= 10
    }

    // Required content
    if (criteria.mustContain) {
      const missingCount = criteria.mustContain.filter(
        phrase => !output.toLowerCase().includes(phrase.toLowerCase())
      ).length
      score -= missingCount * 15
    }

    // Forbidden content
    if (criteria.mustNotContain) {
      const forbiddenCount = criteria.mustNotContain.filter(
        phrase => output.toLowerCase().includes(phrase.toLowerCase())
      ).length
      score -= forbiddenCount * 25
    }

    // Relevance keywords
    if (criteria.relevanceKeywords) {
      const foundKeywords = criteria.relevanceKeywords.filter(
        keyword => output.toLowerCase().includes(keyword.toLowerCase())
      ).length
      const relevanceScore = (foundKeywords / criteria.relevanceKeywords.length) * 100
      if (relevanceScore < 50) {
        score -= 20
      }
    }

    // Coherence (basic heuristic)
    if (criteria.coherenceThreshold) {
      const coherenceScore = this.calculateCoherenceScore(output)
      if (coherenceScore < criteria.coherenceThreshold) {
        score -= 15
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private calculateCoherenceScore(text: string): number {
    // Simple heuristics for coherence
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

    if (sentences.length === 0) return 0

    // Check for repetition
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()))
    const repetitionPenalty = (sentences.length - uniqueSentences.size) / sentences.length * 30

    // Check for reasonable sentence length
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    const lengthScore = avgSentenceLength > 10 && avgSentenceLength < 200 ? 20 : 0

    // Check for logical flow (very basic)
    const hasConnectives = text.toLowerCase().includes('por lo tanto') ||
                          text.toLowerCase().includes('además') ||
                          text.toLowerCase().includes('sin embargo') ||
                          text.toLowerCase().includes('por ejemplo')
    const connectiveScore = hasConnectives ? 10 : 0

    return Math.max(0, 70 + lengthScore + connectiveScore - repetitionPenalty)
  }

  private identifyModelStrengths(results: BenchmarkResult[]): string[] {
    const strengths: string[] = []
    const successfulResults = results.filter(r => r.success)

    if (successfulResults.length === 0) return ['Ninguna fortaleza identificada']

    const avgLatency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length
    const avgQuality = successfulResults.reduce((sum, r) => sum + r.qualityScore, 0) / successfulResults.length
    const avgCost = successfulResults.reduce((sum, r) => sum + r.cost, 0) / successfulResults.length

    if (avgLatency < 2000) strengths.push('Respuesta muy rápida')
    else if (avgLatency < 4000) strengths.push('Respuesta rápida')

    if (avgQuality > 85) strengths.push('Alta calidad de output')
    else if (avgQuality > 75) strengths.push('Buena calidad de output')

    if (avgCost < 0.001) strengths.push('Muy económico')
    else if (avgCost < 0.005) strengths.push('Económico')

    if (results.every(r => r.success)) strengths.push('100% confiabilidad')
    else if (results.filter(r => r.success).length / results.length > 0.95) strengths.push('Alta confiabilidad')

    return strengths.length > 0 ? strengths : ['Rendimiento estándar']
  }

  private identifyModelWeaknesses(results: BenchmarkResult[]): string[] {
    const weaknesses: string[] = []
    const successfulResults = results.filter(r => r.success)

    if (results.length === 0) return ['No hay datos suficientes']

    const successRate = successfulResults.length / results.length
    if (successRate < 0.9) weaknesses.push('Problemas de confiabilidad')

    if (successfulResults.length > 0) {
      const avgLatency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length
      const avgQuality = successfulResults.reduce((sum, r) => sum + r.qualityScore, 0) / successfulResults.length
      const avgCost = successfulResults.reduce((sum, r) => sum + r.cost, 0) / successfulResults.length

      if (avgLatency > 8000) weaknesses.push('Latencia alta')
      if (avgQuality < 60) weaknesses.push('Calidad de output mejorable')
      if (avgCost > 0.01) weaknesses.push('Costo elevado')
    }

    return weaknesses.length > 0 ? weaknesses : ['Ninguna debilidad significativa']
  }

  private recommendUseCase(results: BenchmarkResult[]): string {
    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length === 0) return 'No recomendado para uso en producción'

    const avgLatency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length
    const avgCost = successfulResults.reduce((sum, r) => sum + r.cost, 0) / successfulResults.length

    if (avgCost < 0.001) return 'Ideal para tareas de alto volumen con presupuesto limitado'
    if (avgLatency < 2000) return 'Excelente para aplicaciones en tiempo real'

    return 'Uso general con rendimiento balanceado'
  }

  private rankModelsByPerformance(summaries: ModelBenchmarkSummary[]): ModelBenchmarkSummary[] {
    // Calculate overall score for ranking
    const scored = summaries.map(summary => {
      const successWeight = 0.3
      const qualityWeight = 0.25
      const latencyWeight = 0.2
      const costWeight = 0.25

      // Normalize scores (higher is better)
      const successScore = summary.successRate
      const qualityScore = summary.averageQuality
      const latencyScore = Math.max(0, 100 - (summary.averageLatency / 100))
      const costScore = Math.max(0, 100 - (summary.costPerToken * 100000))

      const overallScore =
        successScore * successWeight +
        qualityScore * qualityWeight +
        latencyScore * latencyWeight +
        costScore * costWeight

      return { ...summary, overallScore }
    })

    // Sort by overall score
    scored.sort((a, b) => b.overallScore - a.overallScore)

    // Assign ranks
    return scored.map((summary, index) => ({
      ...summary,
      rank: index + 1
    }))
  }

  private extractProvider(model: string): string {
    return model.split('/')[0] || 'unknown'
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for Spanish text
    return Math.ceil(text.length / 4)
  }

  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Use the same cost calculation as in performance analytics
    const costs = {
      'openai/gpt-4o': { input: 2.5, output: 10.0 },
      'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
      'anthropic/claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      'anthropic/claude-3-sonnet-20240229': { input: 3.0, output: 15.0 }
    }

    const modelCost = costs[model as keyof typeof costs]
    if (!modelCost) return 0

    return (inputTokens / 1000000) * modelCost.input + (outputTokens / 1000000) * modelCost.output
  }

  private parseConversationPrompt(prompt: string): Array<{ role: 'user' | 'assistant', content: string }> {
    // Simple parser for conversation format
    const parts = prompt.split(/Usuario:|Asistente:/)
    const messages: Array<{ role: 'user' | 'assistant', content: string }> = []

    for (let i = 1; i < parts.length; i++) {
      const role = i % 2 === 1 ? 'user' as const : 'assistant' as const
      const content = parts[i].trim()
      if (content) {
        messages.push({ role, content })
      }
    }

    return messages.length > 0 ? messages : [{ role: 'user', content: prompt }]
  }
}

// Export singleton instance
export const modelBenchmarkingDB = new AIModelBenchmarkingDB()