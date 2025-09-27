import { conversationManager } from './conversation-manager'
import { conversationStorage } from './conversation-storage'
import type { CoreMessage } from 'ai'

// Session configuration
const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
const CLEANUP_INTERVAL = 15 * 60 * 1000 // 15 minutes in milliseconds
const MAX_ACTIVE_SESSIONS = 100 // Maximum active sessions before cleanup

// Session metadata interface
export interface ChatSession {
  conversationId: string
  userId: string
  startTime: Date
  lastActivity: Date
  messageCount: number
  sessionType: 'strategy' | 'tracking' | 'problem_solving' | 'general'
  urgency: 'low' | 'medium' | 'high'
  isPersisted: boolean
}

export class ChatSessionManager {
  private activeSessions = new Map<string, ChatSession>()
  private cleanupTimer: NodeJS.Timeout | null = null
  private initialized = false

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Initialize database tables for conversation storage
      await conversationStorage.initializeTables()

      // Start periodic cleanup
      this.startPeriodicCleanup()

      this.initialized = true
      console.log('Chat session manager initialized')
    } catch (error) {
      console.error('Failed to initialize chat session manager:', error)
      throw new Error('Session manager initialization failed')
    }
  }

  /**
   * Create or get existing chat session
   */
  async getOrCreateSession(
    conversationId: string,
    userId: string,
    sessionMetadata?: {
      sessionType?: 'strategy' | 'tracking' | 'problem_solving' | 'general'
      urgency?: 'low' | 'medium' | 'high'
    }
  ): Promise<ChatSession> {
    let session = this.activeSessions.get(conversationId)

    if (session) {
      // Update last activity
      session.lastActivity = new Date()
      return session
    }

    // Try to load from database
    const stored = await conversationStorage.loadConversation(conversationId, userId)

    if (stored.conversation && stored.messages.length > 0) {
      // Restore session from database
      session = {
        conversationId,
        userId,
        startTime: new Date(stored.conversation.created_at),
        lastActivity: new Date(stored.conversation.updated_at),
        messageCount: stored.conversation.message_count,
        sessionType: stored.conversation.session_type as any,
        urgency: stored.conversation.urgency as any,
        isPersisted: true
      }

      // Restore conversation to memory manager
      const messages: CoreMessage[] = stored.messages.map(msg => ({
        role: msg.role as any,
        content: msg.content
      }))

      // We'll need to rebuild the context from stored messages
      // This is a simplified restoration - in production you might store more context
      this.activeSessions.set(conversationId, session)

      console.log(`Restored session ${conversationId} with ${messages.length} messages`)
      return session
    }

    // Create new session
    session = {
      conversationId,
      userId,
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      sessionType: sessionMetadata?.sessionType || 'general',
      urgency: sessionMetadata?.urgency || 'low',
      isPersisted: false
    }

    this.activeSessions.set(conversationId, session)

    console.log(`Created new session ${conversationId} for user ${userId}`)
    return session
  }

  /**
   * Update session with new message
   */
  async updateSession(
    conversationId: string,
    message: CoreMessage,
    sessionMetadata?: {
      sessionType?: 'strategy' | 'tracking' | 'problem_solving' | 'general'
      urgency?: 'low' | 'medium' | 'high'
    }
  ): Promise<void> {
    const session = this.activeSessions.get(conversationId)
    if (!session) {
      console.warn(`Session ${conversationId} not found for update`)
      return
    }

    // Update session metadata
    session.lastActivity = new Date()
    session.messageCount++

    if (sessionMetadata?.sessionType) {
      session.sessionType = sessionMetadata.sessionType
    }

    if (sessionMetadata?.urgency) {
      session.urgency = sessionMetadata.urgency
    }

    // Persist to database periodically (every 5 messages or high urgency)
    const shouldPersist =
      !session.isPersisted ||
      session.messageCount % 5 === 0 ||
      session.urgency === 'high' ||
      sessionMetadata?.urgency === 'high'

    if (shouldPersist) {
      await this.persistSession(conversationId)
    }
  }

  /**
   * Persist session and conversation to database
   */
  async persistSession(conversationId: string): Promise<void> {
    const session = this.activeSessions.get(conversationId)
    if (!session) {
      console.warn(`Session ${conversationId} not found for persistence`)
      return
    }

    try {
      // Get conversation context from memory manager
      const context = conversationManager.getContextForAI(conversationId)

      if (context.messages.length === 0) {
        console.warn(`No messages found for conversation ${conversationId}`)
        return
      }

      // Get full conversation context for persistence
      const conversation = conversationManager['conversations'].get(conversationId)
      if (!conversation) {
        console.warn(`Conversation context not found for ${conversationId}`)
        return
      }

      // Save conversation metadata
      await conversationStorage.saveConversation(conversation)

      // Save new messages (only messages not yet persisted)
      const messagesToSave = context.messages.slice(
        session.isPersisted ? -1 : 0 // Save only last message if already persisted, all if new
      )

      if (messagesToSave.length > 0) {
        await conversationStorage.saveMessages(conversationId, messagesToSave)
      }

      session.isPersisted = true

      console.log(`Persisted session ${conversationId} with ${messagesToSave.length} new messages`)
    } catch (error) {
      console.error(`Failed to persist session ${conversationId}:`, error)
    }
  }

  /**
   * End and archive a session
   */
  async endSession(conversationId: string): Promise<void> {
    const session = this.activeSessions.get(conversationId)
    if (!session) {
      console.warn(`Session ${conversationId} not found for ending`)
      return
    }

    try {
      // Final persistence before ending
      await this.persistSession(conversationId)

      // Generate and save summary if conversation is substantial
      if (session.messageCount >= 5) {
        await this.generateConversationSummary(conversationId)
      }

      // Remove from active sessions
      this.activeSessions.delete(conversationId)

      // Clear from memory manager
      conversationManager.clearConversation(conversationId)

      console.log(`Ended session ${conversationId}`)
    } catch (error) {
      console.error(`Failed to end session ${conversationId}:`, error)
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    try {
      // End active session if exists
      if (this.activeSessions.has(conversationId)) {
        await this.endSession(conversationId)
      }

      // Archive in database
      await conversationStorage.archiveConversation(conversationId, userId)

      console.log(`Archived conversation ${conversationId}`)
    } catch (error) {
      console.error(`Failed to archive conversation ${conversationId}:`, error)
      throw new Error('Failed to archive conversation')
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    activeSessions: number
    totalMessageCount: number
    sessionsByType: Record<string, number>
    sessionsByUrgency: Record<string, number>
  } {
    const sessions = Array.from(this.activeSessions.values())

    const sessionsByType: Record<string, number> = {}
    const sessionsByUrgency: Record<string, number> = {}
    let totalMessageCount = 0

    sessions.forEach(session => {
      sessionsByType[session.sessionType] = (sessionsByType[session.sessionType] || 0) + 1
      sessionsByUrgency[session.urgency] = (sessionsByUrgency[session.urgency] || 0) + 1
      totalMessageCount += session.messageCount
    })

    return {
      activeSessions: sessions.length,
      totalMessageCount,
      sessionsByType,
      sessionsByUrgency
    }
  }

  /**
   * Get user session history
   */
  async getUserSessionHistory(
    userId: string,
    options?: {
      limit?: number
      offset?: number
      sessionType?: string
      includeArchived?: boolean
    }
  ) {
    return conversationStorage.listConversations(userId, options)
  }

  /**
   * Search user conversations
   */
  async searchUserConversations(
    userId: string,
    searchTerm: string,
    options?: { limit?: number }
  ) {
    return conversationStorage.searchConversations(userId, searchTerm, options)
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string) {
    return conversationStorage.getConversationAnalytics(userId)
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): number {
    const now = Date.now()
    let cleanedCount = 0

    for (const [conversationId, session] of this.activeSessions) {
      const isExpired = now - session.lastActivity.getTime() > SESSION_TIMEOUT

      if (isExpired) {
        // Persist before cleanup if not already persisted
        if (!session.isPersisted && session.messageCount > 0) {
          this.persistSession(conversationId).catch(error => {
            console.error(`Failed to persist session ${conversationId} during cleanup:`, error)
          })
        }

        // Clear from memory manager
        conversationManager.clearConversation(conversationId)

        // Remove from active sessions
        this.activeSessions.delete(conversationId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`)
    }

    return cleanedCount
  }

  /**
   * Cleanup oldest sessions if limit exceeded
   */
  private cleanupOldestSessions(): number {
    const sessionCount = this.activeSessions.size
    if (sessionCount <= MAX_ACTIVE_SESSIONS) {
      return 0
    }

    // Sort sessions by last activity (oldest first)
    const sortedSessions = Array.from(this.activeSessions.entries())
      .sort(([, a], [, b]) => a.lastActivity.getTime() - b.lastActivity.getTime())

    const sessionsToRemove = sessionCount - MAX_ACTIVE_SESSIONS
    let cleanedCount = 0

    for (let i = 0; i < sessionsToRemove; i++) {
      const [conversationId, session] = sortedSessions[i]

      // Persist before cleanup if not already persisted
      if (!session.isPersisted && session.messageCount > 0) {
        this.persistSession(conversationId).catch(error => {
          console.error(`Failed to persist session ${conversationId} during cleanup:`, error)
        })
      }

      // Clear from memory manager
      conversationManager.clearConversation(conversationId)

      // Remove from active sessions
      this.activeSessions.delete(conversationId)
      cleanedCount++
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} oldest sessions (limit exceeded)`)
    }

    return cleanedCount
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      try {
        this.cleanupExpiredSessions()
        this.cleanupOldestSessions()

        // Also cleanup memory manager
        conversationManager.cleanupIdleConversations()
      } catch (error) {
        console.error('Error during periodic cleanup:', error)
      }
    }, CLEANUP_INTERVAL)
  }

  /**
   * Stop periodic cleanup
   */
  private stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Generate conversation summary using AI
   */
  private async generateConversationSummary(conversationId: string): Promise<void> {
    try {
      const context = conversationManager.getContextForAI(conversationId)
      if (context.messages.length < 5) return

      // This is a simplified summary generation
      // In production, you might use AI to generate better summaries
      const userMessages = context.messages.filter(m => m.role === 'user')
      const topics = userMessages.map(m => {
        const content = m.content.toLowerCase()
        if (content.includes('objetivo')) return 'objetivos'
        if (content.includes('progreso')) return 'seguimiento'
        if (content.includes('problema')) return 'problemas'
        if (content.includes('equipo')) return 'equipo'
        return 'consulta'
      })

      const uniqueTopics = [...new Set(topics)]
      const summary = `Conversación sobre: ${uniqueTopics.join(', ')}`

      await conversationStorage.updateConversationSummary(conversationId, summary)
    } catch (error) {
      console.error(`Failed to generate summary for conversation ${conversationId}:`, error)
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down chat session manager...')

    // Stop cleanup timer
    this.stopPeriodicCleanup()

    // Persist all active sessions
    const persistPromises = Array.from(this.activeSessions.keys()).map(conversationId =>
      this.persistSession(conversationId).catch(error => {
        console.error(`Failed to persist session ${conversationId} during shutdown:`, error)
      })
    )

    await Promise.all(persistPromises)

    // Clear all sessions
    this.activeSessions.clear()

    console.log('Chat session manager shutdown complete')
  }
}

// Export singleton instance
export const chatSessionManager = new ChatSessionManager()