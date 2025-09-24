import { generateText, gateway } from "ai"

// Create Vercel AI Gateway provider with budget-focused models
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Budget-focused model configuration
const BUDGET_MODEL_PRIMARY = "openai/gpt-4o-mini"
const BUDGET_MODEL_FALLBACK = "anthropic/claude-3-haiku-20240307"

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

export async function generateOKRSuggestions(request: SuggestionRequest): Promise<AIResponse> {
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

    const { text } = await generateText({
      model: ai(BUDGET_MODEL_PRIMARY),
      prompt,
      maxTokens: 1000,
      temperature: 0.7,
    })

    // Parse the JSON response
    const suggestions = JSON.parse(text.trim()) as AIResponse

    // Validate the response structure
    if (!suggestions.initiatives || !suggestions.activities || !suggestions.keyMetrics) {
      throw new Error("Invalid AI response structure")
    }

    return suggestions
  } catch (error) {
    console.error("Error generating OKR suggestions:", error)

    // Return fallback suggestions
    return {
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
  }
}

export async function generateSmartSuggestions(input: string, context: SuggestionRequest): Promise<string[]> {
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

    const { text } = await generateText({
      model: ai(BUDGET_MODEL_PRIMARY),
      prompt,
      maxTokens: 300,
      temperature: 0.7,
    })

    const suggestions = JSON.parse(text.trim()) as string[]
    return Array.isArray(suggestions) ? suggestions : []
  } catch (error) {
    console.error("Error generating smart suggestions:", error)
    return []
  }
}
