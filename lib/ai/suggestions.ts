import { aiClient } from './gateway-client'
import { withCache, CACHE_PRESETS } from './cache-layer'
import { withRateLimit, getRateLimitConfig } from './rate-limiter'
import { withErrorHandling } from './error-handler'

// Fallback suggestions for when AI fails
const FALLBACK_OKR_SUGGESTIONS: AIResponse = {
  initiatives: [
    "Definir métricas de seguimiento específicas",
    "Establecer reuniones de revisión periódicas",
    "Crear plan de comunicación del progreso",
  ],
  activities: [
    "Configurar dashboard de métricas",
    "Programar revisiones semanales",
    "Documentar procesos clave",
    "Establecer puntos de control mensuales",
    "Crear reportes de progreso",
  ],
  keyMetrics: ["Porcentaje de progreso semanal", "Número de hitos completados", "Satisfacción del equipo"],
  timeline: "Se recomienda un período de 3-6 meses con revisiones mensuales",
  risks: [
    "Falta de recursos: Asegurar asignación adecuada desde el inicio",
    "Cambios de prioridades: Mantener comunicación constante con stakeholders",
  ],
}

interface SuggestionRequest {
  title?: string
  description?: string
  department?: string
  userRole: "corporativo" | "gerente" | "empleado"
  companyContext?: string
}

interface AIResponse {
  initiatives: string[]
  activities: string[]
  keyMetrics: string[]
  timeline: string
  risks: string[]
}

const generateOKRSuggestionsBase = async (request: SuggestionRequest): Promise<AIResponse> => {
  try {
    const prompt = `
Como experto en OKRs (Objectives and Key Results), analiza la siguiente información y proporciona sugerencias específicas:

CONTEXTO:
- Título del objetivo: ${request.title || "No especificado"}
- Descripción: ${request.description || "No especificada"}
- Departamento: ${request.department || "No especificado"}
- Rol del usuario: ${request.userRole}
- Contexto de la empresa: ${request.companyContext || "Empresa general"}

INSTRUCCIONES:
Proporciona sugerencias prácticas y específicas en formato JSON con la siguiente estructura:
{
  "initiatives": ["3-5 iniciativas específicas que apoyen este objetivo"],
  "activities": ["5-7 actividades concretas y medibles"],
  "keyMetrics": ["3-4 métricas clave para medir el progreso"],
  "timeline": "Sugerencia de cronograma realista",
  "risks": ["2-3 riesgos principales y cómo mitigarlos"]
}

CONSIDERACIONES:
- Las sugerencias deben ser específicas para el departamento mencionado
- Incluir métricas cuantificables cuando sea posible
- Considerar el rol del usuario (${request.userRole}) para el nivel de detalle
- Proporcionar actividades que sean realistas y alcanzables
- Incluir tanto aspectos estratégicos como operativos

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
    `

    const text = await aiClient.generateText(prompt, {
      maxTokens: 1000,
      temperature: 0.7
    })

    // Parse the JSON response
    const suggestions = JSON.parse(text.trim()) as AIResponse

    // Validate the response structure
    if (!suggestions.initiatives || !suggestions.activities || !suggestions.keyMetrics) {
      console.warn('Invalid AI response structure, using fallback')
      return FALLBACK_OKR_SUGGESTIONS
    }

    return suggestions
  } catch (error) {
    console.error("Error generating OKR suggestions:", error)
    // Return fallback suggestions instead of throwing
    return FALLBACK_OKR_SUGGESTIONS
  }
}

export const generateOKRSuggestions = withCache(
  'generateOKRSuggestions',
  withRateLimit(
    'generateOKRSuggestions',
    generateOKRSuggestionsBase,
    getRateLimitConfig(),
    (request: SuggestionRequest) => `okr_${request.userRole}_${request.department || 'general'}`
  ),
  CACHE_PRESETS.suggestions
)

const generateSmartSuggestionsBase = async (input: string, context: SuggestionRequest): Promise<string[]> => {
  try {
    const prompt = `
Basándote en el texto: "${input}" y el contexto del departamento "${context.department}",
genera 3-5 sugerencias inteligentes para completar o mejorar este objetivo.

Las sugerencias deben ser:
- Específicas y accionables
- Relevantes para el departamento ${context.department}
- Apropiadas para el rol ${context.userRole}
- Enfocadas en resultados medibles

Responde con un array JSON de strings, ejemplo: ["sugerencia 1", "sugerencia 2", "sugerencia 3"]
    `

    const text = await aiClient.generateText(prompt, {
      maxTokens: 300,
      temperature: 0.7
    })

    const suggestions = JSON.parse(text.trim()) as string[]
    return Array.isArray(suggestions) ? suggestions : []
  } catch (error) {
    console.error("Error generating smart suggestions:", error)
    // Return fallback suggestions based on context
    return [
      `Establecer métricas específicas para el departamento ${context.department}`,
      `Crear plan de seguimiento semanal para ${context.userRole}`,
      "Definir hitos intermedios medibles",
      "Asignar responsables y fechas límite",
      "Documentar proceso y lecciones aprendidas"
    ]
  }
}

export const generateSmartSuggestions = withCache(
  'generateSmartSuggestions',
  withRateLimit(
    'generateSmartSuggestions',
    generateSmartSuggestionsBase,
    getRateLimitConfig(),
    (input: string, context: SuggestionRequest) => `smart_${context.userRole}_${input.substring(0, 50)}`
  ),
  CACHE_PRESETS.suggestions
)
