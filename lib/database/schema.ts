import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
  primaryKey,
  jsonb,
  boolean,
  numeric,
  bigint
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { authenticatedRole, authUid, crudPolicy } from 'drizzle-orm/neon';

// Enums for status and role types
export const userRoleEnum = pgEnum('user_role', ['corporativo', 'gerente', 'empleado']);
export const objectiveStatusEnum = pgEnum('objective_status', ['draft', 'in_progress', 'completed', 'cancelled']);
export const initiativeStatusEnum = pgEnum('initiative_status', ['planning', 'in_progress', 'completed', 'cancelled']);
export const activityStatusEnum = pgEnum('activity_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// AI Infrastructure enums
export const aiOperationTypeEnum = pgEnum('ai_operation_type', ['text_generation', 'chat_completion', 'embedding', 'analysis']);
export const aiProviderEnum = pgEnum('ai_provider', ['openai', 'anthropic', 'google', 'vercel']);
export const benchmarkCategoryEnum = pgEnum('benchmark_category', ['text_generation', 'chat_completion', 'embedding', 'analysis']);
export const conversationMoodEnum = pgEnum('conversation_mood', ['positive', 'neutral', 'frustrated']);

// NOTE: Using standard Neon Auth approach - no custom users table needed
// The neon_auth.users_sync table automatically syncs with Stack Auth
// and provides all user information we need

// Companies table - organization information
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  industry: varchar('industry', { length: 100 }),
  size: varchar('size', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { nameIdx: index('companies_name_idx').on(table.name) },
  // RLS Policy - authenticated users can read companies they're associated with
  crudPolicy({
    role: authenticatedRole,
    read: sql`EXISTS (
      SELECT 1 FROM profiles
      WHERE company_id = ${table.id}
      AND user_id = auth.user_id()
    )`,
    modify: sql`EXISTS (
      SELECT 1 FROM profiles
      WHERE company_id = ${table.id}
      AND user_id = auth.user_id()
      AND role_type = 'corporativo'
    )`,
  }),
]);

// Profiles table - detailed user profile information linked to Neon Auth users
export const profiles = pgTable('profiles', {
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .primaryKey()
    .default(sql`auth.user_id()`), // Direct reference to neon_auth.users_sync.id
  fullName: varchar('full_name', { length: 255 }).notNull(),
  roleType: userRoleEnum('role_type').notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // Multi-tenancy support
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { companyIdx: index('profiles_company_idx').on(table.companyId) },
  { roleIdx: index('profiles_role_idx').on(table.roleType) },
  { departmentIdx: index('profiles_department_idx').on(table.department) },
  { tenantIdx: index('profiles_tenant_idx').on(table.tenantId) },
  // RLS Policy - users can only access their own profile (standard Neon Auth)
  crudPolicy({
    role: authenticatedRole,
    read: sql`${table.userId} = auth.user_id()`,
    modify: sql`${table.userId} = auth.user_id()`,
  }),
]);

// Objectives table - high-level OKR objectives
export const objectives = pgTable('objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  department: varchar('department', { length: 100 }).notNull(),
  status: objectiveStatusEnum('status').notNull().default('draft'),
  priority: priorityEnum('priority').notNull().default('medium'),
  progress: integer('progress').default(0),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  ownerId: varchar('owner_id', { length: 255 })
    .notNull()
    .default(sql`auth.user_id()`), // Direct reference to neon_auth.users_sync.id
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // Multi-tenancy support
  tenantId: uuid('tenant_id').notNull(),
  // Soft delete support
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { ownerIdx: index('objectives_owner_idx').on(table.ownerId) },
  { companyIdx: index('objectives_company_idx').on(table.companyId) },
  { departmentIdx: index('objectives_department_idx').on(table.department) },
  { statusIdx: index('objectives_status_idx').on(table.status) },
  { tenantIdx: index('objectives_tenant_idx').on(table.tenantId) },
  { dateRangeIdx: index('objectives_date_range_idx').on(table.startDate, table.endDate) },
  // RLS Policy with role-based access
  crudPolicy({
    role: authenticatedRole,
    read: sql`
      ${table.ownerId} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.user_id()
        AND (
          role_type = 'corporativo'
          OR (role_type = 'gerente' AND department = ${table.department})
        )
      )
    `,
    modify: sql`
      ${table.ownerId} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.user_id()
        AND role_type = 'corporativo'
      )
    `,
  }),
]);

// Initiatives table - strategic initiatives that support objectives
export const initiatives = pgTable('initiatives', {
  id: uuid('id').defaultRandom().primaryKey(),
  objectiveId: uuid('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: initiativeStatusEnum('status').notNull().default('planning'),
  priority: priorityEnum('priority').notNull().default('medium'),
  progress: integer('progress').default(0),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  ownerId: varchar('owner_id', { length: 255 })
    .notNull()
    .default(sql`auth.user_id()`),
  // Multi-tenancy support
  tenantId: uuid('tenant_id').notNull(),
  // Soft delete support
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { objectiveIdx: index('initiatives_objective_idx').on(table.objectiveId) },
  { ownerIdx: index('initiatives_owner_idx').on(table.ownerId) },
  { statusIdx: index('initiatives_status_idx').on(table.status) },
  { tenantIdx: index('initiatives_tenant_idx').on(table.tenantId) },
  { dateRangeIdx: index('initiatives_date_range_idx').on(table.startDate, table.endDate) },
  // RLS Policy - inherit access from parent objective
  crudPolicy({
    role: authenticatedRole,
    read: sql`
      ${table.ownerId} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM objectives o, profiles p
        WHERE o.id = ${table.objectiveId}
        AND p.user_id = auth.user_id()
        AND (
          o.owner_id = p.user_id
          OR p.role_type = 'corporativo' 
          OR (p.role_type = 'gerente' AND p.department = o.department)
        )
      )
    `,
    modify: sql`
      ${table.ownerId} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.user_id()
        AND role_type = 'corporativo'
      )
    `,
  }),
]);

// Activities table - concrete tasks that implement initiatives
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: activityStatusEnum('status').notNull().default('todo'),
  priority: priorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date').notNull(),
  assignedTo: varchar('assigned_to', { length: 255 })
    .notNull()
    .default(sql`auth.user_id()`),
  // Multi-tenancy support
  tenantId: uuid('tenant_id').notNull(),
  // Soft delete support
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { initiativeIdx: index('activities_initiative_idx').on(table.initiativeId) },
  { assigneeIdx: index('activities_assignee_idx').on(table.assignedTo) },
  { statusIdx: index('activities_status_idx').on(table.status) },
  { tenantIdx: index('activities_tenant_idx').on(table.tenantId) },
  { dueDateIdx: index('activities_due_date_idx').on(table.dueDate) },
  // RLS Policy - users can see activities assigned to them or that they have access to via initiatives
  crudPolicy({
    role: authenticatedRole,
    read: sql`
      ${table.assignedTo} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM initiatives i, objectives o, profiles p
        WHERE i.id = ${table.initiativeId}
        AND o.id = i.objective_id
        AND p.user_id = auth.user_id()
        AND (
          i.owner_id = p.user_id
          OR o.owner_id = p.user_id
          OR p.role_type = 'corporativo' 
          OR (p.role_type = 'gerente' AND p.department = o.department)
        )
      )
    `,
    modify: sql`
      ${table.assignedTo} = auth.user_id()
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.user_id()
        AND role_type IN ('corporativo', 'gerente')
      )
    `,
  }),
]);

// Relations definitions for type-safe joins
// Note: No users relations needed - using standard Neon Auth with neon_auth.users_sync

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  objectives: many(objectives),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  // Note: No user relation needed - userId directly references neon_auth.users_sync.id
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  // Note: No owner relation needed - ownerId directly references neon_auth.users_sync.id
  company: one(companies, {
    fields: [objectives.companyId],
    references: [companies.id],
  }),

  initiatives: many(initiatives),
}));

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [initiatives.objectiveId],
    references: [objectives.id],
  }),
  // Note: No owner relation needed - ownerId directly references neon_auth.users_sync.id
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [activities.initiativeId],
    references: [initiatives.id],
  }),
  // Note: No assignee relation needed - assignedTo directly references neon_auth.users_sync.id
}));

// ========== AI INFRASTRUCTURE TABLES ==========

// AI Rate Limiting table - stores rate limit data for users/identifiers
export const aiRateLimits = pgTable('ai_rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  requestCount: integer('request_count').default(0).notNull(),
  tokenCount: integer('token_count').default(0).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  { identifierIdx: index('ai_rate_limits_identifier_idx').on(table.identifier) },
  { windowIdx: index('ai_rate_limits_window_idx').on(table.windowStart, table.windowEnd) },
  { tenantIdx: index('ai_rate_limits_tenant_idx').on(table.tenantId) },
  { lastActivityIdx: index('ai_rate_limits_last_activity_idx').on(table.lastActivity) },
]);

// AI Performance Metrics table - stores performance data for AI operations
export const aiPerformanceMetrics = pgTable('ai_performance_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: varchar('request_id', { length: 255 }).notNull().unique(),
  operation: varchar('operation', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  provider: aiProviderEnum('provider').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  duration: integer('duration').notNull(), // milliseconds
  tokensInput: integer('tokens_input').default(0).notNull(),
  tokensOutput: integer('tokens_output').default(0).notNull(),
  cost: numeric('cost', { precision: 10, scale: 6 }).default('0').notNull(),
  success: boolean('success').notNull(),
  error: text('error'),
  qualityScore: integer('quality_score'),
  userId: varchar('user_id', { length: 255 }),
  metadata: jsonb('metadata'),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  { requestIdIdx: index('ai_perf_metrics_request_id_idx').on(table.requestId) },
  { operationIdx: index('ai_perf_metrics_operation_idx').on(table.operation) },
  { modelIdx: index('ai_perf_metrics_model_idx').on(table.model) },
  { providerIdx: index('ai_perf_metrics_provider_idx').on(table.provider) },
  { timeRangeIdx: index('ai_perf_metrics_time_range_idx').on(table.startTime, table.endTime) },
  { userIdx: index('ai_perf_metrics_user_idx').on(table.userId) },
  { tenantIdx: index('ai_perf_metrics_tenant_idx').on(table.tenantId) },
  { successIdx: index('ai_perf_metrics_success_idx').on(table.success) },
]);

// AI Conversations table - stores conversation contexts and metadata
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  userRole: userRoleEnum('user_role').notNull(),
  department: varchar('department', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  sessionStart: timestamp('session_start').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  topics: jsonb('topics'), // Array of topics as JSON
  mood: conversationMoodEnum('mood').default('neutral'),
  preferences: jsonb('preferences'), // User preferences as JSON
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  { conversationIdIdx: index('ai_conversations_id_idx').on(table.conversationId) },
  { userIdx: index('ai_conversations_user_idx').on(table.userId) },
  { lastActivityIdx: index('ai_conversations_last_activity_idx').on(table.lastActivity) },
  { tenantIdx: index('ai_conversations_tenant_idx').on(table.tenantId) },
]);

// AI Conversation Messages table - stores conversation history
export const aiConversationMessages = pgTable('ai_conversation_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull()
    .references(() => aiConversations.conversationId, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  tenantId: uuid('tenant_id'),
}, (table) => [
  { conversationIdx: index('ai_conv_messages_conversation_idx').on(table.conversationId) },
  { timestampIdx: index('ai_conv_messages_timestamp_idx').on(table.timestamp) },
  { tenantIdx: index('ai_conv_messages_tenant_idx').on(table.tenantId) },
]);

// AI Conversation Summaries table - stores conversation summaries
export const aiConversationSummaries = pgTable('ai_conversation_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull()
    .references(() => aiConversations.conversationId, { onDelete: 'cascade' }),
  keyTopics: jsonb('key_topics'), // Array of key topics
  actionItems: jsonb('action_items'), // Array of action items
  decisionsMade: jsonb('decisions_made'), // Array of decisions
  questionsAsked: jsonb('questions_asked'), // Array of questions
  progressDiscussed: jsonb('progress_discussed'), // Array of progress items
  moodIndicators: jsonb('mood_indicators'), // Array of mood indicators
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  { conversationIdx: index('ai_conv_summaries_conversation_idx').on(table.conversationId) },
  { tenantIdx: index('ai_conv_summaries_tenant_idx').on(table.tenantId) },
]);

// AI Benchmark Suites table - stores benchmark test suites
export const aiBenchmarkSuites = pgTable('ai_benchmark_suites', {
  id: uuid('id').defaultRandom().primaryKey(),
  suiteId: varchar('suite_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  modelsToTest: jsonb('models_to_test'), // Array of model names
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  { suiteIdIdx: index('ai_benchmark_suites_suite_id_idx').on(table.suiteId) },
  { tenantIdx: index('ai_benchmark_suites_tenant_idx').on(table.tenantId) },
]);

// AI Benchmark Test Cases table - stores individual benchmark test cases
export const aiBenchmarkTestCases = pgTable('ai_benchmark_test_cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  suiteId: varchar('suite_id', { length: 255 }).notNull()
    .references(() => aiBenchmarkSuites.suiteId, { onDelete: 'cascade' }),
  testCaseId: varchar('test_case_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: benchmarkCategoryEnum('category').notNull(),
  prompt: text('prompt').notNull(),
  expectedOutputType: varchar('expected_output_type', { length: 50 }).notNull(),
  expectedLatency: integer('expected_latency').notNull(),
  qualityCriteria: jsonb('quality_criteria'), // Quality criteria as JSON
  metadata: jsonb('metadata'),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  { suiteIdIdx: index('ai_benchmark_test_cases_suite_id_idx').on(table.suiteId) },
  { testCaseIdIdx: index('ai_benchmark_test_cases_test_case_id_idx').on(table.testCaseId) },
  { categoryIdx: index('ai_benchmark_test_cases_category_idx').on(table.category) },
  { tenantIdx: index('ai_benchmark_test_cases_tenant_idx').on(table.tenantId) },
]);

// AI Benchmark Results table - stores benchmark execution results
export const aiBenchmarkResults = pgTable('ai_benchmark_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  testCaseId: varchar('test_case_id', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  provider: aiProviderEnum('provider').notNull(),
  success: boolean('success').notNull(),
  latency: integer('latency').notNull(),
  cost: numeric('cost', { precision: 10, scale: 6 }).default('0').notNull(),
  qualityScore: integer('quality_score').default(0).notNull(),
  outputText: text('output_text'),
  tokensInput: integer('tokens_input').default(0).notNull(),
  tokensOutput: integer('tokens_output').default(0).notNull(),
  error: text('error'),
  metadata: jsonb('metadata'),
  tenantId: uuid('tenant_id'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  { testCaseIdIdx: index('ai_benchmark_results_test_case_id_idx').on(table.testCaseId) },
  { modelIdx: index('ai_benchmark_results_model_idx').on(table.model) },
  { providerIdx: index('ai_benchmark_results_provider_idx').on(table.provider) },
  { timestampIdx: index('ai_benchmark_results_timestamp_idx').on(table.timestamp) },
  { successIdx: index('ai_benchmark_results_success_idx').on(table.success) },
  { tenantIdx: index('ai_benchmark_results_tenant_idx').on(table.tenantId) },
]);

// AI Infrastructure Relations
export const aiRateLimitsRelations = relations(aiRateLimits, ({ one }) => ({}));

export const aiPerformanceMetricsRelations = relations(aiPerformanceMetrics, ({ one }) => ({}));

export const aiConversationsRelations = relations(aiConversations, ({ many }) => ({
  messages: many(aiConversationMessages),
  summaries: many(aiConversationSummaries),
}));

export const aiConversationMessagesRelations = relations(aiConversationMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiConversationMessages.conversationId],
    references: [aiConversations.conversationId],
  }),
}));

export const aiConversationSummariesRelations = relations(aiConversationSummaries, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiConversationSummaries.conversationId],
    references: [aiConversations.conversationId],
  }),
}));

export const aiBenchmarkSuitesRelations = relations(aiBenchmarkSuites, ({ many }) => ({
  testCases: many(aiBenchmarkTestCases),
}));

export const aiBenchmarkTestCasesRelations = relations(aiBenchmarkTestCases, ({ one }) => ({
  suite: one(aiBenchmarkSuites, {
    fields: [aiBenchmarkTestCases.suiteId],
    references: [aiBenchmarkSuites.suiteId],
  }),
}));

export const aiBenchmarkResultsRelations = relations(aiBenchmarkResults, ({ one }) => ({}));

// Export all tables for use in queries and migrations
export const schema = {
  // Note: No users table needed - using standard Neon Auth with neon_auth.users_sync
  companies,
  profiles,
  objectives,
  initiatives,
  activities,
  // AI Infrastructure tables
  aiRateLimits,
  aiPerformanceMetrics,
  aiConversations,
  aiConversationMessages,
  aiConversationSummaries,
  aiBenchmarkSuites,
  aiBenchmarkTestCases,
  aiBenchmarkResults,
  // Relations
  // Note: No usersRelations needed - using standard Neon Auth
  companiesRelations,
  profilesRelations,
  objectivesRelations,
  initiativesRelations,
  activitiesRelations,
  // AI Infrastructure Relations
  aiRateLimitsRelations,
  aiPerformanceMetricsRelations,
  aiConversationsRelations,
  aiConversationMessagesRelations,
  aiConversationSummariesRelations,
  aiBenchmarkSuitesRelations,
  aiBenchmarkTestCasesRelations,
  aiBenchmarkResultsRelations,
  // Enums
  userRoleEnum,
  objectiveStatusEnum,
  initiativeStatusEnum,
  activityStatusEnum,
  priorityEnum,
  // AI Infrastructure Enums
  aiOperationTypeEnum,
  aiProviderEnum,
  benchmarkCategoryEnum,
  conversationMoodEnum,
};
