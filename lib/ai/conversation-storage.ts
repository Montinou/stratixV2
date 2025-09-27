import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { relations, sql, eq, desc, and, or } from 'drizzle-orm';
import { authenticatedRole, authUid, crudPolicy } from 'drizzle-orm/neon';
import { getAuthenticatedDrizzleClient, authenticatedQuery } from '@/lib/database/client';
import type { ChatMessage, ConversationContext, RecommendedAction, Citation } from './conversation-manager';

// Conversation table schema
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }),
  summary: text('summary'),
  metadata: jsonb('metadata').$type<{
    userRole: string;
    department?: string;
    companyContext?: string;
    totalMessages: number;
    lastMessageAt: Date;
  }>(),
  isActive: varchar('is_active', { length: 10 }).notNull().default('true'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes for performance
  { userIdx: index('conversations_user_idx').on(table.userId) },
  { sessionIdx: index('conversations_session_idx').on(table.sessionId) },
  { activeIdx: index('conversations_active_idx').on(table.isActive) },
  { createdAtIdx: index('conversations_created_at_idx').on(table.createdAt) },
  // RLS Policy - users can only access their own conversations
  crudPolicy({
    role: authenticatedRole,
    read: sql`user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
    modify: sql`user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
  }),
]);

// Chat messages table schema
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    suggestions?: string[];
    actions?: RecommendedAction[];
    citations?: Citation[];
    processingTime?: number;
    model?: string;
  }>(),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Indexes for performance
  { conversationIdx: index('chat_messages_conversation_idx').on(table.conversationId) },
  { messageIdx: index('chat_messages_message_idx').on(table.messageId) },
  { timestampIdx: index('chat_messages_timestamp_idx').on(table.timestamp) },
  // RLS Policy - users can only access messages from their own conversations
  crudPolicy({
    role: authenticatedRole,
    read: sql`EXISTS (
      SELECT 1 FROM conversations
      WHERE id = ${table.conversationId}
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )`,
    modify: sql`EXISTS (
      SELECT 1 FROM conversations
      WHERE id = ${table.conversationId}
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )`,
  }),
]);

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [chatMessages.conversationId],
    references: [conversations.id],
  }),
}));

export interface ConversationStorageInterface {
  createConversation(sessionId: string, userId: string, context: Partial<ConversationContext>): Promise<string>;
  saveMessage(conversationId: string, message: ChatMessage): Promise<void>;
  getConversation(sessionId: string): Promise<ConversationWithMessages | null>;
  getConversationHistory(userId: string, limit?: number): Promise<ConversationSummary[]>;
  updateConversationMetadata(sessionId: string, metadata: any): Promise<void>;
  deleteConversation(sessionId: string): Promise<void>;
  getMessages(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  searchConversations(userId: string, query: string): Promise<ConversationSummary[]>;
}

export interface ConversationWithMessages {
  id: string;
  sessionId: string;
  userId: string;
  title: string | null;
  summary: string | null;
  metadata: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface ConversationSummary {
  id: string;
  sessionId: string;
  title: string | null;
  summary: string | null;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

export class ConversationStorage implements ConversationStorageInterface {

  async createConversation(
    sessionId: string,
    userId: string,
    context: Partial<ConversationContext>
  ): Promise<string> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      // Get user's internal ID from their stack user ID
      const userResult = await authenticatedQuery(
        'SELECT id FROM users WHERE stack_user_id = auth.user_id()'
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const internalUserId = userResult.rows[0].id;

      const conversationData = {
        sessionId,
        userId: internalUserId,
        title: null,
        summary: null,
        metadata: {
          userRole: context.userRole || 'empleado',
          department: context.department,
          companyContext: context.companyContext,
          totalMessages: 0,
          lastMessageAt: new Date()
        },
        isActive: 'true' as const
      };

      const result = await db.insert(conversations).values(conversationData).returning({ id: conversations.id });

      return result[0].id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      // Save the message
      await db.insert(chatMessages).values({
        conversationId,
        messageId: message.id,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        timestamp: message.timestamp
      });

      // Update conversation metadata
      await db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          metadata: sql`metadata || jsonb_build_object(
            'totalMessages', COALESCE((metadata->>'totalMessages')::int, 0) + 1,
            'lastMessageAt', ${message.timestamp.toISOString()}
          )`
        })
        .where(eq(conversations.id, conversationId));

    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async getConversation(sessionId: string): Promise<ConversationWithMessages | null> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      // Get conversation with messages
      const conversationResult = await db
        .select()
        .from(conversations)
        .where(eq(conversations.sessionId, sessionId));

      if (!conversationResult || conversationResult.length === 0) {
        return null;
      }

      const conversation = conversationResult[0];

      // Get messages for this conversation
      const messagesResult = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversation.id))
        .orderBy(chatMessages.timestamp);

      const messages: ChatMessage[] = messagesResult.map(msg => ({
        id: msg.messageId,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata || undefined
      }));

      return {
        id: conversation.id,
        sessionId: conversation.sessionId,
        userId: conversation.userId,
        title: conversation.title,
        summary: conversation.summary,
        metadata: conversation.metadata,
        isActive: conversation.isActive === 'true',
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages
      };

    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  async getConversationHistory(userId: string, limit: number = 20): Promise<ConversationSummary[]> {
    try {
      const result = await authenticatedQuery(`
        SELECT
          c.id,
          c.session_id,
          c.title,
          c.summary,
          c.metadata->>'totalMessages' as message_count,
          c.metadata->>'lastMessageAt' as last_message_at,
          c.created_at
        FROM conversations c
        WHERE c.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        ORDER BY c.updated_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        title: row.title,
        summary: row.summary,
        messageCount: parseInt(row.message_count || '0'),
        lastMessageAt: new Date(row.last_message_at || row.created_at),
        createdAt: new Date(row.created_at)
      }));

    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async updateConversationMetadata(sessionId: string, metadata: any): Promise<void> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      await db
        .update(conversations)
        .set({
          metadata: sql`metadata || ${JSON.stringify(metadata)}`,
          updatedAt: new Date()
        })
        .where(eq(conversations.sessionId, sessionId));

    } catch (error) {
      console.error('Error updating conversation metadata:', error);
      throw error;
    }
  }

  async deleteConversation(sessionId: string): Promise<void> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      await db
        .delete(conversations)
        .where(eq(conversations.sessionId, sessionId));

    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const db = await getAuthenticatedDrizzleClient();

      const messagesResult = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(desc(chatMessages.timestamp))
        .limit(limit);

      return messagesResult.reverse().map(msg => ({
        id: msg.messageId,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata || undefined
      }));

    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async searchConversations(userId: string, query: string): Promise<ConversationSummary[]> {
    try {
      const result = await authenticatedQuery(`
        SELECT DISTINCT
          c.id,
          c.session_id,
          c.title,
          c.summary,
          c.metadata->>'totalMessages' as message_count,
          c.metadata->>'lastMessageAt' as last_message_at,
          c.created_at,
          ts_rank(to_tsvector('spanish', COALESCE(c.title, '') || ' ' || COALESCE(c.summary, '')), plainto_tsquery('spanish', $2)) as rank
        FROM conversations c
        LEFT JOIN chat_messages cm ON c.id = cm.conversation_id
        WHERE c.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        AND (
          to_tsvector('spanish', COALESCE(c.title, '') || ' ' || COALESCE(c.summary, '')) @@ plainto_tsquery('spanish', $2)
          OR to_tsvector('spanish', cm.content) @@ plainto_tsquery('spanish', $2)
        )
        ORDER BY rank DESC, c.updated_at DESC
        LIMIT 10
      `, [userId, query]);

      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        title: row.title,
        summary: row.summary,
        messageCount: parseInt(row.message_count || '0'),
        lastMessageAt: new Date(row.last_message_at || row.created_at),
        createdAt: new Date(row.created_at)
      }));

    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  // Generate conversation title based on first few messages
  async generateConversationTitle(sessionId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(sessionId);
      if (!conversation || conversation.title) {
        return; // Already has a title or doesn't exist
      }

      // Get first few user messages
      const userMessages = conversation.messages
        .filter(msg => msg.role === 'user')
        .slice(0, 3)
        .map(msg => msg.content)
        .join(' ');

      if (!userMessages.trim()) {
        return;
      }

      // Simple title generation based on content
      let title = userMessages.substring(0, 60);
      if (userMessages.length > 60) {
        title += '...';
      }

      // Clean up the title
      title = title.replace(/\n/g, ' ').trim();

      const db = await getAuthenticatedDrizzleClient();
      await db
        .update(conversations)
        .set({ title })
        .where(eq(conversations.sessionId, sessionId));

    } catch (error) {
      console.error('Error generating conversation title:', error);
      // Don't throw - this is not critical
    }
  }

  // Export conversation to different formats
  async exportConversation(sessionId: string, format: 'json' | 'markdown' = 'json'): Promise<string> {
    try {
      const conversation = await this.getConversation(sessionId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (format === 'json') {
        return JSON.stringify(conversation, null, 2);
      }

      if (format === 'markdown') {
        let markdown = `# ${conversation.title || 'Conversación'}\n\n`;
        markdown += `**Fecha**: ${conversation.createdAt.toLocaleDateString('es-ES')}\n`;
        markdown += `**Mensajes**: ${conversation.messages.length}\n\n`;

        conversation.messages.forEach(msg => {
          const time = msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          const sender = msg.role === 'user' ? '👤 Usuario' : '🤖 Asistente';
          markdown += `## ${sender} (${time})\n\n${msg.content}\n\n`;
        });

        return markdown;
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw error;
    }
  }

  // Analytics methods
  async getConversationStats(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    activeConversations: number;
  }> {
    try {
      const result = await authenticatedQuery(`
        SELECT
          COUNT(c.id) as total_conversations,
          SUM(COALESCE((c.metadata->>'totalMessages')::int, 0)) as total_messages,
          COUNT(CASE WHEN c.is_active = 'true' THEN 1 END) as active_conversations
        FROM conversations c
        WHERE c.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      `, []);

      const stats = result.rows[0];
      const totalConversations = parseInt(stats.total_conversations || '0');
      const totalMessages = parseInt(stats.total_messages || '0');

      return {
        totalConversations,
        totalMessages,
        averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
        activeConversations: parseInt(stats.active_conversations || '0')
      };

    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw error;
    }
  }
}

// Singleton instance
export const conversationStorage = new ConversationStorage();