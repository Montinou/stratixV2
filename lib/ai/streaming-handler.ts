import { streamText, generateText, gateway } from "ai"
import type { ConversationContext, ChatMessage, RecommendedAction, Citation } from "./conversation-manager"
import { ChatContextBuilder } from "./chat-context"

// Create Vercel AI Gateway provider following the established pattern
const ai = gateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
})

// Cost-optimized model configuration for conversations
const CHAT_MODEL_PRIMARY = "openai/gpt-4o-mini"
const CHAT_MODEL_FALLBACK = "anthropic/claude-3-haiku-20240307"
const CHAT_MODEL_PREMIUM = "openai/gpt-4o" // For complex analysis

export interface StreamingOptions {
  temperature?: number
  maxTokens?: number
  enableSuggestions?: boolean
  enableActions?: boolean
  model?: string
}

export interface StreamResponse {
  content: string
  suggestions?: string[]
  actions?: RecommendedAction[]
  citations?: Citation[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class StreamingHandler {
  private contextBuilder: ChatContextBuilder

  constructor() {
    this.contextBuilder = new ChatContextBuilder()
  }

  async streamResponse(
    message: string,
    context: ConversationContext,
    options: StreamingOptions = {}
  ) {
    const {
      temperature = 0.7,
      maxTokens = 800,
      model = CHAT_MODEL_PRIMARY,
      enableSuggestions = true,
      enableActions = true
    } = options

    try {
      // Build contextual prompt
      const fullPrompt = this.contextBuilder.buildCompletePrompt(message, context)

      // Stream the response
      const result = streamText({
        model: ai(model),
        prompt: fullPrompt,
        temperature,
        maxTokens,
        // Add failover configuration
        providerOptions: {
          gateway: {
            order: ['openai', 'anthropic'], // Fallback order
            only: ['openai', 'anthropic'], // Restrict to these providers
          },
        },
      })

      return result
    } catch (error) {
      console.error('Streaming error:', error)
      // Fallback to alternative model
      return this.handleStreamingFallback(message, context, options)
    }
  }

  private async handleStreamingFallback(
    message: string,
    context: ConversationContext,
    options: StreamingOptions
  ) {
    try {
      const fullPrompt = this.contextBuilder.buildCompletePrompt(message, context)

      // Try with fallback model
      const result = streamText({
        model: ai(CHAT_MODEL_FALLBACK),
        prompt: fullPrompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 600, // Reduced for fallback
      })

      return result
    } catch (fallbackError) {
      console.error('Fallback streaming error:', fallbackError)
      throw new Error('No se pudo generar una respuesta en este momento. Por favor, inténtalo más tarde.')
    }
  }

  async generateNonStreamingResponse(
    message: string,
    context: ConversationContext,
    options: StreamingOptions = {}
  ): Promise<StreamResponse> {
    const {
      temperature = 0.7,
      maxTokens = 800,
      model = CHAT_MODEL_PRIMARY,
      enableSuggestions = true,
      enableActions = true
    } = options

    try {
      // Build contextual prompt
      const fullPrompt = this.contextBuilder.buildCompletePrompt(message, context)

      // Generate response
      const result = await generateText({
        model: ai(model),
        prompt: fullPrompt,
        temperature,
        maxTokens,
        providerOptions: {
          gateway: {
            order: ['openai', 'anthropic'],
            only: ['openai', 'anthropic'],
          },
        },
      })

      // Generate suggestions and actions in parallel
      const [suggestions, actions, citations] = await Promise.all([
        enableSuggestions ? this.generateSuggestions(context) : Promise.resolve([]),
        enableActions ? this.generateActions(message, context, result.text) : Promise.resolve([]),
        this.extractCitations(message, context, result.text)
      ])

      return {
        content: result.text,
        suggestions,
        actions,
        citations,
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens
        } : undefined
      }

    } catch (error) {
      console.error('Non-streaming generation error:', error)
      return this.generateFallbackResponse(message, context)
    }
  }

  private async generateFallbackResponse(
    message: string,
    context: ConversationContext
  ): Promise<StreamResponse> {
    try {
      const fullPrompt = this.contextBuilder.buildCompletePrompt(message, context)

      const result = await generateText({
        model: ai(CHAT_MODEL_FALLBACK),
        prompt: fullPrompt,
        temperature: 0.7,
        maxTokens: 600,
      })

      return {
        content: result.text,
        suggestions: [],
        actions: [],
        citations: []
      }
    } catch (fallbackError) {
      console.error('Fallback generation error:', fallbackError)
      return {
        content: "Disculpa, no puedo procesar tu mensaje en este momento. Por favor, inténtalo más tarde o reformula tu pregunta.",
        suggestions: [
          "¿Podrías reformular tu pregunta?",
          "Intenta con una consulta más específica",
          "Revisa el estado de tus objetivos actuales"
        ],
        actions: [],
        citations: []
      }
    }
  }

  private async generateSuggestions(context: ConversationContext): Promise<string[]> {
    try {
      // Use the context builder to get contextual suggestions
      return this.contextBuilder.generateContextualSuggestions(context)
    } catch (error) {
      console.error('Error generating suggestions:', error)
      return []
    }
  }

  private async generateActions(
    userMessage: string,
    context: ConversationContext,
    assistantResponse: string
  ): Promise<RecommendedAction[]> {
    try {
      const actions: RecommendedAction[] = []

      // Analyze user intent and context to suggest actions
      const lowerMessage = userMessage.toLowerCase()
      const lowerResponse = assistantResponse.toLowerCase()

      // OKR Creation Actions
      if (lowerMessage.includes('crear') || lowerMessage.includes('nuevo objetivo')) {
        actions.push({
          type: "create_objective",
          title: "Crear nuevo objetivo",
          description: "Configurar un nuevo objetivo basado en esta conversación",
          data: { userMessage, context: context.userRole }
        })
      }

      // Progress Update Actions
      if (lowerMessage.includes('progreso') || lowerMessage.includes('avance')) {
        const relevantObjectives = context.currentOKRs.filter(obj =>
          obj.status === 'en_progreso' && obj.progress < 100
        )

        if (relevantObjectives.length > 0) {
          actions.push({
            type: "update_progress",
            title: "Actualizar progreso",
            description: "Registrar el progreso en objetivos relevantes",
            data: { objectives: relevantObjectives }
          })
        }
      }

      // Review Actions
      if (lowerMessage.includes('revisar') || lowerMessage.includes('analizar')) {
        if (context.recentInitiatives.length > 0) {
          actions.push({
            type: "review_initiative",
            title: "Revisar iniciativas",
            description: "Realizar una revisión detallada de las iniciativas",
            data: { initiatives: context.recentInitiatives }
          })
        }
      }

      // Meeting Scheduling
      if (lowerMessage.includes('reunión') || lowerMessage.includes('meeting') ||
          lowerResponse.includes('equipo') || lowerResponse.includes('coordinación')) {
        actions.push({
          type: "schedule_meeting",
          title: "Programar reunión",
          description: "Agendar una sesión de seguimiento de OKRs",
          data: { topic: "Seguimiento de OKRs", department: context.department }
        })
      }

      return actions.slice(0, 3) // Limit to 3 actions
    } catch (error) {
      console.error('Error generating actions:', error)
      return []
    }
  }

  private async extractCitations(
    userMessage: string,
    context: ConversationContext,
    assistantResponse: string
  ): Promise<Citation[]> {
    try {
      const citations: Citation[] = []

      // Extract objective citations
      context.currentOKRs.forEach(objective => {
        if (assistantResponse.toLowerCase().includes(objective.title.toLowerCase())) {
          citations.push({
            type: "objective",
            id: objective.id,
            title: objective.title,
            url: `/objectives/${objective.id}`
          })
        }
      })

      // Extract initiative citations
      context.recentInitiatives.forEach(initiative => {
        if (assistantResponse.toLowerCase().includes(initiative.title.toLowerCase())) {
          citations.push({
            type: "initiative",
            id: initiative.id,
            title: initiative.title,
            url: `/initiatives/${initiative.id}`
          })
        }
      })

      // Extract activity citations
      context.recentActivities.forEach(activity => {
        if (assistantResponse.toLowerCase().includes(activity.title.toLowerCase())) {
          citations.push({
            type: "activity",
            id: activity.id,
            title: activity.title,
            url: `/activities/${activity.id}`
          })
        }
      })

      return citations.slice(0, 5) // Limit to 5 citations
    } catch (error) {
      console.error('Error extracting citations:', error)
      return []
    }
  }

  // Helper method to determine the appropriate model based on query complexity
  selectOptimalModel(message: string, context: ConversationContext): string {
    const messageLength = message.length
    const conversationLength = context.conversationHistory.length
    const dataComplexity = context.currentOKRs.length + context.recentInitiatives.length

    // Use premium model for complex analysis
    if (messageLength > 500 || conversationLength > 10 || dataComplexity > 20) {
      return CHAT_MODEL_PREMIUM
    }

    // Use primary model for regular conversations
    if (messageLength > 100 || conversationLength > 3 || dataComplexity > 5) {
      return CHAT_MODEL_PRIMARY
    }

    // Use fallback model for simple queries
    return CHAT_MODEL_FALLBACK
  }

  // Method to create a data stream for real-time updates
  async createDataStream(
    message: string,
    context: ConversationContext,
    options: StreamingOptions = {}
  ) {
    try {
      const model = options.model || this.selectOptimalModel(message, context)
      const fullPrompt = this.contextBuilder.buildCompletePrompt(message, context)

      const result = streamText({
        model: ai(model),
        prompt: fullPrompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 800,
        onFinish: async (completion) => {
          // Generate suggestions and actions after streaming completes
          if (options.enableSuggestions || options.enableActions) {
            const [suggestions, actions] = await Promise.all([
              options.enableSuggestions ? this.generateSuggestions(context) : [],
              options.enableActions ? this.generateActions(message, context, completion.text) : []
            ])

            // Note: In a real implementation, you'd send these via WebSocket or SSE
            console.log('Generated suggestions:', suggestions)
            console.log('Generated actions:', actions)
          }
        }
      })

      return result.toDataStreamResponse()
    } catch (error) {
      console.error('Data stream creation error:', error)
      throw error
    }
  }
}