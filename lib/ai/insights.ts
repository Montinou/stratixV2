import { aiClient } from './gateway-client'
import { withCache, CACHE_PRESETS } from './cache-layer'
import { withRateLimit, getRateLimitConfig } from './rate-limiter'
import { withErrorHandling } from './error-handler'
import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"

// Fallback responses for when AI fails
const FALLBACK_INSIGHTS = {
  corporativo: "Los datos muestran un progreso general estable en la organización. Se recomienda revisar los objetivos con menor progreso y proporcionar el apoyo necesario a los equipos.",
  gerente: "Su equipo muestra un rendimiento consistente. Considere implementar reuniones de seguimiento más frecuentes para acelerar el progreso en objetivos clave.",
  empleado: "Sus objetivos están en desarrollo. Mantenga el enfoque en las actividades planificadas y comunique cualquier obstáculo a su supervisor."
}

interface InsightContext {
  role: UserRole
  objectives: Objective[]
  initiatives: Initiative[]
  activities: Activity[]
  department?: string
}

// Create cached and rate-limited version of the base function
const generateDailyInsightsBase = async (context: InsightContext): Promise<string> => {
  try {
    const { role, objectives, initiatives, activities, department } = context

    // Calculate key metrics
    const totalObjectives = objectives.length
    const completedObjectives = objectives.filter((obj) => obj.status === "completado").length
    const averageProgress =
      objectives.length > 0 ? Math.round(objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length) : 0

    const overdue = objectives.filter((obj) => {
      const endDate = new Date(obj.end_date)
      const today = new Date()
      return endDate < today && obj.status !== "completado"
    }).length

    const onTrack = objectives.filter((obj) => obj.progress >= 70).length

    const prompt = `
      Eres un asistente de IA especializado en análisis de OKRs (Objectives and Key Results).
      Genera insights diarios personalizados para un usuario con rol "${role}" ${department ? `del departamento "${department}"` : ""}.

      Datos actuales:
      - Total de objetivos: ${totalObjectives}
      - Objetivos completados: ${completedObjectives}
      - Progreso promedio: ${averageProgress}%
      - Objetivos vencidos: ${overdue}
      - Objetivos en buen camino (≥70%): ${onTrack}
      - Total de iniciativas: ${initiatives.length}
      - Total de actividades: ${activities.length}

      Contexto del rol:
      ${role === "corporativo" ? "Como usuario corporativo, tienes acceso a todos los datos de la organización." : ""}
      ${role === "gerente" ? "Como gerente, supervisas el rendimiento de tu equipo y departamento." : ""}
      ${role === "empleado" ? "Como empleado, te enfocas en tus objetivos individuales y contribución al equipo." : ""}

      Proporciona:
      1. Un resumen del estado actual (2-3 oraciones)
      2. 2-3 insights específicos basados en los datos
      3. 2-3 recomendaciones accionables adaptadas al rol
      4. Una predicción o tendencia si es relevante

      Mantén un tono profesional pero motivador. Sé específico y práctico.
      Responde en español y limita la respuesta a 300 palabras máximo.
    `

    return await aiClient.generateText(prompt, {
      maxTokens: 400,
      temperature: 0.7
    })
  } catch (error) {
    console.error("Error generating daily insights:", error)
    // Return role-specific fallback
    return FALLBACK_INSIGHTS[context.role] || FALLBACK_INSIGHTS.empleado
  }
}

export const generateDailyInsights = withCache(
  'generateDailyInsights',
  withRateLimit(
    'generateDailyInsights',
    generateDailyInsightsBase,
    getRateLimitConfig(),
    (context: InsightContext) => `user_${context.role}_${context.department || 'general'}`
  ),
  CACHE_PRESETS.insights
)

const generateObjectiveRecommendationsBase = async (objective: Objective): Promise<string> => {
  try {
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

    return await aiClient.generateText(prompt, {
      maxTokens: 350,
      temperature: 0.7
    })
  } catch (error) {
    console.error("Error generating objective recommendations:", error)
    // Return generic fallback recommendations
    return `
Para mejorar el progreso de "${objective.title}":

1. **Análisis actual**: Con ${objective.progress}% de progreso, se requiere acelerar el ritmo de ejecución.

2. **Posibles obstáculos**: Verificar si existen dependencias bloqueantes, recursos insuficientes o falta de claridad en las tareas.

3. **Recomendaciones específicas**:
   - Establecer reuniones de seguimiento semanales
   - Dividir el objetivo en hitos más pequeños y medibles
   - Asignar responsables específicos para cada actividad

4. **Mejoras en definición**: Asegurar que el objetivo tenga métricas claras y fechas límite específicas para cada entregable.
    `.trim()
  }
}

export const generateObjectiveRecommendations = withCache(
  'generateObjectiveRecommendations',
  withRateLimit(
    'generateObjectiveRecommendations',
    generateObjectiveRecommendationsBase,
    getRateLimitConfig(),
    (objective: Objective) => `objective_${objective.id || 'unknown'}`
  ),
  CACHE_PRESETS.suggestions
)

const generateTeamInsightsBase = async (teamData: {
  objectives: Objective[]
  department: string
  teamSize: number
}): Promise<string> => {
  try {
    const { objectives, department, teamSize } = teamData

    const completionRate =
      objectives.length > 0
        ? Math.round((objectives.filter((obj) => obj.status === "completado").length / objectives.length) * 100)
        : 0

    const averageProgress =
      objectives.length > 0 ? Math.round(objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length) : 0

    const prompt = `
      Analiza el rendimiento del equipo del departamento "${department}" con ${teamSize} miembros:

      Métricas del equipo:
      - Objetivos totales: ${objectives.length}
      - Tasa de finalización: ${completionRate}%
      - Progreso promedio: ${averageProgress}%
      - Tamaño del equipo: ${teamSize}

      Como gerente o líder corporativo, proporciona:
      1. Evaluación del rendimiento del equipo
      2. Comparación con benchmarks típicos
      3. Identificación de fortalezas y áreas de mejora
      4. Recomendaciones para optimizar el rendimiento del equipo
      5. Sugerencias para motivar y apoyar al equipo

      Responde en español, enfócate en insights accionables. Máximo 300 palabras.
    `

    return await aiClient.generateText(prompt, {
      maxTokens: 400,
      temperature: 0.7
    })
  } catch (error) {
    console.error("Error generating team insights:", error)
    // Return fallback team insights
    const { objectives, department, teamSize } = teamData
    const completionRate = objectives.length > 0
      ? Math.round((objectives.filter((obj) => obj.status === "completado").length / objectives.length) * 100)
      : 0
    const averageProgress = objectives.length > 0
      ? Math.round(objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length)
      : 0

    return `
**Análisis del Equipo - ${department}**

**Rendimiento actual**: El equipo de ${teamSize} miembros muestra una tasa de finalización del ${completionRate}% y un progreso promedio del ${averageProgress}%.

**Evaluación**: ${averageProgress >= 70 ? 'El equipo está en buen camino' : averageProgress >= 40 ? 'Rendimiento moderado que requiere atención' : 'Se necesita intervención urgente para mejorar el rendimiento'}.

**Recomendaciones**:
- Implementar reuniones de seguimiento semanales
- Establecer mentorías entre miembros del equipo
- Revisar la distribución de cargas de trabajo
- Proporcionar recursos adicionales si es necesario

**Próximos pasos**: Enfocar esfuerzos en los objetivos con menor progreso y celebrar los logros alcanzados.
    `.trim()
  }
}

export const generateTeamInsights = withCache(
  'generateTeamInsights',
  withRateLimit(
    'generateTeamInsights',
    generateTeamInsightsBase,
    getRateLimitConfig(),
    (teamData) => `team_${teamData.department}_${teamData.teamSize}`
  ),
  CACHE_PRESETS.insights
)
