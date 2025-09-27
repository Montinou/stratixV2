import { type NextRequest } from "next/server"
import { stackServerApp } from "@/stack"
import { streamText, generateText, convertToCoreMessages } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import type { CoreMessage } from 'ai'
import { conversationManager } from '@/lib/ai/conversation-manager'
import { chatContextBuilder, type ChatContextRequest } from '@/lib/ai/chat-context'
import { z } from 'zod'

export const runtime = 'edge'

// Enhanced request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').optional(),
  messages: z.array(z.any()).optional(),
  conversationId: z.string().optional(),
  context: z.object({
    currentOKRs: z.array(z.any()).optional(),
    userRole: z.string().optional(),
    companyContext: z.string().optional(),
    recentActivity: z.array(z.any()).optional(),
    department: z.string().optional(),
    role: z.string().optional(),
    companySize: z.enum(['startup', 'pyme', 'empresa', 'corporacion']).optional(),
  }).optional(),
  attachments: z.array(z.any()).optional(),
  streaming: z.boolean().default(true),
  preferences: z.object({
    language: z.enum(['es', 'en']).default('es'),
    communicationStyle: z.enum(['formal', 'informal']).default('formal'),
    detailLevel: z.enum(['basic', 'detailed', 'expert']).default('detailed')
  }).optional()
})

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 50 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = requestCounts.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
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
    const healthStatus = {
      status: 'online',
      timestamp: new Date().toISOString(),
      latency: null
    }

    // Intentar una llamada simple para verificar disponibilidad
    try {
      const testModel = ai('openai/gpt-4o-mini')
      const testResult = await generateText({
        model: testModel,
        prompt: 'Test',
        maxTokens: 1
      })

      healthStatus.status = 'online'
      healthStatus.latency = 100 // Placeholder latency
    } catch (error) {
      console.warn('AI Gateway health check failed:', error)
      healthStatus.status = 'degraded'
    }

    return new Response(JSON.stringify({
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      latency: healthStatus.latency,
      availableModels: ['openai/gpt-4o-mini', 'anthropic/claude-sonnet-4'],
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