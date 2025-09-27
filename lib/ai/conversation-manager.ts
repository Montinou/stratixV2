import { CoreMessage } from 'ai'
import type { Profile } from '@/lib/database/queries/profiles'
import type { Activity } from '@/lib/database/queries/activities'

// Types for conversation context
export interface OKRContext {
  id: string
  title: string
  type: 'objective' | 'key_result' | 'initiative'
  status: string
  progress?: number
  deadline?: Date
  owner?: string
  department?: string
}

export interface UserContext {
  userId: string
  role: 'corporativo' | 'gerente' | 'empleado'
  profile: Profile
  department?: string
  companySize: 'startup' | 'pyme' | 'empresa' | 'corporacion'
  preferences?: {
    language: 'es' | 'en'
    communicationStyle: 'formal' | 'informal'
    detailLevel: 'basic' | 'detailed' | 'expert'
  }
}

export interface ConversationContext {
  conversationId: string
  userContext: UserContext
  currentOKRs: OKRContext[]
  recentActivity: Activity[]
  conversationHistory: CoreMessage[]
  sessionMetadata: {
    startTime: Date
    lastActivity: Date
    messageCount: number
    topics: string[]
    mood?: 'positive' | 'neutral' | 'frustrated'
  }
}

export interface ConversationSummary {
  key_topics: string[]
  action_items: string[]
  decisions_made: string[]
  questions_asked: string[]
  progress_discussed: string[]
  mood_indicators: string[]
}

export class ConversationManager {
  private conversations = new Map<string, ConversationContext>()
  private summaries = new Map<string, ConversationSummary>()
  private readonly maxHistoryLength = 20 // Keep last 20 messages for context
  private readonly summaryInterval = 10 // Summarize every 10 messages

  /**
   * Initialize or retrieve a conversation context
   */
  async initializeConversation(
    conversationId: string,
    userContext: UserContext,
    initialOKRs: OKRContext[] = [],
    recentActivity: Activity[] = []
  ): Promise<ConversationContext> {
    const existing = this.conversations.get(conversationId)

    if (existing) {
      // Update context with latest data
      existing.currentOKRs = initialOKRs
      existing.recentActivity = recentActivity
      existing.sessionMetadata.lastActivity = new Date()
      return existing
    }

    // Create new conversation context
    const context: ConversationContext = {
      conversationId,
      userContext,
      currentOKRs: initialOKRs,
      recentActivity,
      conversationHistory: [],
      sessionMetadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        topics: [],
        mood: 'neutral'
      }
    }

    this.conversations.set(conversationId, context)
    return context
  }

  /**
   * Add a message to conversation history with context analysis
   */
  async addMessage(
    conversationId: string,
    message: CoreMessage,
    extractTopics = true
  ): Promise<ConversationContext> {
    const context = this.conversations.get(conversationId)
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    // Add message to history
    context.conversationHistory.push(message)
    context.sessionMetadata.messageCount++
    context.sessionMetadata.lastActivity = new Date()

    // Extract topics from user messages
    if (extractTopics && message.role === 'user') {
      const topics = await this.extractTopicsFromMessage(message.content)
      context.sessionMetadata.topics = [
        ...new Set([...context.sessionMetadata.topics, ...topics])
      ].slice(-10) // Keep last 10 unique topics
    }

    // Maintain conversation history length
    if (context.conversationHistory.length > this.maxHistoryLength) {
      const removed = context.conversationHistory.splice(0,
        context.conversationHistory.length - this.maxHistoryLength
      )

      // Archive removed messages to summary
      await this.updateConversationSummary(conversationId, removed)
    }

    // Periodic summarization
    if (context.sessionMetadata.messageCount % this.summaryInterval === 0) {
      await this.summarizeConversation(conversationId)
    }

    return context
  }

  /**
   * Get conversation context for AI model
   */
  getContextForAI(conversationId: string): {
    messages: CoreMessage[]
    systemPrompt: string
    metadata: Record<string, any>
  } {
    const context = this.conversations.get(conversationId)
    if (!context) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const systemPrompt = this.buildSystemPrompt(context)

    return {
      messages: [...context.conversationHistory],
      systemPrompt,
      metadata: {
        conversationId,
        userId: context.userContext.userId,
        role: context.userContext.role,
        department: context.userContext.department,
        topics: context.sessionMetadata.topics,
        messageCount: context.sessionMetadata.messageCount,
        currentOKRCount: context.currentOKRs.length
      }
    }
  }

  /**
   * Update conversation with new OKR data
   */
  updateOKRContext(conversationId: string, okrs: OKRContext[]): void {
    const context = this.conversations.get(conversationId)
    if (context) {
      context.currentOKRs = okrs
      context.sessionMetadata.lastActivity = new Date()
    }
  }

  /**
   * Update conversation with recent activity
   */
  updateActivityContext(conversationId: string, activities: Activity[]): void {
    const context = this.conversations.get(conversationId)
    if (context) {
      context.recentActivity = activities
      context.sessionMetadata.lastActivity = new Date()
    }
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): ConversationSummary | null {
    return this.summaries.get(conversationId) || null
  }

  /**
   * Clear conversation (for new session)
   */
  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId)
    this.summaries.delete(conversationId)
  }

  /**
   * Get active conversations count
   */
  getActiveConversationsCount(): number {
    return this.conversations.size
  }

  /**
   * Cleanup idle conversations (older than 1 hour)
   */
  cleanupIdleConversations(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    let cleaned = 0

    for (const [id, context] of this.conversations) {
      if (context.sessionMetadata.lastActivity < oneHourAgo) {
        this.conversations.delete(id)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Build system prompt based on conversation context
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const { userContext, currentOKRs, sessionMetadata } = context
    const { role, department, companySize, preferences } = userContext

    const language = preferences?.language || 'es'
    const style = preferences?.communicationStyle || 'formal'
    const detail = preferences?.detailLevel || 'detailed'

    let prompt = `Eres un asistente especializado en gestión de OKRs (Objetivos y Resultados Clave) para empresas.

CONTEXTO DEL USUARIO:
- Rol: ${role}
- Departamento: ${department || 'No especificado'}
- Tamaño de empresa: ${companySize}
- Estilo de comunicación: ${style}
- Nivel de detalle preferido: ${detail}

CONTEXTO ACTUAL:`

    if (currentOKRs.length > 0) {
      prompt += `\n\nOKRs ACTUALES (${currentOKRs.length}):`
      currentOKRs.slice(0, 5).forEach(okr => {
        prompt += `\n- ${okr.title} (${okr.type}, ${okr.status})`
        if (okr.progress !== undefined) {
          prompt += ` - Progreso: ${okr.progress}%`
        }
      })
    }

    if (sessionMetadata.topics.length > 0) {
      prompt += `\n\nTEMAS RECIENTES DE CONVERSACIÓN:${sessionMetadata.topics.slice(-5).map(topic => `\n- ${topic}`).join('')}`
    }

    prompt += `\n\nINSTRUCCIONES:
1. Responde siempre en español profesional y claro
2. Adapta el nivel de detalle según la preferencia del usuario (${detail})
3. Considera el rol del usuario para personalizar recomendaciones
4. Usa metodologías de OKR reconocidas (Google, Weekdone, etc.)
5. Proporciona ejemplos específicos cuando sea útil
6. Sugiere acciones concretas y medibles
7. Mantén un tono ${style === 'formal' ? 'profesional y respetuoso' : 'amigable pero profesional'}

ESPECIALIDADES:
- Definición y refinamiento de objetivos SMART
- Diseño de resultados clave medibles
- Cascada de OKRs en organizaciones
- Seguimiento y evaluación de progreso
- Resolución de bloqueos y desafíos
- Alineación estratégica y táctica
- Mejores prácticas por industria y tamaño de empresa

Responde de manera contextual y personalizada basándote en la información del usuario.`

    return prompt
  }

  /**
   * Extract topics from message content using simple keyword analysis
   */
  private async extractTopicsFromMessage(content: string): Promise<string[]> {
    const topics: string[] = []
    const lowercaseContent = content.toLowerCase()

    // OKR-related keywords mapping
    const topicKeywords = {
      'objetivos': ['objetivo', 'objetivos', 'meta', 'metas', 'goal', 'goals'],
      'resultados_clave': ['resultado clave', 'kr', 'key result', 'métrica', 'indicador'],
      'progreso': ['progreso', 'avance', 'progress', 'seguimiento', 'tracking'],
      'alineación': ['alineación', 'alignment', 'cascada', 'cascade'],
      'evaluación': ['evaluación', 'review', 'revisión', 'assessment'],
      'bloqueos': ['bloqueo', 'blocker', 'problema', 'issue', 'dificultad'],
      'estrategia': ['estrategia', 'strategy', 'plan', 'planning'],
      'equipo': ['equipo', 'team', 'colaboración', 'collaboration'],
      'rendimiento': ['rendimiento', 'performance', 'resultados', 'results']
    }

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowercaseContent.includes(keyword))) {
        topics.push(topic)
      }
    }

    return topics
  }

  /**
   * Update conversation summary with archived messages
   */
  private async updateConversationSummary(
    conversationId: string,
    archivedMessages: CoreMessage[]
  ): Promise<void> {
    const existingSummary = this.summaries.get(conversationId) || {
      key_topics: [],
      action_items: [],
      decisions_made: [],
      questions_asked: [],
      progress_discussed: [],
      mood_indicators: []
    }

    // Simple extraction from archived messages
    archivedMessages.forEach(message => {
      if (message.role === 'user') {
        const content = message.content.toLowerCase()

        // Extract questions
        if (content.includes('?') || content.includes('cómo') || content.includes('qué')) {
          existingSummary.questions_asked.push(message.content.slice(0, 100))
        }

        // Extract action items (commands/requests)
        if (content.includes('necesito') || content.includes('quiero') || content.includes('ayuda')) {
          existingSummary.action_items.push(message.content.slice(0, 100))
        }
      }
    })

    // Keep arrays at reasonable size
    Object.keys(existingSummary).forEach(key => {
      const array = existingSummary[key as keyof ConversationSummary] as string[]
      if (array.length > 10) {
        existingSummary[key as keyof ConversationSummary] = array.slice(-10) as any
      }
    })

    this.summaries.set(conversationId, existingSummary)
  }

  /**
   * Create periodic conversation summary
   */
  private async summarizeConversation(conversationId: string): Promise<void> {
    const context = this.conversations.get(conversationId)
    if (!context) return

    // This is a simplified summarization
    // In a production system, you might use AI to generate better summaries
    const recentMessages = context.conversationHistory.slice(-this.summaryInterval)
    await this.updateConversationSummary(conversationId, recentMessages)
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()