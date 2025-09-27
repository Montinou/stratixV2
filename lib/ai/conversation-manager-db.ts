import { CoreMessage } from 'ai'
import { getDrizzleClient } from '@/lib/database/client'
import {
  aiConversations,
  aiConversationMessages,
  aiConversationSummaries
} from '@/lib/database/schema'
import { eq, and, desc, lt } from 'drizzle-orm'
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

export class ConversationManagerDB {
  private db = getDrizzleClient()
  private readonly maxHistoryLength = 20 // Keep last 20 messages for context
  private readonly summaryInterval = 10 // Summarize every 10 messages
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up idle conversations every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConversations()
    }, 60 * 60 * 1000)
  }

  /**
   * Initialize or retrieve a conversation context
   */
  async initializeConversation(
    conversationId: string,
    userContext: UserContext,
    initialOKRs: OKRContext[] = [],
    recentActivity: Activity[] = []
  ): Promise<ConversationContext> {
    try {
      // Try to get existing conversation
      const existing = await this.db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.conversationId, conversationId))
        .limit(1)
        .then(results => results[0] || null)

      const now = new Date()

      let conversation
      if (existing) {
        // Update existing conversation with latest data
        conversation = await this.db
          .update(aiConversations)
          .set({
            lastActivity: now,
            updatedAt: now,
          })
          .where(eq(aiConversations.conversationId, conversationId))
          .returning()
          .then(results => results[0])
      } else {
        // Create new conversation
        conversation = await this.db
          .insert(aiConversations)
          .values({
            conversationId,
            userId: userContext.userId,
            userRole: userContext.role,
            department: userContext.department,
            companySize: userContext.companySize,
            sessionStart: now,
            lastActivity: now,
            messageCount: 0,
            topics: JSON.stringify([]),
            mood: 'neutral',
            preferences: JSON.stringify(userContext.preferences),
          })
          .returning()
          .then(results => results[0])
      }

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(conversationId)

      // Parse topics from database
      const topics = typeof conversation.topics === 'string'
        ? JSON.parse(conversation.topics)
        : (conversation.topics as string[] || [])

      return {
        conversationId,
        userContext,
        currentOKRs: initialOKRs,
        recentActivity,
        conversationHistory,
        sessionMetadata: {
          startTime: conversation.sessionStart,
          lastActivity: conversation.lastActivity,
          messageCount: conversation.messageCount,
          topics,
          mood: conversation.mood as 'positive' | 'neutral' | 'frustrated'
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error)
      throw error
    }
  }

  /**
   * Add a message to conversation history with context analysis
   */
  async addMessage(
    conversationId: string,
    message: CoreMessage,
    extractTopics = true
  ): Promise<ConversationContext> {
    try {
      const now = new Date()

      // Store message in database
      await this.db
        .insert(aiConversationMessages)
        .values({
          conversationId,
          role: message.role,
          content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          metadata: JSON.stringify({ extractTopics }),
          timestamp: now,
        })

      // Get current conversation
      const conversation = await this.db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.conversationId, conversationId))
        .limit(1)
        .then(results => results[0])

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`)
      }

      // Extract topics from user messages
      let newTopics: string[] = []
      if (extractTopics && message.role === 'user') {
        newTopics = await this.extractTopicsFromMessage(
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
        )
      }

      // Update conversation metadata
      const currentTopics = typeof conversation.topics === 'string'
        ? JSON.parse(conversation.topics)
        : (conversation.topics as string[] || [])

      const allTopics = [...new Set([...currentTopics, ...newTopics])].slice(-10) // Keep last 10 unique topics
      const newMessageCount = conversation.messageCount + 1

      await this.db
        .update(aiConversations)
        .set({
          lastActivity: now,
          messageCount: newMessageCount,
          topics: JSON.stringify(allTopics),
          updatedAt: now,
        })
        .where(eq(aiConversations.conversationId, conversationId))

      // Clean up old messages if needed
      await this.maintainHistoryLength(conversationId)

      // Periodic summarization
      if (newMessageCount % this.summaryInterval === 0) {
        await this.summarizeConversation(conversationId)
      }

      // Return updated context
      return await this.getContextForConversation(conversationId)
    } catch (error) {
      console.error('Error adding message:', error)
      throw error
    }
  }

  /**
   * Get conversation context for AI model
   */
  getContextForAI(conversationId: string): Promise<{
    messages: CoreMessage[]
    systemPrompt: string
    metadata: Record<string, any>
  }> {
    return this.getContextForConversation(conversationId).then(context => {
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
    })
  }

  /**
   * Update conversation with new OKR data
   */
  async updateOKRContext(conversationId: string, okrs: OKRContext[]): Promise<void> {
    try {
      const now = new Date()
      await this.db
        .update(aiConversations)
        .set({
          lastActivity: now,
          updatedAt: now,
        })
        .where(eq(aiConversations.conversationId, conversationId))
    } catch (error) {
      console.error('Error updating OKR context:', error)
    }
  }

  /**
   * Update conversation with recent activity
   */
  async updateActivityContext(conversationId: string, activities: Activity[]): Promise<void> {
    try {
      const now = new Date()
      await this.db
        .update(aiConversations)
        .set({
          lastActivity: now,
          updatedAt: now,
        })
        .where(eq(aiConversations.conversationId, conversationId))
    } catch (error) {
      console.error('Error updating activity context:', error)
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      const summary = await this.db
        .select()
        .from(aiConversationSummaries)
        .where(eq(aiConversationSummaries.conversationId, conversationId))
        .orderBy(desc(aiConversationSummaries.updatedAt))
        .limit(1)
        .then(results => results[0] || null)

      if (!summary) {
        return null
      }

      return {
        key_topics: this.parseJsonField(summary.keyTopics, []),
        action_items: this.parseJsonField(summary.actionItems, []),
        decisions_made: this.parseJsonField(summary.decisionsMade, []),
        questions_asked: this.parseJsonField(summary.questionsAsked, []),
        progress_discussed: this.parseJsonField(summary.progressDiscussed, []),
        mood_indicators: this.parseJsonField(summary.moodIndicators, [])
      }
    } catch (error) {
      console.error('Error getting conversation summary:', error)
      return null
    }
  }

  /**
   * Clear conversation (for new session)
   */
  async clearConversation(conversationId: string): Promise<void> {
    try {
      // Delete messages (cascades to summaries via foreign key)
      await this.db
        .delete(aiConversationMessages)
        .where(eq(aiConversationMessages.conversationId, conversationId))

      // Delete summaries
      await this.db
        .delete(aiConversationSummaries)
        .where(eq(aiConversationSummaries.conversationId, conversationId))

      // Delete conversation
      await this.db
        .delete(aiConversations)
        .where(eq(aiConversations.conversationId, conversationId))
    } catch (error) {
      console.error('Error clearing conversation:', error)
    }
  }

  /**
   * Get active conversations count
   */
  async getActiveConversationsCount(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const result = await this.db
        .select()
        .from(aiConversations)
        .where(and(
          eq(aiConversations.lastActivity, oneHourAgo)
        ))

      return result.length
    } catch (error) {
      console.error('Error getting active conversations count:', error)
      return 0
    }
  }

  /**
   * Cleanup idle conversations (older than 1 hour)
   */
  async cleanupIdleConversations(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const result = await this.db
        .delete(aiConversations)
        .where(lt(aiConversations.lastActivity, oneHourAgo))

      console.log(`Cleaned up idle conversations`)
      return 0 // TODO: return actual count when drizzle supports it
    } catch (error) {
      console.error('Error cleaning up idle conversations:', error)
      return 0
    }
  }

  /**
   * Get conversation history from database
   */
  private async getConversationHistory(conversationId: string): Promise<CoreMessage[]> {
    try {
      const messages = await this.db
        .select()
        .from(aiConversationMessages)
        .where(eq(aiConversationMessages.conversationId, conversationId))
        .orderBy(desc(aiConversationMessages.timestamp))
        .limit(this.maxHistoryLength)

      return messages.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    } catch (error) {
      console.error('Error getting conversation history:', error)
      return []
    }
  }

  /**
   * Maintain conversation history length by removing old messages
   */
  private async maintainHistoryLength(conversationId: string): Promise<void> {
    try {
      // Get all messages for this conversation
      const allMessages = await this.db
        .select()
        .from(aiConversationMessages)
        .where(eq(aiConversationMessages.conversationId, conversationId))
        .orderBy(desc(aiConversationMessages.timestamp))

      if (allMessages.length > this.maxHistoryLength) {
        // Get messages to archive (oldest ones beyond the limit)
        const messagesToArchive = allMessages.slice(this.maxHistoryLength)

        // Archive to summary before deleting
        await this.updateConversationSummary(conversationId, messagesToArchive.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })))

        // Delete old messages
        const oldestTimestamp = messagesToArchive[0].timestamp
        await this.db
          .delete(aiConversationMessages)
          .where(
            and(
              eq(aiConversationMessages.conversationId, conversationId),
              lt(aiConversationMessages.timestamp, oldestTimestamp)
            )
          )
      }
    } catch (error) {
      console.error('Error maintaining history length:', error)
    }
  }

  /**
   * Get full conversation context
   */
  private async getContextForConversation(conversationId: string): Promise<ConversationContext> {
    const conversation = await this.db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.conversationId, conversationId))
      .limit(1)
      .then(results => results[0])

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`)
    }

    const conversationHistory = await this.getConversationHistory(conversationId)

    const topics = this.parseJsonField(conversation.topics, [])
    const preferences = this.parseJsonField(conversation.preferences, {})

    // Mock user context - in real implementation this would come from user service
    const userContext: UserContext = {
      userId: conversation.userId,
      role: conversation.userRole,
      profile: {} as Profile, // Would be fetched from user service
      department: conversation.department,
      companySize: conversation.companySize as 'startup' | 'pyme' | 'empresa' | 'corporacion',
      preferences
    }

    return {
      conversationId,
      userContext,
      currentOKRs: [], // Would be fetched from OKR service
      recentActivity: [], // Would be fetched from activity service
      conversationHistory,
      sessionMetadata: {
        startTime: conversation.sessionStart,
        lastActivity: conversation.lastActivity,
        messageCount: conversation.messageCount,
        topics,
        mood: conversation.mood as 'positive' | 'neutral' | 'frustrated'
      }
    }
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
    try {
      // Get existing summary or create new one
      let existingSummary = await this.db
        .select()
        .from(aiConversationSummaries)
        .where(eq(aiConversationSummaries.conversationId, conversationId))
        .limit(1)
        .then(results => results[0] || null)

      const extractedData = {
        key_topics: [] as string[],
        action_items: [] as string[],
        decisions_made: [] as string[],
        questions_asked: [] as string[],
        progress_discussed: [] as string[],
        mood_indicators: [] as string[]
      }

      // Simple extraction from archived messages
      archivedMessages.forEach(message => {
        if (message.role === 'user') {
          const content = message.content.toString().toLowerCase()

          // Extract questions
          if (content.includes('?') || content.includes('cómo') || content.includes('qué')) {
            extractedData.questions_asked.push(message.content.toString().slice(0, 100))
          }

          // Extract action items (commands/requests)
          if (content.includes('necesito') || content.includes('quiero') || content.includes('ayuda')) {
            extractedData.action_items.push(message.content.toString().slice(0, 100))
          }
        }
      })

      const now = new Date()

      if (existingSummary) {
        // Update existing summary
        const currentData = {
          key_topics: this.parseJsonField(existingSummary.keyTopics, []),
          action_items: this.parseJsonField(existingSummary.actionItems, []),
          decisions_made: this.parseJsonField(existingSummary.decisionsMade, []),
          questions_asked: this.parseJsonField(existingSummary.questionsAsked, []),
          progress_discussed: this.parseJsonField(existingSummary.progressDiscussed, []),
          mood_indicators: this.parseJsonField(existingSummary.moodIndicators, [])
        }

        // Merge and limit arrays
        const mergedData = {
          keyTopics: JSON.stringify([...currentData.key_topics, ...extractedData.key_topics].slice(-10)),
          actionItems: JSON.stringify([...currentData.action_items, ...extractedData.action_items].slice(-10)),
          decisionsMade: JSON.stringify([...currentData.decisions_made, ...extractedData.decisions_made].slice(-10)),
          questionsAsked: JSON.stringify([...currentData.questions_asked, ...extractedData.questions_asked].slice(-10)),
          progressDiscussed: JSON.stringify([...currentData.progress_discussed, ...extractedData.progress_discussed].slice(-10)),
          moodIndicators: JSON.stringify([...currentData.mood_indicators, ...extractedData.mood_indicators].slice(-10))
        }

        await this.db
          .update(aiConversationSummaries)
          .set({
            ...mergedData,
            updatedAt: now,
          })
          .where(eq(aiConversationSummaries.conversationId, conversationId))
      } else {
        // Create new summary
        await this.db
          .insert(aiConversationSummaries)
          .values({
            conversationId,
            keyTopics: JSON.stringify(extractedData.key_topics),
            actionItems: JSON.stringify(extractedData.action_items),
            decisionsMade: JSON.stringify(extractedData.decisions_made),
            questionsAsked: JSON.stringify(extractedData.questions_asked),
            progressDiscussed: JSON.stringify(extractedData.progress_discussed),
            moodIndicators: JSON.stringify(extractedData.mood_indicators),
          })
      }
    } catch (error) {
      console.error('Error updating conversation summary:', error)
    }
  }

  /**
   * Create periodic conversation summary
   */
  private async summarizeConversation(conversationId: string): Promise<void> {
    try {
      // Get recent messages for summarization
      const recentMessages = await this.db
        .select()
        .from(aiConversationMessages)
        .where(eq(aiConversationMessages.conversationId, conversationId))
        .orderBy(desc(aiConversationMessages.timestamp))
        .limit(this.summaryInterval)

      const coreMessages: CoreMessage[] = recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))

      await this.updateConversationSummary(conversationId, coreMessages)
    } catch (error) {
      console.error('Error summarizing conversation:', error)
    }
  }

  /**
   * Parse JSON field safely
   */
  private parseJsonField(field: any, defaultValue: any): any {
    if (!field) return defaultValue
    if (typeof field === 'string') {
      try {
        return JSON.parse(field)
      } catch {
        return defaultValue
      }
    }
    return field
  }

  /**
   * Destroy conversation manager and cleanup intervals
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Export singleton instance
export const conversationManagerDB = new ConversationManagerDB()