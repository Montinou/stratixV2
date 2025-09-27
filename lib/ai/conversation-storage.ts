import { createClient } from '@/lib/database/neon-client'
import type { CoreMessage } from 'ai'
import type { ConversationContext, ConversationSummary } from './conversation-manager'

// Database schema interfaces
export interface StoredConversation {
  id: string
  user_id: string
  title: string
  summary?: string
  session_type: 'strategy' | 'tracking' | 'problem_solving' | 'general'
  urgency: 'low' | 'medium' | 'high'
  message_count: number
  created_at: Date
  updated_at: Date
  archived_at?: Date
  metadata?: Record<string, any>
}

export interface StoredMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: Date
}

export interface ConversationListItem {
  id: string
  title: string
  summary?: string
  messageCount: number
  lastActivity: Date
  sessionType: string
  urgency: string
  archived: boolean
}

export class ConversationStorage {
  private client = createClient()

  /**
   * Create database tables if they don't exist
   */
  async initializeTables(): Promise<void> {
    const conversationsTable = `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        session_type TEXT NOT NULL DEFAULT 'general',
        urgency TEXT NOT NULL DEFAULT 'low',
        message_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_at TIMESTAMPTZ,
        metadata JSONB
      );
    `

    const messagesTable = `
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at);',
      'CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);',
      'CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);'
    ]

    try {
      await this.client.query(conversationsTable)
      await this.client.query(messagesTable)

      for (const indexQuery of indexQueries) {
        await this.client.query(indexQuery)
      }
    } catch (error) {
      console.error('Error initializing conversation tables:', error)
      throw new Error('Failed to initialize conversation storage')
    }
  }

  /**
   * Save a new conversation
   */
  async saveConversation(context: ConversationContext): Promise<void> {
    const { conversationId, userContext, sessionMetadata, conversationHistory } = context

    // Generate conversation title from first message or context
    const title = this.generateConversationTitle(conversationHistory, userContext.role)

    const query = `
      INSERT INTO ai_conversations (
        id, user_id, title, session_type, urgency,
        message_count, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        message_count = EXCLUDED.message_count,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata
    `

    const values = [
      conversationId,
      userContext.userId,
      title,
      sessionMetadata.topics.length > 0 ? this.inferSessionType(sessionMetadata.topics) : 'general',
      sessionMetadata.mood === 'frustrated' ? 'high' : 'low',
      sessionMetadata.messageCount,
      JSON.stringify({
        topics: sessionMetadata.topics,
        mood: sessionMetadata.mood,
        department: userContext.department,
        role: userContext.role,
        companySize: userContext.companySize
      }),
      sessionMetadata.startTime,
      sessionMetadata.lastActivity
    ]

    try {
      await this.client.query(query, values)
    } catch (error) {
      console.error('Error saving conversation:', error)
      throw new Error('Failed to save conversation')
    }
  }

  /**
   * Save messages to database
   */
  async saveMessages(conversationId: string, messages: CoreMessage[]): Promise<void> {
    if (messages.length === 0) return

    const query = `
      INSERT INTO ai_messages (id, conversation_id, role, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `

    try {
      for (const message of messages) {
        const messageId = crypto.randomUUID()
        const values = [
          messageId,
          conversationId,
          message.role,
          message.content,
          null, // metadata placeholder
          new Date()
        ]

        await this.client.query(query, values)
      }

      // Update conversation message count
      await this.updateConversationMessageCount(conversationId)
    } catch (error) {
      console.error('Error saving messages:', error)
      throw new Error('Failed to save messages')
    }
  }

  /**
   * Load conversation history
   */
  async loadConversation(conversationId: string, userId: string): Promise<{
    conversation: StoredConversation | null
    messages: StoredMessage[]
  }> {
    try {
      // Load conversation metadata
      const conversationQuery = `
        SELECT * FROM ai_conversations
        WHERE id = $1 AND user_id = $2 AND archived_at IS NULL
      `
      const conversationResult = await this.client.query(conversationQuery, [conversationId, userId])
      const conversation = conversationResult.rows[0] || null

      if (!conversation) {
        return { conversation: null, messages: [] }
      }

      // Load messages
      const messagesQuery = `
        SELECT * FROM ai_messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `
      const messagesResult = await this.client.query(messagesQuery, [conversationId])

      return {
        conversation,
        messages: messagesResult.rows
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      throw new Error('Failed to load conversation')
    }
  }

  /**
   * List conversations for a user
   */
  async listConversations(
    userId: string,
    options: {
      limit?: number
      offset?: number
      includeArchived?: boolean
      sessionType?: string
    } = {}
  ): Promise<ConversationListItem[]> {
    const { limit = 20, offset = 0, includeArchived = false, sessionType } = options

    let query = `
      SELECT id, title, summary, message_count, updated_at as last_activity,
             session_type, urgency, archived_at
      FROM ai_conversations
      WHERE user_id = $1
    `

    const params: any[] = [userId]
    let paramIndex = 2

    if (!includeArchived) {
      query += ` AND archived_at IS NULL`
    }

    if (sessionType) {
      query += ` AND session_type = $${paramIndex}`
      params.push(sessionType)
      paramIndex++
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    try {
      const result = await this.client.query(query, params)

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        messageCount: row.message_count,
        lastActivity: new Date(row.last_activity),
        sessionType: row.session_type,
        urgency: row.urgency,
        archived: !!row.archived_at
      }))
    } catch (error) {
      console.error('Error listing conversations:', error)
      throw new Error('Failed to list conversations')
    }
  }

  /**
   * Search conversations by content
   */
  async searchConversations(
    userId: string,
    searchTerm: string,
    options: { limit?: number } = {}
  ): Promise<ConversationListItem[]> {
    const { limit = 10 } = options

    const query = `
      SELECT DISTINCT c.id, c.title, c.summary, c.message_count,
             c.updated_at as last_activity, c.session_type, c.urgency, c.archived_at
      FROM ai_conversations c
      JOIN ai_messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
        AND c.archived_at IS NULL
        AND (
          c.title ILIKE $2
          OR c.summary ILIKE $2
          OR m.content ILIKE $2
        )
      ORDER BY c.updated_at DESC
      LIMIT $3
    `

    try {
      const result = await this.client.query(query, [
        userId,
        `%${searchTerm}%`,
        limit
      ])

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        summary: row.summary,
        messageCount: row.message_count,
        lastActivity: new Date(row.last_activity),
        sessionType: row.session_type,
        urgency: row.urgency,
        archived: !!row.archived_at
      }))
    } catch (error) {
      console.error('Error searching conversations:', error)
      throw new Error('Failed to search conversations')
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const query = `
      UPDATE ai_conversations
      SET archived_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `

    try {
      await this.client.query(query, [conversationId, userId])
    } catch (error) {
      console.error('Error archiving conversation:', error)
      throw new Error('Failed to archive conversation')
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM ai_conversations
      WHERE id = $1 AND user_id = $2
    `

    try {
      await this.client.query(query, [conversationId, userId])
    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw new Error('Failed to delete conversation')
    }
  }

  /**
   * Update conversation summary
   */
  async updateConversationSummary(
    conversationId: string,
    summary: string
  ): Promise<void> {
    const query = `
      UPDATE ai_conversations
      SET summary = $1, updated_at = NOW()
      WHERE id = $2
    `

    try {
      await this.client.query(query, [summary, conversationId])
    } catch (error) {
      console.error('Error updating conversation summary:', error)
      throw new Error('Failed to update conversation summary')
    }
  }

  /**
   * Get conversation analytics for a user
   */
  async getConversationAnalytics(userId: string): Promise<{
    totalConversations: number
    activeConversations: number
    messageCount: number
    sessionTypes: Record<string, number>
    averageConversationLength: number
  }> {
    try {
      const analyticsQuery = `
        SELECT
          COUNT(*) as total_conversations,
          COUNT(*) FILTER (WHERE archived_at IS NULL) as active_conversations,
          SUM(message_count) as total_messages,
          AVG(message_count) as avg_conversation_length
        FROM ai_conversations
        WHERE user_id = $1
      `

      const sessionTypesQuery = `
        SELECT session_type, COUNT(*) as count
        FROM ai_conversations
        WHERE user_id = $1 AND archived_at IS NULL
        GROUP BY session_type
      `

      const [analyticsResult, sessionTypesResult] = await Promise.all([
        this.client.query(analyticsQuery, [userId]),
        this.client.query(sessionTypesQuery, [userId])
      ])

      const analytics = analyticsResult.rows[0]
      const sessionTypes: Record<string, number> = {}

      sessionTypesResult.rows.forEach(row => {
        sessionTypes[row.session_type] = parseInt(row.count)
      })

      return {
        totalConversations: parseInt(analytics.total_conversations) || 0,
        activeConversations: parseInt(analytics.active_conversations) || 0,
        messageCount: parseInt(analytics.total_messages) || 0,
        sessionTypes,
        averageConversationLength: parseFloat(analytics.avg_conversation_length) || 0
      }
    } catch (error) {
      console.error('Error getting conversation analytics:', error)
      throw new Error('Failed to get conversation analytics')
    }
  }

  /**
   * Cleanup old conversations (older than 30 days)
   */
  async cleanupOldConversations(): Promise<number> {
    const query = `
      DELETE FROM ai_conversations
      WHERE archived_at IS NOT NULL
        AND archived_at < NOW() - INTERVAL '30 days'
    `

    try {
      const result = await this.client.query(query)
      return result.rowCount || 0
    } catch (error) {
      console.error('Error cleaning up old conversations:', error)
      return 0
    }
  }

  /**
   * Generate conversation title from messages and context
   */
  private generateConversationTitle(
    messages: CoreMessage[],
    userRole: string
  ): string {
    // Find the first meaningful user message
    const firstUserMessage = messages.find(m => m.role === 'user')?.content

    if (firstUserMessage) {
      // Extract key topics for title
      const content = firstUserMessage.toLowerCase()

      if (content.includes('objetivo') || content.includes('okr')) {
        return 'Definición de objetivos'
      } else if (content.includes('progreso') || content.includes('seguimiento')) {
        return 'Seguimiento de progreso'
      } else if (content.includes('problema') || content.includes('bloqueo')) {
        return 'Resolución de problemas'
      } else if (content.includes('equipo') || content.includes('team')) {
        return 'Gestión de equipo'
      } else if (content.includes('estrategia')) {
        return 'Planificación estratégica'
      }

      // Fallback: use first few words
      const words = firstUserMessage.split(' ').slice(0, 4).join(' ')
      return words.length > 3 ? `${words}...` : 'Nueva conversación'
    }

    // Default based on role
    const roleTitles = {
      corporativo: 'Estrategia corporativa',
      gerente: 'Gestión de equipo',
      empleado: 'Consulta OKR'
    }

    return roleTitles[userRole as keyof typeof roleTitles] || 'Nueva conversación'
  }

  /**
   * Infer session type from topics
   */
  private inferSessionType(topics: string[]): 'strategy' | 'tracking' | 'problem_solving' | 'general' {
    if (topics.includes('bloqueos') || topics.includes('problema')) {
      return 'problem_solving'
    } else if (topics.includes('progreso') || topics.includes('seguimiento')) {
      return 'tracking'
    } else if (topics.includes('objetivos') || topics.includes('estrategia')) {
      return 'strategy'
    }
    return 'general'
  }

  /**
   * Update conversation message count
   */
  private async updateConversationMessageCount(conversationId: string): Promise<void> {
    const query = `
      UPDATE ai_conversations
      SET message_count = (
        SELECT COUNT(*) FROM ai_messages WHERE conversation_id = $1
      ),
      updated_at = NOW()
      WHERE id = $1
    `

    await this.client.query(query, [conversationId])
  }
}

// Export singleton instance
export const conversationStorage = new ConversationStorage()