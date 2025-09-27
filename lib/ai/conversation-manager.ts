import type { Objective, Initiative, Activity, UserRole, Profile } from "@/lib/types/okr"

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: {
    suggestions?: string[]
    actions?: RecommendedAction[]
    citations?: Citation[]
  }
}

export interface RecommendedAction {
  type: "create_objective" | "update_progress" | "review_initiative" | "schedule_meeting"
  title: string
  description: string
  data?: any
}

export interface Citation {
  type: "objective" | "initiative" | "activity" | "document"
  id: string
  title: string
  url?: string
}

export interface ConversationContext {
  userId: string
  userRole: UserRole
  userProfile: Profile
  currentOKRs: Objective[]
  recentInitiatives: Initiative[]
  recentActivities: Activity[]
  department?: string
  companyContext?: string
  conversationHistory: ChatMessage[]
  sessionId: string
  lastUpdated: Date
}

export interface ChatRequestContext {
  currentOKRs?: Objective[]
  userRole?: UserRole
  companyContext?: string
  recentActivity?: Activity[]
}

export class ConversationManager {
  private conversations = new Map<string, ConversationContext>()
  private readonly MAX_HISTORY_LENGTH = 20
  private readonly CONTEXT_WINDOW_MINUTES = 30

  constructor() {
    // Clean up old conversations every 30 minutes
    setInterval(() => {
      this.cleanupExpiredContexts()
    }, this.CONTEXT_WINDOW_MINUTES * 60 * 1000)
  }

  async createConversation(
    userId: string,
    userProfile: Profile,
    contextData: ChatRequestContext = {}
  ): Promise<string> {
    const sessionId = this.generateSessionId()

    const context: ConversationContext = {
      userId,
      userRole: contextData.userRole || userProfile.role,
      userProfile,
      currentOKRs: contextData.currentOKRs || [],
      recentInitiatives: [],
      recentActivities: contextData.recentActivity || [],
      department: userProfile.department || undefined,
      companyContext: contextData.companyContext,
      conversationHistory: [],
      sessionId,
      lastUpdated: new Date()
    }

    this.conversations.set(sessionId, context)
    return sessionId
  }

  async addMessage(
    sessionId: string,
    message: Omit<ChatMessage, "id" | "timestamp">
  ): Promise<ChatMessage> {
    const context = this.conversations.get(sessionId)
    if (!context) {
      throw new Error(`Conversation not found: ${sessionId}`)
    }

    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      ...message,
      timestamp: new Date()
    }

    context.conversationHistory.push(chatMessage)
    context.lastUpdated = new Date()

    // Trim history if it gets too long
    if (context.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      context.conversationHistory = context.conversationHistory.slice(-this.MAX_HISTORY_LENGTH)
    }

    return chatMessage
  }

  async getConversationContext(sessionId: string): Promise<ConversationContext | null> {
    const context = this.conversations.get(sessionId)
    if (!context) {
      return null
    }

    // Check if context is still valid
    const now = new Date()
    const timeDiff = now.getTime() - context.lastUpdated.getTime()
    const isExpired = timeDiff > (this.CONTEXT_WINDOW_MINUTES * 60 * 1000)

    if (isExpired) {
      this.conversations.delete(sessionId)
      return null
    }

    return context
  }

  async updateOKRContext(
    sessionId: string,
    okrData: {
      objectives?: Objective[]
      initiatives?: Initiative[]
      activities?: Activity[]
    }
  ): Promise<void> {
    const context = this.conversations.get(sessionId)
    if (!context) {
      throw new Error(`Conversation not found: ${sessionId}`)
    }

    if (okrData.objectives) {
      context.currentOKRs = okrData.objectives
    }
    if (okrData.initiatives) {
      context.recentInitiatives = okrData.initiatives
    }
    if (okrData.activities) {
      context.recentActivities = okrData.activities
    }

    context.lastUpdated = new Date()
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<ChatMessage[]> {
    const context = this.conversations.get(sessionId)
    if (!context) {
      return []
    }

    return context.conversationHistory.slice(-count)
  }

  async clearConversation(sessionId: string): Promise<void> {
    this.conversations.delete(sessionId)
  }

  private cleanupExpiredContexts(): void {
    const now = new Date()
    const expiredSessions: string[] = []

    for (const [sessionId, context] of this.conversations.entries()) {
      const timeDiff = now.getTime() - context.lastUpdated.getTime()
      const isExpired = timeDiff > (this.CONTEXT_WINDOW_MINUTES * 60 * 1000)

      if (isExpired) {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach(sessionId => {
      this.conversations.delete(sessionId)
    })

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired conversation contexts`)
    }
  }

  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get conversation summary for context building
  async getConversationSummary(sessionId: string): Promise<string> {
    const context = await this.getConversationContext(sessionId)
    if (!context || context.conversationHistory.length === 0) {
      return ""
    }

    const recentMessages = context.conversationHistory.slice(-6)
    const summary = recentMessages
      .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join("\n")

    return `Historial reciente de conversación:\n${summary}`
  }

  // Get active conversations count for monitoring
  getActiveConversationsCount(): number {
    return this.conversations.size
  }

  // Get conversation metrics for analytics
  getConversationMetrics(sessionId: string): {
    messageCount: number
    duration: number
    lastActivity: Date
  } | null {
    const context = this.conversations.get(sessionId)
    if (!context) {
      return null
    }

    const firstMessage = context.conversationHistory[0]
    const duration = firstMessage
      ? context.lastUpdated.getTime() - firstMessage.timestamp.getTime()
      : 0

    return {
      messageCount: context.conversationHistory.length,
      duration,
      lastActivity: context.lastUpdated
    }
  }
}

// Singleton instance for the application
export const conversationManager = new ConversationManager()