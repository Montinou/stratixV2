/**
 * AI Conversation Manager - Redis-enhanced implementation with database persistence
 * L1: Redis session caching -> L2: Database persistence
 * Optimized for real-time conversation management with intelligent memory usage
 */

// Export Redis implementation as primary
export * from './conversation-manager-redis'
export { redisConversationManager as conversationManager } from './conversation-manager-redis'

// Also export database implementation for direct access when needed
export { conversationManagerDB } from './conversation-manager-redis'