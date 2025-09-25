import { generateText, gateway } from "ai"
import type { UserRole } from "@/lib/types/okr"

// Create Vercel AI Gateway provider with budget-focused models
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Budget-focused model configuration
const BUDGET_MODEL_PRIMARY = "openai/gpt-4o-mini"
const BUDGET_MODEL_FALLBACK = "anthropic/claude-3-haiku-20240307"

interface AnalyticsData {
  totalObjectives: number
  totalInitiatives: number
  totalActivities: number
  averageProgress: number
  completionRate: number
  onTrackPercentage: number
  statusDistribution: Record<string, number>
}

interface InsightContext {
  role: UserRole
  analytics: AnalyticsData
  department?: string
}

// In-memory cache for AI insights with TTL
const insightsCache = new Map<string, { data: string, timestamp: number, ttl: number }>()

// Performance monitoring
interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  model: string
  tokens?: number
  cacheHit?: boolean
}

const performanceLog: PerformanceMetrics[] = []

// Cache utilities
function getCacheKey(context: InsightContext, type: 'daily' | 'team'): string {
  const { role, analytics, department } = context
  return `${type}-${role}-${department || 'none'}-${analytics.totalObjectives}-${analytics.averageProgress}-${analytics.completionRate}`
}

function getCachedInsight(key: string): string | null {
  const cached = insightsCache.get(key)
  if (!cached) return null
  
  if (Date.now() > cached.timestamp + cached.ttl) {
    insightsCache.delete(key)
    return null
  }
  
  return cached.data
}

function setCachedInsight(key: string, data: string, ttlMinutes: number = 30): void {
  insightsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000
  })
}

// Performance monitoring utilities
function startPerformanceTracking(model: string): PerformanceMetrics {
  return {
    startTime: Date.now(),
    model
  }
}

function endPerformanceTracking(metrics: PerformanceMetrics, tokens?: number, cacheHit?: boolean): void {
  metrics.endTime = Date.now()
  metrics.duration = metrics.endTime - metrics.startTime
  metrics.tokens = tokens
  metrics.cacheHit = cacheHit
  
  performanceLog.push(metrics)
  
  // Keep only last 100 entries
  if (performanceLog.length > 100) {
    performanceLog.shift()
  }
  
  console.log(`AI Insight Performance: ${metrics.duration}ms, model: ${metrics.model}, tokens: ${tokens || 'unknown'}, cache: ${cacheHit ? 'HIT' : 'MISS'}`)
}

export function getInsightsPerformanceMetrics(): PerformanceMetrics[] {
  return [...performanceLog]
}

export async function generateDailyInsights(context: InsightContext): Promise<string> {
  const { role, analytics, department } = context

  // Check cache first
  const cacheKey = getCacheKey(context, 'daily')
  const cachedInsight = getCachedInsight(cacheKey)
  if (cachedInsight) {
    // Log cache hit for performance monitoring
    const metrics = startPerformanceTracking(BUDGET_MODEL_PRIMARY)
    endPerformanceTracking(metrics, 0, true)
    return cachedInsight
  }

  const metrics = startPerformanceTracking(BUDGET_MODEL_PRIMARY)

  // Use analytics data directly from API
  const {
    totalObjectives,
    totalInitiatives,
    totalActivities,
    averageProgress,
    completionRate,
    onTrackPercentage,
    statusDistribution
  } = analytics

  // Calculate derived metrics
  const completedObjectives = Math.round((totalObjectives * completionRate) / 100)
  const onTrackObjectives = Math.round((totalObjectives * onTrackPercentage) / 100)
  const inProgressObjectives = statusDistribution['in_progress'] || statusDistribution['en_progreso'] || 0
  const overdueObjectives = statusDistribution['overdue'] || statusDistribution['vencido'] || 0

  const prompt = `
    Eres un asistente de IA especializado en análisis de OKRs (Objectives and Key Results). 
    Genera insights diarios personalizados para un usuario con rol "${role}" ${department ? `del departamento "${department}"` : ""}.

    Métricas analíticas actuales:
    - Total de objetivos: ${totalObjectives}
    - Objetivos completados: ${completedObjectives} (${completionRate}% tasa de finalización)
    - Progreso promedio: ${averageProgress}%
    - Objetivos en buen camino (≥70%): ${onTrackObjectives} (${onTrackPercentage}%)
    - Objetivos en progreso: ${inProgressObjectives}
    - Objetivos vencidos: ${overdueObjectives}
    - Total de iniciativas: ${totalInitiatives}
    - Total de actividades: ${totalActivities}

    Distribución de estados: ${Object.entries(statusDistribution).map(([status, count]) => `${status}: ${count}`).join(', ')}

    Contexto del rol:
    ${role === "corporate" || role === "corporativo" ? "Como usuario corporativo, tienes acceso a todos los datos de la organización y debes pensar estratégicamente." : ""}
    ${role === "manager" || role === "gerente" ? "Como gerente, supervisas el rendimiento de tu equipo y departamento." : ""}
    ${role === "employee" || role === "empleado" ? "Como empleado, te enfocas en tus objetivos individuales y contribución al equipo." : ""}

    Proporciona:
    1. Un resumen del estado actual (2-3 oraciones)
    2. 2-3 insights específicos basados en las métricas analíticas
    3. 2-3 recomendaciones accionables adaptadas al rol
    4. Una predicción o tendencia si es relevante

    Mantén un tono profesional pero motivador. Sé específico y práctico.
    Responde en español y limita la respuesta a 300 palabras máximo.
  `

  try {
    const result = await generateText({
      model: ai(BUDGET_MODEL_PRIMARY),
      prompt,
      maxTokens: 400,
    })

    // Cache the result for 30 minutes
    setCachedInsight(cacheKey, result.text, 30)
    
    // Log performance metrics
    endPerformanceTracking(metrics, result.usage?.totalTokens, false)

    return result.text
  } catch (error) {
    console.error("Error generating AI insights:", error)
    
    // Try fallback model
    try {
      const fallbackResult = await generateText({
        model: ai(BUDGET_MODEL_FALLBACK),
        prompt,
        maxTokens: 400,
      })

      // Cache fallback result for shorter time
      setCachedInsight(cacheKey, fallbackResult.text, 15)
      
      // Log fallback performance
      endPerformanceTracking(metrics, fallbackResult.usage?.totalTokens, false)
      
      return fallbackResult.text
    } catch (fallbackError) {
      console.error("Fallback model also failed:", fallbackError)
      endPerformanceTracking(metrics, 0, false)
      
      return "No se pudieron generar insights en este momento. Por favor, inténtalo más tarde."
    }
  }
}

export async function generateObjectiveRecommendations(objective: Objective): Promise<string> {
  const prompt = `
    Analiza este objetivo y proporciona recomendaciones específicas para mejorarlo:

    Objetivo: "${objective.title}"
    Descripción: "${objective.description || "Sin descripción"}"
    Progreso actual: ${objective.progress}%
    Estado: ${objective.status}
    Departamento: ${objective.department || "No especificado"}
    Fecha de inicio: ${objective.start_date}
    Fecha de fin: ${objective.end_date}

    Proporciona:
    1. Análisis del progreso actual
    2. Identificación de posibles obstáculos
    3. 3 recomendaciones específicas para acelerar el progreso
    4. Sugerencias para mejorar la definición del objetivo si es necesario

    Responde en español, sé conciso y práctico. Máximo 250 palabras.
  `

  try {
    const { text } = await generateText({
      model: ai(BUDGET_MODEL_PRIMARY),
      prompt,
      maxTokens: 350,
    })

    return text
  } catch (error) {
    console.error("Error generating objective recommendations:", error)
    return "No se pudieron generar recomendaciones en este momento."
  }
}

export async function generateTeamInsights(teamData: {
  analytics: AnalyticsData
  department: string
  teamSize: number
}): Promise<string> {
  const { analytics, department, teamSize } = teamData

  // Create context for caching and performance monitoring
  const context: InsightContext = {
    role: "manager",
    analytics,
    department
  }

  // Check cache first
  const cacheKey = getCacheKey(context, 'team')
  const cachedInsight = getCachedInsight(cacheKey)
  if (cachedInsight) {
    // Log cache hit for performance monitoring
    const metrics = startPerformanceTracking(BUDGET_MODEL_PRIMARY)
    endPerformanceTracking(metrics, 0, true)
    return cachedInsight
  }

  const metrics = startPerformanceTracking(BUDGET_MODEL_PRIMARY)

  const {
    totalObjectives,
    totalInitiatives,
    totalActivities,
    averageProgress,
    completionRate,
    onTrackPercentage,
    statusDistribution
  } = analytics

  // Calculate team-specific metrics
  const completedObjectives = Math.round((totalObjectives * completionRate) / 100)
  const onTrackObjectives = Math.round((totalObjectives * onTrackPercentage) / 100)
  const inProgressObjectives = statusDistribution['in_progress'] || statusDistribution['en_progreso'] || 0
  const overdueObjectives = statusDistribution['overdue'] || statusDistribution['vencido'] || 0

  // Calculate objectives per team member
  const objectivesPerMember = teamSize > 0 ? (totalObjectives / teamSize).toFixed(1) : '0'

  const prompt = `
    Analiza el rendimiento del equipo del departamento "${department}" con ${teamSize} miembros:

    Métricas analíticas del equipo:
    - Objetivos totales: ${totalObjectives} (${objectivesPerMember} por miembro)
    - Tasa de finalización: ${completionRate}%
    - Progreso promedio: ${averageProgress}%
    - Objetivos en buen camino: ${onTrackObjectives} (${onTrackPercentage}%)
    - Objetivos completados: ${completedObjectives}
    - Objetivos en progreso: ${inProgressObjectives}
    - Objetivos vencidos: ${overdueObjectives}
    - Total de iniciativas: ${totalInitiatives}
    - Total de actividades: ${totalActivities}
    - Tamaño del equipo: ${teamSize}

    Distribución de estados: ${Object.entries(statusDistribution).map(([status, count]) => `${status}: ${count}`).join(', ')}

    Como gerente o líder corporativo, proporciona:
    1. Evaluación del rendimiento del equipo basada en métricas analíticas
    2. Comparación con benchmarks típicos (considera que 70%+ progreso es bueno, 80%+ completition rate es excelente)
    3. Identificación de fortalezas y áreas de mejora específicas
    4. Recomendaciones para optimizar el rendimiento del equipo
    5. Sugerencias para motivar y apoyar al equipo según los datos

    Si hay objetivos vencidos, enfócate en estrategias de recuperación.
    Si el progreso promedio es bajo (<60%), sugiere intervenciones específicas.
    Si la tasa de finalización es alta (>80%), reconoce el éxito e identifica cómo mantenerlo.

    Responde en español, enfócate en insights accionables. Máximo 300 palabras.
  `

  try {
    const result = await generateText({
      model: ai(BUDGET_MODEL_PRIMARY),
      prompt,
      maxTokens: 400,
    })

    // Cache the result for 45 minutes (team insights change less frequently)
    setCachedInsight(cacheKey, result.text, 45)
    
    // Log performance metrics
    endPerformanceTracking(metrics, result.usage?.totalTokens, false)

    return result.text
  } catch (error) {
    console.error("Error generating team insights:", error)
    
    // Try fallback model
    try {
      const fallbackResult = await generateText({
        model: ai(BUDGET_MODEL_FALLBACK),
        prompt,
        maxTokens: 400,
      })

      // Cache fallback result for shorter time
      setCachedInsight(cacheKey, fallbackResult.text, 20)
      
      // Log fallback performance
      endPerformanceTracking(metrics, fallbackResult.usage?.totalTokens, false)
      
      return fallbackResult.text
    } catch (fallbackError) {
      console.error("Fallback model also failed:", fallbackError)
      endPerformanceTracking(metrics, 0, false)
      
      return "No se pudieron generar insights del equipo en este momento."
    }
  }
}
