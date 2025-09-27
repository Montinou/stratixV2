import { type NextRequest } from "next/server"
import { stackServerApp } from "@/stack"
import { streamText, generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { CoreMessage } from 'ai'

export const runtime = 'edge'

// Sistema de mensajes OKR-específico
const SYSTEM_PROMPT = `Eres un asistente experto en OKRs (Objectives and Key Results) y gestión estratégica. Tu función es ayudar a usuarios empresariales a:

1. **Crear OKRs efectivos**: Objetivos claros, ambiciosos pero alcanzables
2. **Definir Key Results measurables**: Métricas específicas y cuantificables
3. **Alinear objetivos estratégicos**: Conectar OKRs individuales con metas empresariales
4. **Seguimiento y evaluación**: Monitorear progreso y ajustar estrategias
5. **Mejores prácticas**: Implementar metodologías probadas de OKRs

**Contexto empresarial español:**
- Enfócate en empresas y cultura empresarial española
- Usa ejemplos relevantes para diferentes sectores (tecnología, retail, manufacturas, servicios)
- Considera métricas comunes en el mercado español
- Adapta sugerencias a diferentes tamaños de empresa (startups, PYMES, grandes corporaciones)

**Estilo de comunicación:**
- Profesional pero accesible
- Respuestas estructuradas y accionables
- Incluye ejemplos prácticos cuando sea posible
- Pregunta por contexto específico cuando sea necesario
- Mantén respuestas concisas pero completas

**Capacidades específicas:**
- Analizar objetivos existentes y sugerir mejoras
- Generar Key Results para objetivos dados
- Crear OKRs completos para departamentos específicos
- Revisar y validar la calidad de OKRs propuestos
- Sugerir métricas de seguimiento y KPIs relevantes

Responde siempre en español y enfócate en proporcionar valor empresarial concreto.`

interface ChatRequest {
  messages: CoreMessage[]
  conversationId?: string
  context?: {
    department?: string
    role?: string
    companySize?: 'startup' | 'pyme' | 'empresa' | 'corporacion'
  }
}

// Initialize AI Gateway
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación con Stack Auth
    const user = await stackServerApp.getUser()
    if (!user) {
      return new Response("No autorizado", { status: 401 })
    }

    const body = await request.json() as ChatRequest
    const { messages, conversationId, context } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Se requieren mensajes para la conversación", { status: 400 })
    }

    // Validar estructura de mensajes
    const validMessages = messages.filter(msg =>
      msg.role && msg.content &&
      ['user', 'assistant', 'system'].includes(msg.role)
    )

    if (validMessages.length === 0) {
      return new Response("No se encontraron mensajes válidos", { status: 400 })
    }

    // Construir contexto específico de OKRs
    let contextualSystemPrompt = SYSTEM_PROMPT

    if (context) {
      contextualSystemPrompt += `\n\n**Contexto específico del usuario:**`
      if (context.department) {
        contextualSystemPrompt += `\n- Departamento: ${context.department}`
      }
      if (context.role) {
        contextualSystemPrompt += `\n- Rol: ${context.role}`
      }
      if (context.companySize) {
        const sizeLabels = {
          startup: 'Startup (1-50 empleados)',
          pyme: 'PYME (50-250 empleados)',
          empresa: 'Empresa mediana (250-1000 empleados)',
          corporacion: 'Gran corporación (1000+ empleados)'
        }
        contextualSystemPrompt += `\n- Tamaño de empresa: ${sizeLabels[context.companySize]}`
      }
    }

    // Preparar mensajes con contexto del sistema
    const conversationMessages: CoreMessage[] = [
      {
        role: 'system',
        content: contextualSystemPrompt
      },
      ...validMessages
    ]

    // Usar el modelo AI Gateway con failover
    const model = ai('openai/gpt-4o-mini')

    const streamResult = streamText({
      model,
      messages: conversationMessages,
      maxTokens: 1500,
      temperature: 0.7,
      providerOptions: {
        gateway: {
          order: ['openai', 'anthropic'], // Failover order
          timeout: 30000
        }
      },
      onFinish: async (result) => {
        // Log de métricas para monitoreo
        console.log('Chat completion:', {
          userId: user.id,
          conversationId,
          messageCount: conversationMessages.length,
          tokensUsed: result.usage?.totalTokens,
          timestamp: new Date().toISOString(),
          model: 'openai/gpt-4o-mini',
          latency: result.usage?.completionTokens ?
            (result.usage.completionTokens / 50) * 1000 : // Estimación ~50 tokens/segundo
            undefined
        })
      }
    })

    // Retornar stream response
    return streamResult.toDataStreamResponse()

  } catch (error) {
    console.error("Error en chat AI:", error)

    // Errores específicos para debugging
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        console.error("Error de configuración de API key")
        return new Response("Error de configuración del servicio AI", { status: 500 })
      }

      if (error.message.includes('rate limit')) {
        console.error("Rate limit alcanzado")
        return new Response("Demasiadas solicitudes, intenta de nuevo en un momento", { status: 429 })
      }

      if (error.message.includes('timeout')) {
        console.error("Timeout en respuesta AI")
        return new Response("Tiempo de espera agotado, intenta de nuevo", { status: 504 })
      }
    }

    return new Response("Error interno del servidor", { status: 500 })
  }
}

// Endpoint para obtener estado del chat AI
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    if (!user) {
      return new Response("No autorizado", { status: 401 })
    }

    // Health check del AI Gateway
    const healthStatus = await aiClient.healthCheck()

    return new Response(JSON.stringify({
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      latency: healthStatus.latency,
      availableModels: await aiClient.getAvailableModels(),
      user: {
        id: user.id,
        hasAccess: true
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Error verificando estado del chat:", error)
    return new Response(JSON.stringify({
      status: 'error',
      message: 'No se pudo verificar el estado del servicio'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}