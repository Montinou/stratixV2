import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"

/**
 * Core analytics engine for OKR performance analysis
 * Provides statistical analysis, pattern recognition, and predictive insights
 */

export interface AnalyticsMetrics {
  // Performance Metrics
  totalObjectives: number
  completedObjectives: number
  averageProgress: number
  completionRate: number

  // Timing Metrics
  overdueObjectives: number
  onTrackObjectives: number
  atRiskObjectives: number

  // Velocity Metrics
  progressVelocity: number
  estimatedCompletionDays: number

  // Efficiency Metrics
  resourceUtilization: number
  teamEfficiency: number
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable'
  strength: number // 0-1
  confidence: number // 0-1
  changeRate: number // percentage change per period
  seasonality?: 'weekly' | 'monthly' | 'quarterly'
}

export interface PredictiveInsight {
  objective_id: string
  completionProbability: number
  estimatedCompletionDate: string
  riskFactors: string[]
  recommendedActions: string[]
  confidence: number
}

export interface BenchmarkData {
  industry: string
  metric: string
  value: number
  percentile: number
  source: string
}

export interface PerformancePattern {
  type: 'success' | 'failure' | 'delay' | 'acceleration'
  description: string
  frequency: number
  impact: 'high' | 'medium' | 'low'
  conditions: Record<string, any>
}

export class AnalyticsEngine {
  private objectives: Objective[]
  private initiatives: Initiative[]
  private activities: Activity[]

  constructor(objectives: Objective[], initiatives: Initiative[] = [], activities: Activity[] = []) {
    this.objectives = objectives
    this.initiatives = initiatives
    this.activities = activities
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculateMetrics(): AnalyticsMetrics {
    const totalObjectives = this.objectives.length
    const completedObjectives = this.objectives.filter(obj => obj.status === "completado").length
    const averageProgress = totalObjectives > 0
      ? Math.round(this.objectives.reduce((sum, obj) => sum + obj.progress, 0) / totalObjectives)
      : 0

    const now = new Date()
    const overdueObjectives = this.objectives.filter(obj => {
      const endDate = new Date(obj.end_date)
      return endDate < now && obj.status !== "completado"
    }).length

    const onTrackObjectives = this.objectives.filter(obj => {
      const progress = obj.progress
      const timeElapsed = this.calculateTimeElapsed(obj.start_date, obj.end_date, now.toISOString())
      return progress >= timeElapsed * 0.8 // On track if progress ≥ 80% of time elapsed
    }).length

    const atRiskObjectives = this.objectives.filter(obj => {
      const progress = obj.progress
      const timeElapsed = this.calculateTimeElapsed(obj.start_date, obj.end_date, now.toISOString())
      return progress < timeElapsed * 0.6 && obj.status !== "completado" // At risk if progress < 60% of time elapsed
    }).length

    const progressVelocity = this.calculateProgressVelocity()
    const estimatedCompletionDays = this.calculateEstimatedCompletion()

    return {
      totalObjectives,
      completedObjectives,
      averageProgress,
      completionRate: totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0,
      overdueObjectives,
      onTrackObjectives,
      atRiskObjectives,
      progressVelocity,
      estimatedCompletionDays,
      resourceUtilization: this.calculateResourceUtilization(),
      teamEfficiency: this.calculateTeamEfficiency()
    }
  }

  /**
   * Analyze trends in performance data
   */
  analyzeTrends(periodDays: number = 30): TrendAnalysis {
    const recentObjectives = this.objectives.filter(obj => {
      const createdDate = new Date(obj.created_at)
      const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
      return createdDate >= cutoffDate
    })

    if (recentObjectives.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        confidence: 0,
        changeRate: 0
      }
    }

    // Calculate progress trend
    const progressPoints = recentObjectives.map((obj, index) => ({
      x: index,
      y: obj.progress
    }))

    const trend = this.calculateLinearRegression(progressPoints)

    return {
      direction: trend.slope > 0.1 ? 'increasing' : trend.slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.abs(trend.slope),
      confidence: trend.r2,
      changeRate: trend.slope * 100,
      seasonality: this.detectSeasonality(recentObjectives)
    }
  }

  /**
   * Generate predictive insights for objectives
   */
  generatePredictiveInsights(): PredictiveInsight[] {
    return this.objectives
      .filter(obj => obj.status !== "completado")
      .map(obj => {
        const completionProbability = this.calculateCompletionProbability(obj)
        const estimatedDate = this.estimateCompletionDate(obj)
        const riskFactors = this.identifyRiskFactors(obj)
        const recommendations = this.generateRecommendations(obj, riskFactors)

        return {
          objective_id: obj.id,
          completionProbability,
          estimatedCompletionDate: estimatedDate,
          riskFactors,
          recommendedActions: recommendations,
          confidence: this.calculatePredictionConfidence(obj)
        }
      })
  }

  /**
   * Identify performance patterns
   */
  detectPerformancePatterns(): PerformancePattern[] {
    const patterns: PerformancePattern[] = []

    // Success patterns
    const successfulObjectives = this.objectives.filter(obj =>
      obj.status === "completado" && obj.progress === 100
    )

    if (successfulObjectives.length > 0) {
      patterns.push({
        type: 'success',
        description: 'Objetivos completados exitosamente',
        frequency: successfulObjectives.length / this.objectives.length,
        impact: 'high',
        conditions: this.analyzeSuccessConditions(successfulObjectives)
      })
    }

    // Delay patterns
    const delayedObjectives = this.objectives.filter(obj => {
      const endDate = new Date(obj.end_date)
      const now = new Date()
      return endDate < now && obj.status !== "completado"
    })

    if (delayedObjectives.length > 0) {
      patterns.push({
        type: 'delay',
        description: 'Objetivos con retrasos frecuentes',
        frequency: delayedObjectives.length / this.objectives.length,
        impact: 'high',
        conditions: this.analyzeDelayConditions(delayedObjectives)
      })
    }

    // Acceleration patterns
    const acceleratingObjectives = this.objectives.filter(obj => {
      const timeElapsed = this.calculateTimeElapsed(obj.start_date, obj.end_date, new Date().toISOString())
      return obj.progress > timeElapsed * 1.2 // Progress > 120% of expected
    })

    if (acceleratingObjectives.length > 0) {
      patterns.push({
        type: 'acceleration',
        description: 'Objetivos con progreso acelerado',
        frequency: acceleratingObjectives.length / this.objectives.length,
        impact: 'medium',
        conditions: this.analyzeAccelerationConditions(acceleratingObjectives)
      })
    }

    return patterns
  }

  /**
   * Compare performance against benchmarks
   */
  benchmarkPerformance(industry: string = 'technology'): BenchmarkData[] {
    const metrics = this.calculateMetrics()

    // Industry benchmark data (would typically come from external source)
    const industryBenchmarks = this.getIndustryBenchmarks(industry)

    return [
      {
        industry,
        metric: 'completion_rate',
        value: metrics.completionRate,
        percentile: this.calculatePercentile(metrics.completionRate, industryBenchmarks.completion_rate),
        source: 'Industry Research'
      },
      {
        industry,
        metric: 'average_progress',
        value: metrics.averageProgress,
        percentile: this.calculatePercentile(metrics.averageProgress, industryBenchmarks.average_progress),
        source: 'Industry Research'
      },
      {
        industry,
        metric: 'team_efficiency',
        value: metrics.teamEfficiency,
        percentile: this.calculatePercentile(metrics.teamEfficiency, industryBenchmarks.team_efficiency),
        source: 'Industry Research'
      }
    ]
  }

  // Private helper methods

  private calculateTimeElapsed(startDate: string, endDate: string, currentDate: string): number {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const current = new Date(currentDate).getTime()

    const totalDuration = end - start
    const elapsedDuration = current - start

    return Math.max(0, Math.min(1, elapsedDuration / totalDuration))
  }

  private calculateProgressVelocity(): number {
    const recentObjectives = this.objectives.filter(obj => {
      const createdDate = new Date(obj.created_at)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return createdDate >= thirtyDaysAgo
    })

    if (recentObjectives.length === 0) return 0

    const totalProgress = recentObjectives.reduce((sum, obj) => sum + obj.progress, 0)
    const totalDays = 30

    return totalProgress / totalDays
  }

  private calculateEstimatedCompletion(): number {
    const incompleteObjectives = this.objectives.filter(obj => obj.status !== "completado")

    if (incompleteObjectives.length === 0) return 0

    const avgRemainingProgress = incompleteObjectives.reduce((sum, obj) => sum + (100 - obj.progress), 0) / incompleteObjectives.length
    const velocity = this.calculateProgressVelocity()

    return velocity > 0 ? Math.round(avgRemainingProgress / velocity) : Infinity
  }

  private calculateResourceUtilization(): number {
    // Simplified calculation based on objective distribution and team capacity
    const activeObjectives = this.objectives.filter(obj => obj.status === "en_progreso").length
    const totalCapacity = this.objectives.length * 1.2 // Assuming 20% buffer

    return Math.min(100, Math.round((activeObjectives / totalCapacity) * 100))
  }

  private calculateTeamEfficiency(): number {
    const metrics = this.calculateMetrics()
    const velocityScore = Math.min(100, this.calculateProgressVelocity() * 10)
    const completionScore = metrics.completionRate
    const onTrackScore = this.objectives.length > 0 ? (metrics.onTrackObjectives / this.objectives.length) * 100 : 0

    return Math.round((velocityScore + completionScore + onTrackScore) / 3)
  }

  private calculateLinearRegression(points: Array<{x: number, y: number}>): {slope: number, r2: number} {
    const n = points.length
    if (n < 2) return { slope: 0, r2: 0 }

    const sumX = points.reduce((sum, p) => sum + p.x, 0)
    const sumY = points.reduce((sum, p) => sum + p.y, 0)
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0)
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0)
    const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const meanY = sumY / n
    const totalSumSquares = sumYY - n * meanY * meanY
    const residualSumSquares = totalSumSquares - slope * slope * (sumXX - n * (sumX / n) * (sumX / n))
    const r2 = 1 - (residualSumSquares / totalSumSquares)

    return { slope, r2: Math.max(0, r2) }
  }

  private detectSeasonality(objectives: Objective[]): 'weekly' | 'monthly' | 'quarterly' | undefined {
    // Simplified seasonality detection based on creation patterns
    const dayOfWeekCounts = new Array(7).fill(0)
    const monthCounts = new Array(12).fill(0)

    objectives.forEach(obj => {
      const date = new Date(obj.created_at)
      dayOfWeekCounts[date.getDay()]++
      monthCounts[date.getMonth()]++
    })

    const weeklyVariance = this.calculateVariance(dayOfWeekCounts)
    const monthlyVariance = this.calculateVariance(monthCounts)

    if (weeklyVariance > monthlyVariance && weeklyVariance > 2) return 'weekly'
    if (monthlyVariance > 3) return 'monthly'

    return undefined
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  }

  private calculateCompletionProbability(objective: Objective): number {
    const timeElapsed = this.calculateTimeElapsed(objective.start_date, objective.end_date, new Date().toISOString())
    const progressRatio = objective.progress / 100

    // Base probability on progress vs time ratio
    let probability = progressRatio / Math.max(timeElapsed, 0.1)

    // Adjust based on historical performance
    const historicalSuccess = this.objectives.filter(obj =>
      obj.status === "completado" && obj.department === objective.department
    ).length / Math.max(this.objectives.filter(obj => obj.department === objective.department).length, 1)

    probability = (probability * 0.7) + (historicalSuccess * 0.3)

    return Math.max(0, Math.min(1, probability))
  }

  private estimateCompletionDate(objective: Objective): string {
    const currentProgress = objective.progress
    const remainingProgress = 100 - currentProgress

    if (remainingProgress <= 0) return objective.end_date

    const velocity = this.calculateProgressVelocity()
    if (velocity <= 0) return objective.end_date

    const daysToComplete = remainingProgress / velocity
    const estimatedDate = new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000)

    return estimatedDate.toISOString().split('T')[0]
  }

  private identifyRiskFactors(objective: Objective): string[] {
    const risks: string[] = []

    const timeElapsed = this.calculateTimeElapsed(objective.start_date, objective.end_date, new Date().toISOString())
    const progressRatio = objective.progress / 100

    if (progressRatio < timeElapsed * 0.6) {
      risks.push("Progreso significativamente por debajo del cronograma")
    }

    const endDate = new Date(objective.end_date)
    const daysToDeadline = (endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)

    if (daysToDeadline < 7 && objective.progress < 80) {
      risks.push("Fecha límite próxima con progreso insuficiente")
    }

    if (objective.progress === 0 && timeElapsed > 0.3) {
      risks.push("Objetivo sin progreso iniciado")
    }

    const departmentObjectives = this.objectives.filter(obj => obj.department === objective.department)
    const departmentDelayRate = departmentObjectives.filter(obj => {
      const objEndDate = new Date(obj.end_date)
      return objEndDate < new Date() && obj.status !== "completado"
    }).length / Math.max(departmentObjectives.length, 1)

    if (departmentDelayRate > 0.3) {
      risks.push("Historial de retrasos en el departamento")
    }

    return risks
  }

  private generateRecommendations(objective: Objective, riskFactors: string[]): string[] {
    const recommendations: string[] = []

    if (riskFactors.includes("Progreso significativamente por debajo del cronograma")) {
      recommendations.push("Revisar y redistribuir recursos para acelerar el progreso")
      recommendations.push("Identificar y eliminar obstáculos específicos")
    }

    if (riskFactors.includes("Fecha límite próxima con progreso insuficiente")) {
      recommendations.push("Considerar extensión de fecha límite o reducción de alcance")
      recommendations.push("Asignar recursos adicionales prioritarios")
    }

    if (riskFactors.includes("Objetivo sin progreso iniciado")) {
      recommendations.push("Programar sesión de kick-off urgente")
      recommendations.push("Clarificar responsabilidades y primeros pasos")
    }

    if (recommendations.length === 0) {
      recommendations.push("Mantener seguimiento regular del progreso")
      recommendations.push("Documentar mejores prácticas para replicar el éxito")
    }

    return recommendations
  }

  private calculatePredictionConfidence(objective: Objective): number {
    const historicalData = this.objectives.filter(obj =>
      obj.department === objective.department && obj.status === "completado"
    )

    const sampleSize = historicalData.length
    const timeConsistency = this.calculateTimeConsistency(historicalData)
    const progressConsistency = this.calculateProgressConsistency([objective])

    let confidence = 0.5 // Base confidence

    // Increase confidence with more historical data
    confidence += Math.min(0.3, sampleSize * 0.05)

    // Adjust for consistency
    confidence += timeConsistency * 0.2
    confidence += progressConsistency * 0.2

    return Math.max(0, Math.min(1, confidence))
  }

  private calculateTimeConsistency(objectives: Objective[]): number {
    if (objectives.length < 2) return 0

    const durations = objectives.map(obj => {
      const start = new Date(obj.start_date).getTime()
      const end = new Date(obj.end_date).getTime()
      return (end - start) / (24 * 60 * 60 * 1000) // days
    })

    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length
    const coefficient = variance / Math.max(mean, 1)

    return Math.max(0, 1 - coefficient / 10) // Lower coefficient = higher consistency
  }

  private calculateProgressConsistency(objectives: Objective[]): number {
    if (objectives.length < 2) return 0.5

    const progressRates = objectives.map(obj => {
      const timeElapsed = this.calculateTimeElapsed(obj.start_date, obj.end_date, new Date().toISOString())
      return timeElapsed > 0 ? obj.progress / (timeElapsed * 100) : 0
    })

    const mean = progressRates.reduce((sum, r) => sum + r, 0) / progressRates.length
    const variance = progressRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / progressRates.length

    return Math.max(0, 1 - variance)
  }

  private analyzeSuccessConditions(objectives: Objective[]): Record<string, any> {
    return {
      averageDuration: objectives.reduce((sum, obj) => {
        const start = new Date(obj.start_date).getTime()
        const end = new Date(obj.end_date).getTime()
        return sum + (end - start) / (24 * 60 * 60 * 1000)
      }, 0) / objectives.length,
      commonDepartments: this.getMostCommon(objectives.map(obj => obj.department)),
      timeToCompletion: objectives.reduce((sum, obj) => {
        const created = new Date(obj.created_at).getTime()
        const updated = new Date(obj.updated_at).getTime()
        return sum + (updated - created) / (24 * 60 * 60 * 1000)
      }, 0) / objectives.length
    }
  }

  private analyzeDelayConditions(objectives: Objective[]): Record<string, any> {
    return {
      averageDelay: objectives.reduce((sum, obj) => {
        const endDate = new Date(obj.end_date).getTime()
        const now = Date.now()
        return sum + Math.max(0, (now - endDate) / (24 * 60 * 60 * 1000))
      }, 0) / objectives.length,
      commonDepartments: this.getMostCommon(objectives.map(obj => obj.department)),
      averageProgress: objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length
    }
  }

  private analyzeAccelerationConditions(objectives: Objective[]): Record<string, any> {
    return {
      averageAcceleration: objectives.reduce((sum, obj) => {
        const timeElapsed = this.calculateTimeElapsed(obj.start_date, obj.end_date, new Date().toISOString())
        return sum + (obj.progress / 100 - timeElapsed)
      }, 0) / objectives.length,
      commonDepartments: this.getMostCommon(objectives.map(obj => obj.department)),
      resourceFactors: 'high_engagement' // Simplified
    }
  }

  private getMostCommon<T>(array: (T | null)[]): T | null {
    const counts = new Map<T, number>()
    let maxCount = 0
    let result: T | null = null

    array.forEach(item => {
      if (item !== null) {
        const count = (counts.get(item) || 0) + 1
        counts.set(item, count)
        if (count > maxCount) {
          maxCount = count
          result = item
        }
      }
    })

    return result
  }

  private getIndustryBenchmarks(industry: string): Record<string, number[]> {
    // Simplified industry benchmarks - in production, this would come from external data sources
    const benchmarks: Record<string, Record<string, number[]>> = {
      technology: {
        completion_rate: [75, 80, 85, 90, 95],
        average_progress: [65, 70, 75, 80, 85],
        team_efficiency: [70, 75, 80, 85, 90]
      },
      finance: {
        completion_rate: [70, 75, 80, 85, 90],
        average_progress: [60, 65, 70, 75, 80],
        team_efficiency: [65, 70, 75, 80, 85]
      },
      healthcare: {
        completion_rate: [65, 70, 75, 80, 85],
        average_progress: [55, 60, 65, 70, 75],
        team_efficiency: [60, 65, 70, 75, 80]
      }
    }

    return benchmarks[industry] || benchmarks.technology
  }

  private calculatePercentile(value: number, benchmarkArray: number[]): number {
    const sortedBenchmarks = [...benchmarkArray].sort((a, b) => a - b)
    let percentile = 0

    for (let i = 0; i < sortedBenchmarks.length; i++) {
      if (value >= sortedBenchmarks[i]) {
        percentile = ((i + 1) / sortedBenchmarks.length) * 100
      }
    }

    return Math.round(percentile)
  }
}