import { generateText, gateway } from "ai"
import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"
import {
  AnalyticsEngine,
  type AnalyticsMetrics,
  type TrendAnalysis,
  type PredictiveInsight,
  type BenchmarkData,
  type PerformancePattern
} from "./analytics-engine"

// Create Vercel AI Gateway provider
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Budget-focused model configuration
const BUDGET_MODEL_PRIMARY = "openai/gpt-4o-mini"
const BUDGET_MODEL_FALLBACK = "anthropic/claude-3-haiku-20240307"

export interface InsightRequest {
  okrIds?: string[]
  teamId?: string
  timeRange: {
    start: string
    end: string
  }
  analysisType: 'performance' | 'predictive' | 'comparative' | 'comprehensive'
  includeRecommendations?: boolean
  benchmarkAgainst?: 'industry' | 'company' | 'team'
  userRole: UserRole
  department?: string
}

export interface Insight {
  id: string
  type: 'performance' | 'risk' | 'opportunity' | 'trend' | 'benchmark'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  data: Record<string, any>
  createdAt: string
}

export interface Prediction {
  objectiveId: string
  type: 'completion' | 'delay' | 'success' | 'failure'
  probability: number
  estimatedDate?: string
  factors: string[]
  confidence: number
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'process' | 'resource' | 'timing' | 'strategy'
  estimatedImpact: string
  effort: 'low' | 'medium' | 'high'
  actionItems: string[]
}

export interface Benchmark {
  metric: string
  currentValue: number
  benchmarkValue: number
  percentile: number
  status: 'above' | 'at' | 'below'
  gap: number
}

export interface RiskFactor {
  objectiveId: string
  type: 'timeline' | 'resource' | 'quality' | 'scope'
  severity: 'high' | 'medium' | 'low'
  description: string
  likelihood: number
  impact: string
  mitigation: string[]
}

export interface Trend {
  metric: string
  direction: 'increasing' | 'decreasing' | 'stable'
  strength: number
  period: string
  forecast: string
  confidence: number
}

export interface InsightsResponse {
  summary: string
  insights: Insight[]
  predictions: Prediction[]
  recommendations: Recommendation[]
  benchmarks: Benchmark[]
  riskFactors: RiskFactor[]
  trends: Trend[]
  metadata: {
    analysisDate: string
    dataRange: { start: string; end: string }
    objectiveCount: number
    processingTime: number
  }
}

export class InsightsGenerator {
  private analytics: AnalyticsEngine
  private objectives: Objective[]
  private initiatives: Initiative[]
  private activities: Activity[]

  constructor(objectives: Objective[], initiatives: Initiative[] = [], activities: Activity[] = []) {
    this.objectives = objectives
    this.initiatives = initiatives
    this.activities = activities
    this.analytics = new AnalyticsEngine(objectives, initiatives, activities)
  }

  /**
   * Generate comprehensive insights based on request parameters
   */
  async generateInsights(request: InsightRequest): Promise<InsightsResponse> {
    const startTime = Date.now()

    // Filter data based on request parameters
    const filteredData = this.filterData(request)
    const analytics = new AnalyticsEngine(filteredData.objectives, filteredData.initiatives, filteredData.activities)

    // Calculate metrics and analysis
    const metrics = analytics.calculateMetrics()
    const trends = analytics.analyzeTrends()
    const predictiveInsights = analytics.generatePredictiveInsights()
    const patterns = analytics.detectPerformancePatterns()
    const benchmarks = analytics.benchmarkPerformance()

    // Generate AI-powered insights
    const insights = await this.generateAIInsights(metrics, trends, patterns, request)
    const summary = await this.generateExecutiveSummary(metrics, insights, request)

    // Create structured response
    const response: InsightsResponse = {
      summary,
      insights: await this.formatInsights(insights, patterns),
      predictions: this.formatPredictions(predictiveInsights),
      recommendations: await this.generateRecommendations(metrics, patterns, request),
      benchmarks: this.formatBenchmarks(benchmarks),
      riskFactors: this.formatRiskFactors(predictiveInsights),
      trends: this.formatTrends(trends, metrics),
      metadata: {
        analysisDate: new Date().toISOString(),
        dataRange: request.timeRange,
        objectiveCount: filteredData.objectives.length,
        processingTime: Date.now() - startTime
      }
    }

    return response
  }

  /**
   * Generate AI-powered narrative insights
   */
  private async generateAIInsights(
    metrics: AnalyticsMetrics,
    trends: TrendAnalysis,
    patterns: PerformancePattern[],
    request: InsightRequest
  ): Promise<string> {
    const prompt = `
      Eres un analista de rendimiento OKR experto. Analiza los siguientes datos y genera insights específicos y accionables.

      DATOS DE RENDIMIENTO:
      - Objetivos totales: ${metrics.totalObjectives}
      - Tasa de finalización: ${metrics.completionRate}%
      - Progreso promedio: ${metrics.averageProgress}%
      - Objetivos vencidos: ${metrics.overdueObjectives}
      - Objetivos en buen camino: ${metrics.onTrackObjectives}
      - Objetivos en riesgo: ${metrics.atRiskObjectives}
      - Velocidad de progreso: ${metrics.progressVelocity.toFixed(2)}%/día
      - Eficiencia del equipo: ${metrics.teamEfficiency}%
      - Utilización de recursos: ${metrics.resourceUtilization}%

      ANÁLISIS DE TENDENCIAS:
      - Dirección: ${trends.direction}
      - Fuerza: ${(trends.strength * 100).toFixed(1)}%
      - Confianza: ${(trends.confidence * 100).toFixed(1)}%
      - Tasa de cambio: ${trends.changeRate.toFixed(2)}%

      PATRONES DETECTADOS:
      ${patterns.map(p => `- ${p.type}: ${p.description} (${(p.frequency * 100).toFixed(1)}% frecuencia)`).join('\n')}

      CONTEXTO DEL USUARIO:
      - Rol: ${request.userRole}
      - Departamento: ${request.department || 'No especificado'}
      - Tipo de análisis: ${request.analysisType}

      GENERA:
      1. 3-4 insights clave específicos basados en los datos
      2. Identificación de fortalezas y oportunidades de mejora
      3. Análisis de patrones críticos y su impacto
      4. Recomendaciones estratégicas adaptadas al rol del usuario

      Responde en español profesional, sé específico con números y porcentajes.
      Máximo 400 palabras, estructura en párrafos claros.
    `

    try {
      const { text } = await generateText({
        model: ai(BUDGET_MODEL_PRIMARY),
        prompt,
        maxTokens: 500,
      })

      return text
    } catch (error) {
      console.error("Error generating AI insights:", error)
      return "No se pudieron generar insights detallados en este momento."
    }
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(
    metrics: AnalyticsMetrics,
    insights: string,
    request: InsightRequest
  ): Promise<string> {
    const prompt = `
      Genera un resumen ejecutivo conciso basado en estos datos de OKR:

      MÉTRICAS CLAVE:
      - ${metrics.totalObjectives} objetivos totales
      - ${metrics.completionRate}% tasa de finalización
      - ${metrics.averageProgress}% progreso promedio
      - ${metrics.teamEfficiency}% eficiencia del equipo

      INSIGHTS GENERADOS:
      ${insights}

      ROL DEL USUARIO: ${request.userRole}

      Genera un resumen ejecutivo de 2-3 oraciones que capture:
      1. Estado general del rendimiento
      2. Principal área de atención
      3. Próximo paso recomendado

      Responde en español, tono profesional y conciso.
    `

    try {
      const { text } = await generateText({
        model: ai(BUDGET_MODEL_PRIMARY),
        prompt,
        maxTokens: 200,
      })

      return text
    } catch (error) {
      console.error("Error generating executive summary:", error)
      return `Análisis de ${metrics.totalObjectives} objetivos con ${metrics.completionRate}% de finalización. Se requiere atención en áreas de mejora identificadas.`
    }
  }

  /**
   * Generate strategic recommendations
   */
  private async generateRecommendations(
    metrics: AnalyticsMetrics,
    patterns: PerformancePattern[],
    request: InsightRequest
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    // Performance-based recommendations
    if (metrics.completionRate < 70) {
      recommendations.push({
        id: `rec-completion-${Date.now()}`,
        title: "Mejorar Tasa de Finalización",
        description: "La tasa de finalización está por debajo del benchmark. Se requiere intervención inmediata.",
        priority: 'high',
        category: 'process',
        estimatedImpact: `Potencial aumento del ${100 - metrics.completionRate}% en la finalización de objetivos`,
        effort: 'medium',
        actionItems: [
          "Revisar objetivos estancados y redistribuir recursos",
          "Implementar revisiones semanales de progreso",
          "Identificar y eliminar obstáculos específicos"
        ]
      })
    }

    if (metrics.atRiskObjectives > metrics.totalObjectives * 0.3) {
      recommendations.push({
        id: `rec-risk-${Date.now()}`,
        title: "Gestión de Objetivos en Riesgo",
        description: "Alto número de objetivos en riesgo requiere atención prioritaria.",
        priority: 'high',
        category: 'timing',
        estimatedImpact: "Prevención de fallos en cascada y mejora de predictibilidad",
        effort: 'high',
        actionItems: [
          "Crear plan de contingencia para objetivos críticos",
          "Reasignar recursos a objetivos en riesgo",
          "Establecer checkpoints adicionales"
        ]
      })
    }

    if (metrics.progressVelocity < 2) {
      recommendations.push({
        id: `rec-velocity-${Date.now()}`,
        title: "Acelerar Velocidad de Progreso",
        description: "La velocidad de progreso es menor al benchmark esperado.",
        priority: 'medium',
        category: 'process',
        estimatedImpact: "Aumento del 25-40% en la velocidad de ejecución",
        effort: 'medium',
        actionItems: [
          "Optimizar procesos de trabajo actuales",
          "Eliminar dependencias innecesarias",
          "Mejorar comunicación entre equipos"
        ]
      })
    }

    // Pattern-based recommendations
    const delayPattern = patterns.find(p => p.type === 'delay')
    if (delayPattern && delayPattern.frequency > 0.2) {
      recommendations.push({
        id: `rec-delays-${Date.now()}`,
        title: "Reducir Patrones de Retraso",
        description: "Se detectó un patrón recurrente de retrasos que afecta la predictibilidad.",
        priority: 'medium',
        category: 'strategy',
        estimatedImpact: "Reducción del 30-50% en retrasos futuros",
        effort: 'high',
        actionItems: [
          "Analizar causas raíz de retrasos recurrentes",
          "Implementar buffers de tiempo en planificación",
          "Mejorar estimación de esfuerzo requerido"
        ]
      })
    }

    // Resource optimization
    if (metrics.resourceUtilization > 90) {
      recommendations.push({
        id: `rec-resources-${Date.now()}`,
        title: "Optimizar Utilización de Recursos",
        description: "Alta utilización de recursos puede generar burnout y reducir calidad.",
        priority: 'medium',
        category: 'resource',
        estimatedImpact: "Mejora en sostenibilidad y calidad de ejecución",
        effort: 'low',
        actionItems: [
          "Revisar distribución de carga de trabajo",
          "Considerar recursos adicionales para períodos pico",
          "Implementar rotación de responsabilidades"
        ]
      })
    }

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  /**
   * Filter data based on request parameters
   */
  private filterData(request: InsightRequest): {
    objectives: Objective[]
    initiatives: Initiative[]
    activities: Activity[]
  } {
    let filteredObjectives = this.objectives
    let filteredInitiatives = this.initiatives
    let filteredActivities = this.activities

    // Filter by date range
    const startDate = new Date(request.timeRange.start)
    const endDate = new Date(request.timeRange.end)

    filteredObjectives = filteredObjectives.filter(obj => {
      const objStart = new Date(obj.start_date)
      const objEnd = new Date(obj.end_date)
      return (objStart >= startDate && objStart <= endDate) ||
             (objEnd >= startDate && objEnd <= endDate) ||
             (objStart <= startDate && objEnd >= endDate)
    })

    // Filter by specific OKR IDs if provided
    if (request.okrIds && request.okrIds.length > 0) {
      filteredObjectives = filteredObjectives.filter(obj => request.okrIds!.includes(obj.id))
    }

    // Filter by team/department if provided
    if (request.teamId || request.department) {
      const departmentFilter = request.department
      if (departmentFilter) {
        filteredObjectives = filteredObjectives.filter(obj => obj.department === departmentFilter)
      }
    }

    // Filter related initiatives and activities
    const objectiveIds = filteredObjectives.map(obj => obj.id)
    filteredInitiatives = filteredInitiatives.filter(init => objectiveIds.includes(init.objective_id))

    const initiativeIds = filteredInitiatives.map(init => init.id)
    filteredActivities = filteredActivities.filter(act => initiativeIds.includes(act.initiative_id))

    return {
      objectives: filteredObjectives,
      initiatives: filteredInitiatives,
      activities: filteredActivities
    }
  }

  /**
   * Format insights for response
   */
  private async formatInsights(aiInsights: string, patterns: PerformancePattern[]): Promise<Insight[]> {
    const insights: Insight[] = []

    // Parse AI insights into structured format
    const insightSections = aiInsights.split('\n').filter(line => line.trim().length > 0)

    insightSections.forEach((section, index) => {
      if (section.length > 50) { // Only process substantial content
        insights.push({
          id: `insight-${Date.now()}-${index}`,
          type: 'performance',
          title: `Insight ${index + 1}`,
          description: section.trim(),
          impact: 'medium',
          confidence: 0.8,
          data: {},
          createdAt: new Date().toISOString()
        })
      }
    })

    // Add pattern-based insights
    patterns.forEach(pattern => {
      insights.push({
        id: `pattern-${Date.now()}-${pattern.type}`,
        type: pattern.type === 'success' ? 'opportunity' : 'risk',
        title: `Patrón Detectado: ${pattern.description}`,
        description: `Frecuencia: ${(pattern.frequency * 100).toFixed(1)}% - Impacto: ${pattern.impact}`,
        impact: pattern.impact,
        confidence: pattern.frequency,
        data: pattern.conditions,
        createdAt: new Date().toISOString()
      })
    })

    return insights.slice(0, 8) // Limit to most relevant insights
  }

  /**
   * Format predictions for response
   */
  private formatPredictions(predictiveInsights: PredictiveInsight[]): Prediction[] {
    return predictiveInsights.map(insight => ({
      objectiveId: insight.objective_id,
      type: insight.completionProbability > 0.8 ? 'success' :
            insight.completionProbability < 0.4 ? 'failure' : 'completion',
      probability: insight.completionProbability,
      estimatedDate: insight.estimatedCompletionDate,
      factors: insight.riskFactors,
      confidence: insight.confidence
    }))
  }

  /**
   * Format benchmarks for response
   */
  private formatBenchmarks(benchmarkData: BenchmarkData[]): Benchmark[] {
    return benchmarkData.map(bench => ({
      metric: bench.metric,
      currentValue: bench.value,
      benchmarkValue: bench.percentile,
      percentile: bench.percentile,
      status: bench.percentile >= 75 ? 'above' : bench.percentile >= 50 ? 'at' : 'below',
      gap: bench.percentile >= 50 ? bench.percentile - 50 : 50 - bench.percentile
    }))
  }

  /**
   * Format risk factors for response
   */
  private formatRiskFactors(predictiveInsights: PredictiveInsight[]): RiskFactor[] {
    const riskFactors: RiskFactor[] = []

    predictiveInsights.forEach(insight => {
      if (insight.completionProbability < 0.6) {
        insight.riskFactors.forEach((factor, index) => {
          riskFactors.push({
            objectiveId: insight.objective_id,
            type: this.categorizeRisk(factor),
            severity: insight.completionProbability < 0.3 ? 'high' : 'medium',
            description: factor,
            likelihood: 1 - insight.completionProbability,
            impact: "Posible fallo en cumplimiento de objetivo",
            mitigation: insight.recommendedActions
          })
        })
      }
    })

    return riskFactors.slice(0, 10) // Limit to top 10 risks
  }

  /**
   * Format trends for response
   */
  private formatTrends(trendAnalysis: TrendAnalysis, metrics: AnalyticsMetrics): Trend[] {
    return [
      {
        metric: 'Progreso General',
        direction: trendAnalysis.direction,
        strength: trendAnalysis.strength,
        period: '30 días',
        forecast: this.generateForecast(trendAnalysis, metrics.averageProgress),
        confidence: trendAnalysis.confidence
      },
      {
        metric: 'Velocidad de Ejecución',
        direction: metrics.progressVelocity > 2 ? 'increasing' : 'stable',
        strength: Math.min(1, metrics.progressVelocity / 3),
        period: '30 días',
        forecast: `Velocidad actual: ${metrics.progressVelocity.toFixed(2)}%/día`,
        confidence: 0.7
      }
    ]
  }

  /**
   * Helper methods
   */
  private categorizeRisk(riskDescription: string): 'timeline' | 'resource' | 'quality' | 'scope' {
    if (riskDescription.includes('cronograma') || riskDescription.includes('fecha')) return 'timeline'
    if (riskDescription.includes('recurso') || riskDescription.includes('capacidad')) return 'resource'
    if (riskDescription.includes('calidad') || riskDescription.includes('estándar')) return 'quality'
    return 'scope'
  }

  private generateForecast(trend: TrendAnalysis, currentValue: number): string {
    const projectedChange = trend.changeRate * 4 // 4 weeks projection
    const projectedValue = Math.max(0, Math.min(100, currentValue + projectedChange))

    return `Proyección 30 días: ${projectedValue.toFixed(1)}% (${projectedChange > 0 ? '+' : ''}${projectedChange.toFixed(1)}%)`
  }
}