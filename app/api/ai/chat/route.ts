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

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response("Límite de solicitudes excedido. Intenta de nuevo más tarde.", { status: 429 })
    }

    // Parse and validate request
    const body = await request.json()
    const validatedRequest = chatRequestSchema.parse(body)

    const {
      message,
      messages,
      conversationId = `conv_${user.id}_${Date.now()}`,
      context,
      streaming = true,
      preferences
    } = validatedRequest

    // Handle both single message and messages array formats
    let userMessage: string
    let conversationMessages: CoreMessage[] = []

    if (message) {
      // Single message format (new conversation style)
      userMessage = message
    } else if (messages && Array.isArray(messages) && messages.length > 0) {
      // Legacy messages array format
      const validMessages = messages.filter(msg =>
        msg.role && msg.content &&
        ['user', 'assistant', 'system'].includes(msg.role)
      )

      if (validMessages.length === 0) {
        return new Response("No se encontraron mensajes válidos", { status: 400 })
      }

      // Extract the last user message
      const lastUserMessage = validMessages.findLast(msg => msg.role === 'user')
      if (!lastUserMessage) {
        return new Response("Se requiere al menos un mensaje de usuario", { status: 400 })
      }

      userMessage = lastUserMessage.content
      conversationMessages = validMessages.slice(0, -1) // All except the last user message
    } else {
      return new Response("Se requiere un mensaje o array de mensajes", { status: 400 })
    }

    // Build comprehensive chat context
    const contextRequest: ChatContextRequest = {
      userId: user.id,
      conversationId,
      currentOKRs: context?.currentOKRs,
      userRole: context?.userRole || context?.role,
      companyContext: context?.companyContext,
      recentActivity: context?.recentActivity,
      preferences
    }

    const enhancedContext = await chatContextBuilder.buildChatContext(contextRequest)

    // Initialize or update conversation
    await conversationManager.initializeConversation(
      conversationId,
      enhancedContext.userContext,
      enhancedContext.okrContext,
      enhancedContext.activityContext
    )

    // Add any existing conversation messages first
    for (const msg of conversationMessages) {
      await conversationManager.addMessage(conversationId, msg, false)
    }

    // Add current user message to conversation
    const currentUserMessage = {
      role: 'user' as const,
      content: userMessage
    }

    await conversationManager.addMessage(conversationId, currentUserMessage)

    // Get conversation context for AI
    const aiContext = conversationManager.getContextForAI(conversationId)

    // Build system prompt with enhanced context
    const systemPrompt = buildEnhancedSystemPrompt(enhancedContext, aiContext.systemPrompt)

    // Prepare messages for AI model
    const finalMessages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...aiContext.messages
    ]

    // Determine optimal model based on context complexity
    const modelToUse = determineOptimalModel(enhancedContext, userMessage)
    const model = ai(modelToUse)

    if (streaming) {
      const streamResult = streamText({
        model,
        messages: finalMessages,
        maxTokens: 2000,
        temperature: 0.7,
        providerOptions: {
          gateway: {
            order: ['openai', 'anthropic'], // Failover order
            timeout: 30000
          }
        },
        onFinish: async (result) => {
          // Add assistant response to conversation
          const assistantMessage = {
            role: 'assistant' as const,
            content: result.text
          }

          await conversationManager.addMessage(conversationId, assistantMessage, false)

          // Log analytics
          console.log('Chat completion:', {
            conversationId,
            userId: user.id,
            messageLength: userMessage.length,
            responseLength: result.text.length,
            tokensUsed: result.usage?.totalTokens,
            model: modelToUse,
            sessionType: enhancedContext.conversationMetadata.sessionType,
            urgency: enhancedContext.conversationMetadata.urgency,
            timestamp: new Date().toISOString()
          })
        },
        onError: (error) => {
          console.error('Streaming error:', error)
        }
      })

      return streamResult.toDataStreamResponse({
        headers: {
          'x-conversation-id': conversationId,
          'x-session-type': enhancedContext.conversationMetadata.sessionType,
          'x-urgency': enhancedContext.conversationMetadata.urgency
        }
      })
    } else {
      // Non-streaming response
      const result = await generateText({
        model,
        messages: finalMessages,
        maxTokens: 2000,
        temperature: 0.7
      })

      // Add assistant response to conversation
      const assistantMessage = {
        role: 'assistant' as const,
        content: result.text
      }

      await conversationManager.addMessage(conversationId, assistantMessage, false)

      return new Response(JSON.stringify({
        id: crypto.randomUUID(),
        message: result.text,
        conversationId,
        suggestions: generateFollowUpSuggestions(enhancedContext, result.text),
        metadata: {
          sessionType: enhancedContext.conversationMetadata.sessionType,
          urgency: enhancedContext.conversationMetadata.urgency,
          model: modelToUse
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'x-conversation-id': conversationId
        }
      })
    }

  } catch (error) {
    console.error("Error en chat AI:", error)

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        error: 'Formato de solicitud inválido',
        details: error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

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

      if (error.message.includes('Profile not found')) {
        return new Response("Error de perfil de usuario. Por favor, recarga la página.", { status: 400 })
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

/**
 * Build enhanced system prompt with full context
 */
function buildEnhancedSystemPrompt(
  enhancedContext: any,
  baseSystemPrompt: string
): string {
  const { businessContext, conversationMetadata } = enhancedContext

  let enhancedPrompt = baseSystemPrompt

  // Add business context
  if (businessContext.industry) {
    enhancedPrompt += `\n\nCONTEXTO EMPRESARIAL:
- Industria: ${businessContext.industry}
- Madurez OKR: ${businessContext.okrMaturity}
- Tamaño de empresa: ${businessContext.companySize}`
  }

  // Add current challenges
  if (businessContext.currentChallenges.length > 0) {
    enhancedPrompt += `\n\nDESAFÍOS ACTUALES:${businessContext.currentChallenges.map(challenge => `\n- ${challenge}`).join('')}`
  }

  // Add session-specific guidance
  enhancedPrompt += `\n\nCONTEXTO DE SESIÓN:
- Tipo: ${conversationMetadata.sessionType}
- Urgencia: ${conversationMetadata.urgency}
- Resultados esperados:${conversationMetadata.expectedOutcome.map((outcome: string) => `\n  - ${outcome}`).join('')}`

  // Add specific instructions based on session type
  const sessionInstructions = getSessionSpecificInstructions(conversationMetadata.sessionType)
  enhancedPrompt += `\n\nINSTRUCCIONES ESPECÍFICAS:\n${sessionInstructions}`

  return enhancedPrompt
}

/**
 * Get session-specific instructions
 */
function getSessionSpecificInstructions(sessionType: string): string {
  const instructions: Record<string, string> = {
    strategy: `- Enfócate en definir objetivos SMART y resultados clave medibles
- Proporciona ejemplos específicos para la industria del usuario
- Sugiere metodologías de implementación paso a paso
- Incluye marcos de tiempo realistas
- Considera la capacidad y recursos del equipo`,

    tracking: `- Analiza los datos de progreso de manera constructiva
- Identifica patrones y tendencias en el rendimiento
- Sugiere ajustes tácticos basados en datos
- Proporciona recomendaciones para acelerar el progreso
- Celebra los logros mientras señalas áreas de mejora`,

    problem_solving: `- Aplica metodología de resolución de problemas estructurada
- Identifica causas raíz, no solo síntomas
- Proporciona múltiples alternativas de solución
- Considera el impacto y la viabilidad de cada solución
- Incluye medidas preventivas para el futuro`,

    general: `- Proporciona información educativa sobre mejores prácticas de OKR
- Adapta las recomendaciones al nivel de experiencia del usuario
- Incluye referencias a metodologías reconocidas
- Sugiere recursos adicionales cuando sea apropiado
- Mantén un enfoque práctico y accionable`
  }

  return instructions[sessionType] || instructions.general
}

/**
 * Determine optimal model based on context complexity
 */
function determineOptimalModel(enhancedContext: any, message: string): string {
  const { conversationMetadata, okrContext } = enhancedContext

  // Use premium model for complex scenarios
  if (
    conversationMetadata.urgency === 'high' ||
    conversationMetadata.sessionType === 'problem_solving' ||
    okrContext.length > 10 ||
    message.length > 1000
  ) {
    return 'openai/gpt-4o' // Premium model for complex cases
  }

  // Use efficient model for routine conversations
  return 'openai/gpt-4o-mini' // Cost-effective for most cases
}

/**
 * Generate follow-up suggestions based on context and response
 */
function generateFollowUpSuggestions(
  enhancedContext: any,
  response: string
): string[] {
  const { conversationMetadata, businessContext } = enhancedContext
  const suggestions: string[] = []

  // Base suggestions by session type
  const baseSuggestions: Record<string, string[]> = {
    strategy: [
      "¿Cómo puedo validar que estos objetivos están alineados con la estrategia de la empresa?",
      "¿Qué métricas adicionales debería considerar?",
      "¿Cómo comunico estos OKRs al equipo efectivamente?"
    ],
    tracking: [
      "¿Qué acciones específicas pueden acelerar el progreso?",
      "¿Cómo identifico bloqueos antes de que se vuelvan críticos?",
      "¿Con qué frecuencia debería revisar estos indicadores?"
    ],
    problem_solving: [
      "¿Cómo puedo prevenir que este problema vuelva a ocurrir?",
      "¿Qué otros riesgos debería monitorear?",
      "¿Necesito ajustar mis OKRs debido a este problema?"
    ],
    general: [
      "¿Puedes darme ejemplos específicos para mi industria?",
      "¿Qué herramientas recomiendas para implementar esto?",
      "¿Cómo mido el éxito de esta estrategia?"
    ]
  }

  // Get base suggestions
  const baseSet = baseSuggestions[conversationMetadata.sessionType] || baseSuggestions.general

  // Add urgency-specific suggestions
  if (conversationMetadata.urgency === 'high') {
    suggestions.push("¿Cuáles son los pasos más críticos que debo tomar inmediatamente?")
  }

  // Add maturity-specific suggestions
  if (businessContext.okrMaturity === 'beginner') {
    suggestions.push("¿Puedes explicar esto de manera más simple?")
  }

  return [...suggestions, ...baseSet.slice(0, 2)].slice(0, 3)
}