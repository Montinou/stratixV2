import { aiClient } from './gateway-client'
import { metricsCollector, instrumentAIOperation, CostCalculator } from '../performance/unified-performance-service'
import { qualityService } from '../performance/unified-quality-service'
import type { QualityAssessment } from '../performance/unified-quality-service'
import type { PerformanceMetrics } from '../performance/unified-performance-service'

// A/B Testing interfaces
export interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  variants: ABTestVariant[]
  trafficSplit: number[] // Percentage split for each variant (must sum to 100)
  objective: ABTestObjective
  targetMetrics: string[]
  startDate: Date
  endDate?: Date
  minimumSampleSize: number
  confidenceLevel: number // 0.95 for 95% confidence
  createdBy: string
  hypothesis: string
  results?: ABTestResults
  metadata?: Record<string, any>
}

export interface ABTestVariant {
  id: string
  name: string
  description: string
  modelConfig: ModelConfiguration
  promptTemplate?: string
  parameters?: Record<string, any>
  allocatedTraffic: number // Percentage of traffic for this variant
}

export interface ModelConfiguration {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
}

export interface ABTestObjective {
  primary: 'quality' | 'latency' | 'cost' | 'user_satisfaction' | 'conversion'
  secondary?: string[]
  direction: 'maximize' | 'minimize'
  targetImprovement?: number // Expected improvement percentage
}

export interface ABTestResults {
  status: 'inconclusive' | 'significant' | 'highly_significant'
  confidence: number
  pValue: number
  winningVariant?: string
  statisticalPower: number
  metrics: ABTestMetrics
  recommendations: string[]
  calculatedAt: Date
}

export interface ABTestMetrics {
  [variantId: string]: {
    sampleSize: number
    conversionRate?: number
    averageQuality: number
    averageLatency: number
    averageCost: number
    successRate: number
    userSatisfaction?: number
    confidenceInterval: {
      lower: number
      upper: number
    }
  }
}

export interface ABTestAssignment {
  userId: string
  testId: string
  variantId: string
  assignedAt: Date
  sessionId?: string
}

export interface ABTestExecution {
  id: string
  testId: string
  variantId: string
  userId: string
  operation: string
  prompt: string
  response: string
  metrics: {
    latency: number
    cost: number
    qualityScore: number
    userFeedback?: {
      rating: number
      helpful: boolean
    }
  }
  timestamp: Date
}

export class ABTestingFramework {
  private tests: ABTest[] = []
  private assignments: ABTestAssignment[] = []
  private executions: ABTestExecution[] = []
  private readonly hashSeed = 12345 // For consistent assignment

  constructor() {
    // Initialize with any existing tests from storage
  }

  /**
   * Create a new A/B test
   */
  public createTest(
    testConfig: Omit<ABTest, 'id' | 'status' | 'startDate' | 'results'>
  ): string {
    // Validate traffic split
    const totalTraffic = testConfig.trafficSplit.reduce((sum, split) => sum + split, 0)
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error('Traffic split must sum to 100%')
    }

    if (testConfig.variants.length !== testConfig.trafficSplit.length) {
      throw new Error('Number of variants must match traffic split array length')
    }

    const testId = this.generateTestId()
    const test: ABTest = {
      ...testConfig,
      id: testId,
      status: 'draft',
      startDate: new Date()
    }

    this.tests.push(test)
    return testId
  }

  /**
   * Start an A/B test
   */
  public startTest(testId: string): boolean {
    const test = this.tests.find(t => t.id === testId)
    if (!test) return false

    if (test.status !== 'draft') {
      throw new Error(`Cannot start test in ${test.status} status`)
    }

    test.status = 'active'
    test.startDate = new Date()

    console.log(`A/B Test started: ${test.name} (${testId})`)
    return true
  }

  /**
   * Pause an active A/B test
   */
  public pauseTest(testId: string): boolean {
    const test = this.tests.find(t => t.id === testId)
    if (!test) return false

    if (test.status !== 'active') {
      throw new Error(`Cannot pause test in ${test.status} status`)
    }

    test.status = 'paused'
    return true
  }

  /**
   * Complete an A/B test and calculate results
   */
  public async completeTest(testId: string): Promise<ABTestResults> {
    const test = this.tests.find(t => t.id === testId)
    if (!test) {
      throw new Error(`Test not found: ${testId}`)
    }

    if (test.status !== 'active' && test.status !== 'paused') {
      throw new Error(`Cannot complete test in ${test.status} status`)
    }

    const results = await this.calculateTestResults(testId)
    test.results = results
    test.status = 'completed'
    test.endDate = new Date()

    return results
  }

  /**
   * Get the assigned variant for a user in a specific test
   */
  public getUserVariant(
    testId: string,
    userId: string,
    sessionId?: string
  ): string | null {
    const test = this.tests.find(t => t.id === testId)
    if (!test || test.status !== 'active') {
      return null
    }

    // Check for existing assignment
    const existingAssignment = this.assignments.find(
      a => a.testId === testId && a.userId === userId
    )

    if (existingAssignment) {
      return existingAssignment.variantId
    }

    // Create new assignment using consistent hashing
    const variantId = this.assignUserToVariant(test, userId)

    this.assignments.push({
      userId,
      testId,
      variantId,
      assignedAt: new Date(),
      sessionId
    })

    return variantId
  }

  /**
   * Execute an A/B test for a specific operation
   */
  public async executeTest(
    testId: string,
    userId: string,
    operation: string,
    prompt: string,
    sessionId?: string
  ): Promise<{
    response: string
    variantUsed: string
    executionId: string
    metrics: any
  }> {
    const variantId = this.getUserVariant(testId, userId, sessionId)
    if (!variantId) {
      throw new Error(`No variant assigned for test ${testId} and user ${userId}`)
    }

    const test = this.tests.find(t => t.id === testId)!
    const variant = test.variants.find(v => v.id === variantId)!

    const startTime = Date.now()

    try {
      // Execute AI operation with variant configuration
      const response = await this.executeWithVariant(variant, prompt, operation)
      const endTime = Date.now()

      const latency = endTime - startTime
      const inputTokens = CostCalculator.estimateTokens(prompt)
      const outputTokens = CostCalculator.estimateTokens(response)
      const costData = CostCalculator.calculateCost(variant.modelConfig.model, inputTokens, outputTokens)
      const cost = costData.total

      // Track quality metrics
      const executionId = this.generateExecutionId()
      const qualityMetrics = await qualityService.evaluateQuality(
        executionId,
        operation,
        variant.modelConfig.model,
        variant.modelConfig.model.split('/')[0],
        prompt,
        response,
        { userId, metadata: { testId, variantId, abTest: true } }
      )

      // Record execution
      const execution: ABTestExecution = {
        id: executionId,
        testId,
        variantId,
        userId,
        operation,
        prompt,
        response,
        metrics: {
          latency,
          cost,
          qualityScore: qualityMetrics.scores.overall
        },
        timestamp: new Date()
      }

      this.executions.push(execution)

      return {
        response,
        variantUsed: variantId,
        executionId,
        metrics: execution.metrics
      }

    } catch (error) {
      console.error(`A/B test execution failed for test ${testId}, variant ${variantId}:`, error)
      throw error
    }
  }

  /**
   * Record user feedback for an A/B test execution
   */
  public recordUserFeedback(
    executionId: string,
    feedback: { rating: number; helpful: boolean; comments?: string }
  ): boolean {
    const execution = this.executions.find(e => e.id === executionId)
    if (!execution) return false

    execution.metrics.userFeedback = {
      rating: feedback.rating,
      helpful: feedback.helpful
    }

    // Also add to quality service if available
    const qualityMetrics = qualityService.getAssessments({
      startDate: new Date(execution.timestamp.getTime() - 1000),
      endDate: new Date(execution.timestamp.getTime() + 1000)
    })
    const qualityMetric = qualityMetrics.find(m => m.requestId === executionId)

    if (qualityMetric) {
      qualityService.addUserFeedback(qualityMetric.id, {
        rating: feedback.rating as 1 | 2 | 3 | 4 | 5,
        helpful: feedback.helpful,
        comments: feedback.comments
      })
    }

    return true
  }

  /**
   * Get A/B test results and analysis
   */
  public async getTestAnalysis(testId: string): Promise<{
    test: ABTest
    currentMetrics: ABTestMetrics
    projectedResults?: ABTestResults
    recommendations: string[]
  }> {
    const test = this.tests.find(t => t.id === testId)
    if (!test) {
      throw new Error(`Test not found: ${testId}`)
    }

    const currentMetrics = await this.calculateCurrentMetrics(testId)

    let projectedResults: ABTestResults | undefined
    if (test.status === 'active') {
      // Calculate projected results if we have enough data
      const totalSampleSize = Object.values(currentMetrics)
        .reduce((sum, metric) => sum + metric.sampleSize, 0)

      if (totalSampleSize >= test.minimumSampleSize * 0.5) {
        projectedResults = await this.calculateTestResults(testId)
      }
    }

    const recommendations = this.generateRecommendations(test, currentMetrics, projectedResults)

    return {
      test,
      currentMetrics,
      projectedResults,
      recommendations
    }
  }

  /**
   * Get all tests with optional filtering
   */
  public getTests(filters?: {
    status?: ABTest['status']
    createdBy?: string
    active?: boolean
  }): ABTest[] {
    let filtered = [...this.tests]

    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status)
    }
    if (filters?.createdBy) {
      filtered = filtered.filter(t => t.createdBy === filters.createdBy)
    }
    if (filters?.active !== undefined) {
      filtered = filtered.filter(t =>
        filters.active ? t.status === 'active' : t.status !== 'active'
      )
    }

    return filtered.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  }

  // Private helper methods

  private assignUserToVariant(test: ABTest, userId: string): string {
    // Use deterministic hash for consistent assignment
    const hash = this.hashString(userId + test.id, this.hashSeed)
    const normalizedHash = hash / 2147483647 // Normalize to 0-1

    let cumulativeWeight = 0
    for (let i = 0; i < test.variants.length; i++) {
      cumulativeWeight += test.trafficSplit[i] / 100
      if (normalizedHash <= cumulativeWeight) {
        return test.variants[i].id
      }
    }

    // Fallback to first variant
    return test.variants[0].id
  }

  private hashString(str: string, seed: number): number {
    let hash = seed
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff
    }
    return hash
  }

  private async executeWithVariant(
    variant: ABTestVariant,
    prompt: string,
    operation: string
  ): Promise<string> {
    const config = variant.modelConfig

    // Apply prompt template if specified
    const finalPrompt = variant.promptTemplate
      ? variant.promptTemplate.replace('{prompt}', prompt)
      : prompt

    // Execute with variant configuration
    return aiClient.generateText(finalPrompt, {
      model: config.model,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 1000,
      // Add other parameters as needed
    })
  }


  private async calculateCurrentMetrics(testId: string): Promise<ABTestMetrics> {
    const executions = this.executions.filter(e => e.testId === testId)
    const test = this.tests.find(t => t.id === testId)!

    const metrics: ABTestMetrics = {}

    for (const variant of test.variants) {
      const variantExecutions = executions.filter(e => e.variantId === variant.id)

      if (variantExecutions.length === 0) {
        metrics[variant.id] = {
          sampleSize: 0,
          averageQuality: 0,
          averageLatency: 0,
          averageCost: 0,
          successRate: 0,
          confidenceInterval: { lower: 0, upper: 0 }
        }
        continue
      }

      const qualityScores = variantExecutions.map(e => e.metrics.qualityScore)
      const latencies = variantExecutions.map(e => e.metrics.latency)
      const costs = variantExecutions.map(e => e.metrics.cost)
      const userRatings = variantExecutions
        .filter(e => e.metrics.userFeedback?.rating)
        .map(e => e.metrics.userFeedback!.rating)

      const averageQuality = this.calculateMean(qualityScores)
      const averageLatency = this.calculateMean(latencies)
      const averageCost = this.calculateMean(costs)
      const successRate = (variantExecutions.filter(e => e.metrics.qualityScore > 70).length / variantExecutions.length) * 100

      // Calculate confidence interval for quality score
      const confidenceInterval = this.calculateConfidenceInterval(qualityScores, 0.95)

      metrics[variant.id] = {
        sampleSize: variantExecutions.length,
        averageQuality,
        averageLatency,
        averageCost,
        successRate,
        userSatisfaction: userRatings.length > 0 ? this.calculateMean(userRatings) : undefined,
        confidenceInterval
      }
    }

    return metrics
  }

  private async calculateTestResults(testId: string): Promise<ABTestResults> {
    const metrics = await this.calculateCurrentMetrics(testId)
    const test = this.tests.find(t => t.id === testId)!

    // Statistical significance testing
    const variants = Object.keys(metrics)
    if (variants.length < 2) {
      return {
        status: 'inconclusive',
        confidence: 0,
        pValue: 1,
        statisticalPower: 0,
        metrics,
        recommendations: ['Insufficient variants for comparison'],
        calculatedAt: new Date()
      }
    }

    // For simplicity, compare first two variants
    const variantA = variants[0]
    const variantB = variants[1]

    const metricsA = metrics[variantA]
    const metricsB = metrics[variantB]

    // Check minimum sample size
    const totalSampleSize = metricsA.sampleSize + metricsB.sampleSize
    if (totalSampleSize < test.minimumSampleSize) {
      return {
        status: 'inconclusive',
        confidence: 0,
        pValue: 1,
        statisticalPower: 0,
        metrics,
        recommendations: [`Need ${test.minimumSampleSize - totalSampleSize} more samples`],
        calculatedAt: new Date()
      }
    }

    // Calculate t-test for primary metric
    const primaryMetric = test.objective.primary
    let valueA: number, valueB: number

    switch (primaryMetric) {
      case 'quality':
        valueA = metricsA.averageQuality
        valueB = metricsB.averageQuality
        break
      case 'latency':
        valueA = metricsA.averageLatency
        valueB = metricsB.averageLatency
        break
      case 'cost':
        valueA = metricsA.averageCost
        valueB = metricsB.averageCost
        break
      default:
        valueA = metricsA.averageQuality
        valueB = metricsB.averageQuality
    }

    const { pValue, tStat } = this.calculateTTest(
      [valueA], [valueB], // Simplified - in practice would use actual distributions
      metricsA.sampleSize, metricsB.sampleSize
    )

    const isSignificant = pValue < (1 - test.confidenceLevel)
    const confidence = (1 - pValue) * 100

    let status: ABTestResults['status'] = 'inconclusive'
    if (pValue < 0.01) {
      status = 'highly_significant'
    } else if (pValue < 0.05) {
      status = 'significant'
    }

    // Determine winning variant
    let winningVariant: string | undefined
    if (isSignificant) {
      if (test.objective.direction === 'maximize') {
        winningVariant = valueA > valueB ? variantA : variantB
      } else {
        winningVariant = valueA < valueB ? variantA : variantB
      }
    }

    const recommendations = this.generateTestRecommendations(test, metrics, {
      pValue,
      isSignificant,
      winningVariant
    })

    return {
      status,
      confidence,
      pValue,
      winningVariant,
      statisticalPower: this.calculateStatisticalPower(metricsA.sampleSize, metricsB.sampleSize),
      metrics,
      recommendations,
      calculatedAt: new Date()
    }
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    const mean = this.calculateMean(values)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  private calculateConfidenceInterval(values: number[], confidence: number): { lower: number; upper: number } {
    if (values.length === 0) return { lower: 0, upper: 0 }

    const mean = this.calculateMean(values)
    const std = this.calculateStandardDeviation(values)
    const n = values.length

    // Use t-distribution critical value (approximation)
    const tCritical = confidence === 0.95 ? 1.96 : 2.576 // 95% or 99%
    const marginOfError = tCritical * (std / Math.sqrt(n))

    return {
      lower: mean - marginOfError,
      upper: mean + marginOfError
    }
  }

  private calculateTTest(
    groupA: number[],
    groupB: number[],
    nA: number,
    nB: number
  ): { pValue: number; tStat: number } {
    // Simplified t-test calculation
    // In practice, you'd want a more robust statistical library

    const meanA = this.calculateMean(groupA)
    const meanB = this.calculateMean(groupB)
    const stdA = this.calculateStandardDeviation(groupA)
    const stdB = this.calculateStandardDeviation(groupB)

    // Pooled standard error
    const pooledSE = Math.sqrt(
      (Math.pow(stdA, 2) / nA) + (Math.pow(stdB, 2) / nB)
    )

    const tStat = (meanA - meanB) / pooledSE

    // Rough approximation of p-value
    const degreesOfFreedom = nA + nB - 2
    const pValue = this.approximatePValue(Math.abs(tStat), degreesOfFreedom)

    return { pValue, tStat }
  }

  private approximatePValue(tStat: number, df: number): number {
    // Very rough approximation - in practice use a proper statistical library
    if (tStat < 1.0) return 0.8
    if (tStat < 1.5) return 0.2
    if (tStat < 2.0) return 0.05
    if (tStat < 3.0) return 0.01
    return 0.001
  }

  private calculateStatisticalPower(nA: number, nB: number): number {
    // Simplified power calculation
    const totalN = nA + nB
    if (totalN < 100) return 0.6
    if (totalN < 500) return 0.8
    return 0.9
  }

  private generateRecommendations(
    test: ABTest,
    currentMetrics: ABTestMetrics,
    projectedResults?: ABTestResults
  ): string[] {
    const recommendations: string[] = []

    const totalSampleSize = Object.values(currentMetrics)
      .reduce((sum, metric) => sum + metric.sampleSize, 0)

    if (totalSampleSize < test.minimumSampleSize) {
      const remaining = test.minimumSampleSize - totalSampleSize
      recommendations.push(`Necesita ${remaining} muestras más para alcanzar el tamaño mínimo`)
    }

    if (projectedResults?.status === 'significant') {
      recommendations.push(`Resultados estadísticamente significativos detectados`)
      if (projectedResults.winningVariant) {
        recommendations.push(`Variante ganadora: ${projectedResults.winningVariant}`)
      }
    }

    // Check for uneven distribution
    const sampleSizes = Object.values(currentMetrics).map(m => m.sampleSize)
    const maxSamples = Math.max(...sampleSizes)
    const minSamples = Math.min(...sampleSizes)

    if (maxSamples > minSamples * 1.5) {
      recommendations.push('Distribución desigual de muestras entre variantes')
    }

    return recommendations
  }

  private generateTestRecommendations(
    test: ABTest,
    metrics: ABTestMetrics,
    results: { pValue: number; isSignificant: boolean; winningVariant?: string }
  ): string[] {
    const recommendations: string[] = []

    if (results.isSignificant) {
      recommendations.push('Los resultados son estadísticamente significativos')
      if (results.winningVariant) {
        const winningMetrics = metrics[results.winningVariant]
        recommendations.push(
          `Implementar variante ${results.winningVariant} ` +
          `(calidad: ${winningMetrics.averageQuality.toFixed(1)}, ` +
          `latencia: ${winningMetrics.averageLatency.toFixed(0)}ms)`
        )
      }
    } else {
      recommendations.push('Los resultados no son estadísticamente significativos')
      recommendations.push('Considerar extender el test o aumentar el tamaño de muestra')
    }

    // Performance-based recommendations
    const variants = Object.keys(metrics)
    if (variants.length >= 2) {
      const bestQuality = Math.max(...variants.map(v => metrics[v].averageQuality))
      const bestLatency = Math.min(...variants.map(v => metrics[v].averageLatency))
      const bestCost = Math.min(...variants.map(v => metrics[v].averageCost))

      recommendations.push(`Mejor calidad: ${bestQuality.toFixed(1)}`)
      recommendations.push(`Mejor latencia: ${bestLatency.toFixed(0)}ms`)
      recommendations.push(`Mejor costo: $${bestCost.toFixed(4)}`)
    }

    return recommendations
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }
}

// Export singleton instance
export const abTesting = new ABTestingFramework()

// Helper function to execute A/B test within AI operations
export async function executeABTest(
  testId: string,
  userId: string,
  operation: string,
  prompt: string,
  sessionId?: string
): Promise<{ response: string; variantUsed: string; metrics: any } | null> {
  try {
    return await abTesting.executeTest(testId, userId, operation, prompt, sessionId)
  } catch (error) {
    console.warn(`A/B test execution failed for test ${testId}:`, error)
    return null
  }
}