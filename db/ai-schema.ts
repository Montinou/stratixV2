import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  jsonb,
  boolean,
  numeric,
  bigint,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersSyncInNeonAuth } from './neon_auth_schema';
import { companies } from './okr-schema';

// AI Infrastructure enums
export const aiOperationTypeEnum = pgEnum('ai_operation_type', ['text_generation', 'chat_completion', 'embedding', 'analysis']);
export const aiProviderEnum = pgEnum('ai_provider', ['openai', 'anthropic', 'google', 'vercel']);
export const benchmarkCategoryEnum = pgEnum('benchmark_category', ['text_generation', 'chat_completion', 'embedding', 'analysis']);
export const conversationMoodEnum = pgEnum('conversation_mood', ['positive', 'neutral', 'frustrated']);

// AI Usage Tracking table - monitor AI service consumption
export const aiUsageTracking = pgTable('ai_usage_tracking', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => usersSyncInNeonAuth.id),
  operationType: aiOperationTypeEnum('operation_type').notNull(),
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  tokensUsed: integer('tokens_used').notNull(),
  requestCost: numeric('request_cost', { precision: 10, scale: 6 }),
  responseTimeMs: integer('response_time_ms'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_usage_user_idx').on(table.userId),
  index('ai_usage_operation_idx').on(table.operationType),
  index('ai_usage_provider_idx').on(table.provider),
  index('ai_usage_company_idx').on(table.companyId),
  index('ai_usage_tenant_idx').on(table.tenantId),
  index('ai_usage_created_at_idx').on(table.createdAt),
]);

// AI Performance Benchmarks table - track AI model performance metrics
export const aiPerformanceBenchmarks = pgTable('ai_performance_benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: benchmarkCategoryEnum('category').notNull(),
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  avgResponseTime: numeric('avg_response_time', { precision: 8, scale: 2 }).notNull(),
  avgTokensPerRequest: numeric('avg_tokens_per_request', { precision: 8, scale: 2 }).notNull(),
  avgCostPerRequest: numeric('avg_cost_per_request', { precision: 10, scale: 6 }).notNull(),
  successRate: numeric('success_rate', { precision: 5, scale: 2 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  measurementDate: timestamp('measurement_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_benchmarks_category_idx').on(table.category),
  index('ai_benchmarks_provider_idx').on(table.provider),
  index('ai_benchmarks_company_idx').on(table.companyId),
  index('ai_benchmarks_tenant_idx').on(table.tenantId),
  index('ai_benchmarks_date_idx').on(table.measurementDate),
]);

// Conversations table - track AI conversation sessions
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => usersSyncInNeonAuth.id),
  title: varchar('title', { length: 500 }),
  context: jsonb('context'), // Stores conversation context and metadata
  mood: conversationMoodEnum('mood').default('neutral'),
  tokensUsed: integer('tokens_used').default(0),
  messageCount: integer('message_count').default(0),
  lastMessageAt: timestamp('last_message_at'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('conversations_user_idx').on(table.userId),
  index('conversations_company_idx').on(table.companyId),
  index('conversations_tenant_idx').on(table.tenantId),
  index('conversations_last_message_idx').on(table.lastMessageAt),
]);

// Conversation Messages table - individual messages in conversations
export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // Additional message metadata
  tokensUsed: integer('tokens_used'),
  responseTimeMs: integer('response_time_ms'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('conversation_messages_conversation_idx').on(table.conversationId),
  index('conversation_messages_role_idx').on(table.role),
  index('conversation_messages_company_idx').on(table.companyId),
  index('conversation_messages_tenant_idx').on(table.tenantId),
  index('conversation_messages_created_at_idx').on(table.createdAt),
]);

// AI Insights table - generated insights and recommendations
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => usersSyncInNeonAuth.id),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'performance', 'recommendations', 'trends', etc.
  entityType: varchar('entity_type', { length: 50 }), // 'objective', 'initiative', 'activity', 'general'
  entityId: uuid('entity_id'), // ID of related OKR entity
  confidence: numeric('confidence', { precision: 5, scale: 2 }), // AI confidence score
  isRead: boolean('is_read').default(false),
  isActionable: boolean('is_actionable').default(false),
  metadata: jsonb('metadata'), // Additional insight data
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // Optional expiration for time-sensitive insights
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_insights_user_idx').on(table.userId),
  index('ai_insights_category_idx').on(table.category),
  index('ai_insights_entity_idx').on(table.entityType, table.entityId),
  index('ai_insights_company_idx').on(table.companyId),
  index('ai_insights_tenant_idx').on(table.tenantId),
  index('ai_insights_generated_at_idx').on(table.generatedAt),
  index('ai_insights_is_read_idx').on(table.isRead),
]);

// Knowledge Base table - store AI knowledge and context
export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'okr_methodology', 'best_practices', 'company_specific', etc.
  tags: jsonb('tags'), // Array of tags for categorization
  embedding: jsonb('embedding'), // Vector embedding for semantic search
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(0), // Higher numbers = higher priority
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }), // null = global knowledge
  tenantId: uuid('tenant_id'),
  createdBy: text('created_by').references(() => usersSyncInNeonAuth.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('knowledge_base_category_idx').on(table.category),
  index('knowledge_base_company_idx').on(table.companyId),
  index('knowledge_base_tenant_idx').on(table.tenantId),
  index('knowledge_base_is_active_idx').on(table.isActive),
  index('knowledge_base_priority_idx').on(table.priority),
]);

// AI Configuration table - store AI settings and preferences
export const aiConfiguration = pgTable('ai_configuration', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => usersSyncInNeonAuth.id), // null = company-wide config
  configKey: varchar('config_key', { length: 100 }).notNull(),
  configValue: jsonb('config_value').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ai_config_user_idx').on(table.userId),
  index('ai_config_key_idx').on(table.configKey),
  index('ai_config_company_idx').on(table.companyId),
  index('ai_config_tenant_idx').on(table.tenantId),
  index('ai_config_is_active_idx').on(table.isActive),
]);

// Relations
export const aiUsageTrackingRelations = relations(aiUsageTracking, ({ one }) => ({
  user: one(usersSyncInNeonAuth, {
    fields: [aiUsageTracking.userId],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [aiUsageTracking.companyId],
    references: [companies.id],
  }),
}));

export const aiPerformanceBenchmarksRelations = relations(aiPerformanceBenchmarks, ({ one }) => ({
  company: one(companies, {
    fields: [aiPerformanceBenchmarks.companyId],
    references: [companies.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(usersSyncInNeonAuth, {
    fields: [conversations.userId],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [conversations.companyId],
    references: [companies.id],
  }),
  messages: many(conversationMessages),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
  company: one(companies, {
    fields: [conversationMessages.companyId],
    references: [companies.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(usersSyncInNeonAuth, {
    fields: [aiInsights.userId],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [aiInsights.companyId],
    references: [companies.id],
  }),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
  company: one(companies, {
    fields: [knowledgeBase.companyId],
    references: [companies.id],
  }),
  creator: one(usersSyncInNeonAuth, {
    fields: [knowledgeBase.createdBy],
    references: [usersSyncInNeonAuth.id],
  }),
}));

export const aiConfigurationRelations = relations(aiConfiguration, ({ one }) => ({
  user: one(usersSyncInNeonAuth, {
    fields: [aiConfiguration.userId],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [aiConfiguration.companyId],
    references: [companies.id],
  }),
}));