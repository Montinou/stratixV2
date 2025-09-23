import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"

interface InsightContext {
  role: UserRole
  objectives: Objective[]
  initiatives: Initiative[]
  activities: Activity[]
  department?: string
}

export async function generateDailyInsights(context: InsightContext): Promise<string> {
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

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 400,
    })

    return text
  } catch (error) {
    console.error("Error generating AI insights:", error)
    return "No se pudieron generar insights en este momento. Por favor, inténtalo más tarde."
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
      model: openai("gpt-4o-mini"),
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
  objectives: Objective[]
  department: string
  teamSize: number
}): Promise<string> {
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

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 400,
    })

    return text
  } catch (error) {
    console.error("Error generating team insights:", error)
    return "No se pudieron generar insights del equipo en este momento."
  }
}
