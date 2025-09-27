import { aiClient } from './gateway-client'
import { withCache, CACHE_PRESETS } from './cache-layer'
import { withRateLimit, getRateLimitConfig } from './rate-limiter'
import { withErrorHandling } from './error-handler'
import type { AnalyticsResponse, AnalyticsRequest, Insight, PerformanceMetrics, TeamPerformanceData, AnalyticsEngine } from './analytics-engine'

/**
 * AI-powered Insights Generator
 * Converts analytics data into natural language insights using AI Gateway
 * Following AI_GATEWAY_IMPLEMENTATION_GUIDE patterns
 */
export class InsightsGenerator {
  private analyticsEngine: AnalyticsEngine

  constructor(analyticsEngine: AnalyticsEngine) {
    this.analyticsEngine = analyticsEngine
  }

  /**
   * Generate comprehensive insights using AI analysis
   */
  async generateInsights(request: AnalyticsRequest, userId: string): Promise<AnalyticsResponse> {
    try {
      // Get analytics data
      const data = await this.analyticsEngine.getAnalyticsData(request, userId)
      const metrics = this.analyticsEngine.calculatePerformanceMetrics(data)

      // Generate different types of insights based on analysis type
      let insights: Insight[] = []
      let predictions = []
      let recommendations = []
      let benchmarks = []
      let riskFactors = []
      let trends = []

      switch (request.analysisType) {
        case 'performance':
          insights = await this.generatePerformanceInsights(data, metrics)
          break
        case 'predictive':
          predictions = this.analyticsEngine.generatePredictions(data)
          insights = await this.generatePredictiveInsights(predictions)
          break
        case 'comparative':
          const teamData = await this.analyticsEngine.performComparativeAnalysis(request, userId)
          insights = await this.generateComparativeInsights(teamData)
          benchmarks = this.generateBenchmarks(teamData)
          break
        case 'comprehensive':
          // Full analysis
          insights = await this.generateComprehensiveInsights(data, metrics)
          predictions = this.analyticsEngine.generatePredictions(data)
          recommendations = this.analyticsEngine.generateRecommendations(data, metrics)
          const teamPerformance = await this.analyticsEngine.performComparativeAnalysis(request, userId)
          benchmarks = this.generateBenchmarks(teamPerformance)
          riskFactors = this.generateRiskFactors(data, predictions)
          trends = this.generateTrends(data)
          break
      }

      // Generate AI-powered summary
      const summary = await this.generateAISummary(insights, metrics, request.analysisType)

      return {
        summary,
        insights,
        predictions,
        recommendations,
        benchmarks,
        riskFactors,
        trends,
        metadata: {
          analysis_type: request.analysisType,
          time_range: request.timeRange,
          generated_at: new Date(),
          data_points_analyzed: data.objectives.length + data.initiatives.length + data.activities.length,
          confidence_score: this.calculateOverallConfidence(insights)
        }
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate performance-focused insights
   */
  private async generatePerformanceInsights(data: any, metrics: PerformanceMetrics): Promise<Insight[]> {
    const insights: Insight[] = []

    // Overall performance insight
    const performanceLevel = metrics.completion_rate > 80 ? 'excelente' :
                           metrics.completion_rate > 60 ? 'bueno' :
                           metrics.completion_rate > 40 ? 'regular' : 'bajo'

    const performanceInsight = await this.generateAIInsight({
      type: 'performance',
      title: `Rendimiento General: ${performanceLevel.charAt(0).toUpperCase() + performanceLevel.slice(1)}`,
      context: {
        completion_rate: metrics.completion_rate,
        average_progress: metrics.average_progress,
        total_objectives: metrics.total_objectives,
        overdue_objectives: metrics.overdue_objectives
      },
      prompt: `Analiza el rendimiento organizacional con una tasa de finalización del ${metrics.completion_rate.toFixed(1)}% y progreso promedio de ${metrics.average_progress.toFixed(1)}%. Proporciona un insight específico y actionable.`
    })

    insights.push(performanceInsight)

    // Velocity insight
    if (metrics.velocity < 1) {
      const velocityInsight = await this.generateAIInsight({
        type: 'performance',
        title: 'Velocidad de Progreso Requiere Atención',
        context: { velocity: metrics.velocity, efficiency: metrics.efficiency_score },
        prompt: `La velocidad de progreso es de ${metrics.velocity.toFixed(2)} puntos por día, lo cual es bajo. Explica las implicaciones y sugiere mejoras específicas.`
      })
      insights.push(velocityInsight)
    }

    // Overdue objectives insight
    if (metrics.overdue_objectives > 0) {
      const overdueInsight = await this.generateAIInsight({
        type: 'risk',
        title: 'Objetivos Vencidos Requieren Intervención',
        context: { overdue_count: metrics.overdue_objectives, total: metrics.total_objectives },
        prompt: `Hay ${metrics.overdue_objectives} objetivos vencidos de un total de ${metrics.total_objectives}. Analiza el impacto y proporciona recomendaciones específicas.`
      })
      insights.push(overdueInsight)
    }

    return insights
  }

  /**
   * Generate predictive insights from predictions data
   */
  private async generatePredictiveInsights(predictions: any[]): Promise<Insight[]> {
    const insights: Insight[] = []

    const highRiskObjectives = predictions.filter(pred => pred.probability < 60)
    const successfulObjectives = predictions.filter(pred => pred.probability > 80)

    if (highRiskObjectives.length > 0) {
      const riskInsight = await this.generateAIInsight({
        type: 'prediction',
        title: 'Objetivos en Riesgo de No Completarse',
        context: {
          risk_count: highRiskObjectives.length,
          total_predictions: predictions.length,
          avg_probability: highRiskObjectives.reduce((sum, pred) => sum + pred.probability, 0) / highRiskObjectives.length
        },
        prompt: `${highRiskObjectives.length} objetivos tienen baja probabilidad de completarse exitosamente. Analiza las causas principales y proporciona estrategias de mitigación.`
      })
      insights.push(riskInsight)
    }

    if (successfulObjectives.length > 0) {
      const successInsight = await this.generateAIInsight({
        type: 'opportunity',
        title: 'Objetivos con Alta Probabilidad de Éxito',
        context: {
          success_count: successfulObjectives.length,
          total_predictions: predictions.length
        },
        prompt: `${successfulObjectives.length} objetivos muestran alta probabilidad de éxito. Identifica los factores de éxito que pueden replicarse en otros objetivos.`
      })
      insights.push(successInsight)
    }

    return insights
  }

  /**
   * Generate comparative insights between teams
   */
  private async generateComparativeInsights(teamData: TeamPerformanceData[]): Promise<Insight[]> {
    const insights: Insight[] = []

    // Find best and worst performing teams
    const sortedTeams = teamData.sort((a, b) => b.metrics.completion_rate - a.metrics.completion_rate)
    const bestTeam = sortedTeams[0]
    const worstTeam = sortedTeams[sortedTeams.length - 1]

    if (sortedTeams.length > 1) {
      const comparisonInsight = await this.generateAIInsight({
        type: 'trend',
        title: 'Análisis Comparativo de Equipos',
        context: {
          best_team: bestTeam.department,
          best_rate: bestTeam.metrics.completion_rate,
          worst_team: worstTeam.department,
          worst_rate: worstTeam.metrics.completion_rate,
          performance_gap: bestTeam.metrics.completion_rate - worstTeam.metrics.completion_rate
        },
        prompt: `Analiza la diferencia de rendimiento entre ${bestTeam.department} (${bestTeam.metrics.completion_rate.toFixed(1)}%) y ${worstTeam.department} (${worstTeam.metrics.completion_rate.toFixed(1)}%). Identifica factores clave y oportunidades de mejora.`
      })
      insights.push(comparisonInsight)
    }

    // Team trend analysis
    const improvingTeams = teamData.filter(team => team.trend_analysis.progress_trend === 'positive')
    const decliningTeams = teamData.filter(team => team.trend_analysis.progress_trend === 'negative')

    if (improvingTeams.length > 0) {
      const trendInsight = await this.generateAIInsight({
        type: 'opportunity',
        title: 'Equipos con Tendencia Positiva',
        context: { improving_teams: improvingTeams.map(t => t.department) },
        prompt: `Los equipos ${improvingTeams.map(t => t.department).join(', ')} muestran tendencias positivas. Analiza qué factores están impulsando este crecimiento.`
      })
      insights.push(trendInsight)
    }

    if (decliningTeams.length > 0) {
      const declineInsight = await this.generateAIInsight({
        type: 'risk',
        title: 'Equipos Requieren Atención',
        context: { declining_teams: decliningTeams.map(t => t.department) },
        prompt: `Los equipos ${decliningTeams.map(t => t.department).join(', ')} muestran tendencias negativas. Identifica posibles causas y estrategias de recuperación.`
      })
      insights.push(declineInsight)
    }

    return insights
  }

  /**
   * Generate comprehensive insights combining all analysis types
   */
  private async generateComprehensiveInsights(data: any, metrics: PerformanceMetrics): Promise<Insight[]> {
    const insights: Insight[] = []

    // Strategic overview insight
    const strategicInsight = await this.generateAIInsight({
      type: 'trend',
      title: 'Panorama Estratégico Organizacional',
      context: {
        total_objectives: metrics.total_objectives,
        completion_rate: metrics.completion_rate,
        efficiency_score: metrics.efficiency_score,
        departments: [...new Set(data.objectives.map((obj: any) => obj.department || 'General'))]
      },
      prompt: `Proporciona un análisis estratégico integral basado en ${metrics.total_objectives} objetivos con ${metrics.completion_rate.toFixed(1)}% de finalización y ${metrics.efficiency_score.toFixed(1)}% de eficiencia. Identifica patrones organizacionales clave.`
    })
    insights.push(strategicInsight)

    // Resource optimization insight
    const resourceInsight = await this.generateAIInsight({
      type: 'opportunity',
      title: 'Optimización de Recursos',
      context: {
        average_progress: metrics.average_progress,
        velocity: metrics.velocity,
        active_objectives: metrics.in_progress_objectives
      },
      prompt: `Con ${metrics.in_progress_objectives} objetivos activos y velocidad de ${metrics.velocity.toFixed(2)} puntos/día, analiza oportunidades de optimización de recursos y procesos.`
    })
    insights.push(resourceInsight)

    return insights
  }

  /**
   * Generate AI-powered insight using the gateway client
   */
  private async generateAIInsight(params: {
    type: string
    title: string
    context: Record<string, any>
    prompt: string
  }): Promise<Insight> {
    try {
      const aiPrompt = `
Eres un consultor senior especializado en análisis de OKRs y performance organizacional.

Contexto: ${JSON.stringify(params.context, null, 2)}

Consulta: ${params.prompt}

Proporciona un insight profesional que incluya:
1. Análisis de la situación actual (2-3 oraciones)
2. Implicaciones para la organización (1-2 oraciones)
3. Recomendación específica y actionable (1-2 oraciones)

Mantén un tono profesional pero accesible. Usa terminología de negocio apropiada en español.
Limita la respuesta a máximo 150 palabras.
`

      const result = await aiClient.generateText({
        model: 'analysis', // Use analysis model for complex reasoning
        prompt: aiPrompt,
        maxTokens: 300,
        temperature: 0.7,
        providerOptions: {
          order: ['anthropic', 'openai'], // Anthropic first for analysis
          timeout: 10000
        }
      })

      // Calculate confidence and impact based on context
      const confidence = this.calculateInsightConfidence(params.context)
      const impact = this.calculateInsightImpact(params.type, params.context)

      return {
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: params.title,
        content: result.text,
        type: params.type as any,
        priority: impact > 80 ? 'high' : impact > 60 ? 'medium' : 'low',
        confidence,
        impact,
        category: this.mapTypeToCategory(params.type),
        metadata: {
          model_used: 'claude-3-sonnet',
          tokens_used: result.usage?.totalTokens,
          generated_at: new Date(),
          context_summary: params.context
        }
      }
    } catch (error) {
      // Fallback to static insight if AI fails
      return this.generateFallbackInsight(params)
    }
  }

  /**
   * Generate AI-powered executive summary
   */
  private async generateAISummary(insights: Insight[], metrics: PerformanceMetrics, analysisType: string): Promise<string> {
    try {
      const summaryPrompt = `
Eres un analista ejecutivo preparando un resumen para la alta dirección.

Tipo de análisis: ${analysisType}
Métricas clave:
- Tasa de finalización: ${metrics.completion_rate.toFixed(1)}%
- Progreso promedio: ${metrics.average_progress.toFixed(1)}%
- Objetivos totales: ${metrics.total_objectives}
- Objetivos vencidos: ${metrics.overdue_objectives}

Insights generados: ${insights.length}
Prioridades altas: ${insights.filter(i => i.priority === 'high').length}

Crea un resumen ejecutivo conciso (máximo 100 palabras) que:
1. Destaque el estado general del performance
2. Identifique las 2 oportunidades principales
3. Mencione el riesgo más crítico si existe

Usa un tono directivo y enfócate en actionabilidad.
`

      const result = await aiClient.generateText({
        model: 'text', // Use budget model for summary
        prompt: summaryPrompt,
        maxTokens: 200,
        temperature: 0.5,
        providerOptions: {
          order: ['openai', 'anthropic'],
          timeout: 8000
        }
      })

      return result.text
    } catch (error) {
      // Fallback summary
      return this.generateFallbackSummary(metrics, analysisType)
    }
  }

  /**
   * Helper methods
   */

  private generateBenchmarks(teamData: TeamPerformanceData[]): any[] {
    if (teamData.length === 0) return []

    const avgCompletion = teamData.reduce((sum, team) => sum + team.metrics.completion_rate, 0) / teamData.length
    const avgProgress = teamData.reduce((sum, team) => sum + team.metrics.average_progress, 0) / teamData.length

    return [
      {
        metric: 'Tasa de Finalización',
        current_value: avgCompletion,
        benchmark_value: 75, // Industry standard
        comparison: avgCompletion > 75 ? 'above' : avgCompletion < 75 ? 'below' : 'at',
        improvement_potential: Math.max(0, 75 - avgCompletion)
      },
      {
        metric: 'Progreso Promedio',
        current_value: avgProgress,
        benchmark_value: 70, // Industry standard
        comparison: avgProgress > 70 ? 'above' : avgProgress < 70 ? 'below' : 'at',
        improvement_potential: Math.max(0, 70 - avgProgress)
      }
    ]
  }

  private generateRiskFactors(data: any, predictions: any[]): any[] {
    const risks = []

    const highRiskPredictions = predictions.filter(pred => pred.probability < 50)
    if (highRiskPredictions.length > 0) {
      risks.push({
        id: 'high_risk_objectives',
        title: 'Objetivos con Alta Probabilidad de Fallo',
        description: `${highRiskPredictions.length} objetivos tienen menos del 50% de probabilidad de completarse exitosamente`,
        probability: 85,
        impact: 90,
        mitigation_suggestions: [
          'Reasignar recursos críticos a objetivos en riesgo',
          'Implementar checkpoints semanales',
          'Revisar alcance y expectativas'
        ],
        affected_okr_ids: highRiskPredictions.map(pred => pred.objective_id)
      })
    }

    return risks
  }

  private generateTrends(data: any): any[] {
    const trends = []

    // Simple trend analysis based on recent progress
    const recentObjectives = data.objectives.filter((obj: any) => {
      const daysSinceStart = (Date.now() - new Date(obj.start_date).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceStart >= 7 // At least a week old
    })

    if (recentObjectives.length > 0) {
      const avgProgress = recentObjectives.reduce((sum: number, obj: any) => sum + obj.progress, 0) / recentObjectives.length

      trends.push({
        metric: 'Progreso General',
        direction: avgProgress > 60 ? 'increasing' : avgProgress < 40 ? 'decreasing' : 'stable',
        velocity: avgProgress / 30, // Simplified velocity calculation
        confidence: 75,
        timeframe: '30 días'
      })
    }

    return trends
  }

  private calculateInsightConfidence(context: Record<string, any>): number {
    // Base confidence on amount of data available
    let confidence = 50

    if (context.total_objectives && context.total_objectives > 10) confidence += 20
    if (context.completion_rate !== undefined) confidence += 15
    if (context.velocity !== undefined) confidence += 10
    if (context.efficiency_score !== undefined) confidence += 5

    return Math.min(100, confidence)
  }

  private calculateInsightImpact(type: string, context: Record<string, any>): number {
    let impact = 50

    switch (type) {
      case 'risk':
        impact = 85
        break
      case 'opportunity':
        impact = 75
        break
      case 'prediction':
        impact = 70
        break
      case 'performance':
        impact = 65
        break
      default:
        impact = 60
    }

    // Adjust based on scope
    if (context.total_objectives && context.total_objectives > 20) impact += 10
    if (context.overdue_objectives && context.overdue_objectives > 0) impact += 15

    return Math.min(100, impact)
  }

  private mapTypeToCategory(type: string): string {
    const mapping: Record<string, string> = {
      'performance': 'rendimiento',
      'risk': 'riesgos',
      'opportunity': 'oportunidades',
      'prediction': 'predicciones',
      'trend': 'tendencias'
    }
    return mapping[type] || 'general'
  }

  private calculateOverallConfidence(insights: Insight[]): number {
    if (insights.length === 0) return 0
    return insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
  }

  private generateFallbackInsight(params: any): Insight {
    return {
      id: `fallback_${Date.now()}`,
      title: params.title,
      content: 'Los datos analizados muestran patrones importantes que requieren atención. Se recomienda revisar las métricas actuales y implementar mejoras incrementales basadas en las mejores prácticas de la industria.',
      type: params.type,
      priority: 'medium',
      confidence: 60,
      impact: 70,
      category: this.mapTypeToCategory(params.type),
      metadata: { fallback: true }
    }
  }

  private generateFallbackSummary(metrics: PerformanceMetrics, analysisType: string): string {
    const performance = metrics.completion_rate > 70 ? 'sólido' : metrics.completion_rate > 50 ? 'moderado' : 'requiere mejora'
    return `El análisis ${analysisType} revela un rendimiento ${performance} con ${metrics.completion_rate.toFixed(1)}% de finalización. ${metrics.overdue_objectives > 0 ? `Existen ${metrics.overdue_objectives} objetivos vencidos que requieren atención inmediata.` : 'Los objetivos están en progreso general.'} Se recomienda enfocar esfuerzos en optimizar procesos y acelerar el progreso en áreas críticas.`
  }
}

/**
 * Cached and rate-limited insights generation functions
 */

// Create cached version of the insights generator
export const generateInsightsWithCache = withCache(
  async (request: AnalyticsRequest, userId: string) => {
    const engine = new (await import('./analytics-engine')).AnalyticsEngine()
    const generator = new InsightsGenerator(engine)
    return generator.generateInsights(request, userId)
  },
  CACHE_PRESETS.ANALYTICS // Use analytics cache preset (longer TTL)
)

// Create rate-limited version
export const generateInsightsWithRateLimit = withRateLimit(
  generateInsightsWithCache,
  getRateLimitConfig('analytics')
)

// Main export with error handling
export const generateAnalyticsInsights = withErrorHandling(
  generateInsightsWithRateLimit,
  'analytics-insights'
)