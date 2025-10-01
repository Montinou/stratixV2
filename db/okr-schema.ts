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
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { usersSyncInNeonAuth } from './neon_auth_schema';

// Enums for OKR system
export const userRoleEnum = pgEnum('user_role', ['corporativo', 'gerente', 'empleado']);
export const objectiveStatusEnum = pgEnum('objective_status', ['draft', 'in_progress', 'completed', 'cancelled']);
export const initiativeStatusEnum = pgEnum('initiative_status', ['planning', 'in_progress', 'completed', 'cancelled']);
export const activityStatusEnum = pgEnum('activity_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);
export const onboardingStatusEnum = pgEnum('onboarding_status', ['in_progress', 'completed', 'abandoned']);
export const onboardingStepEnum = pgEnum('onboarding_step', ['create_org', 'accept_invite', 'complete_profile']);

// Companies table - organization information
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Profiles table - detailed user profile information
// Note: Uses 'id' as PK which references users.id (not neon_auth.users_sync.id)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References users.id
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('empleado'),
  department: text('department'),
  managerId: uuid('manager_id'),
  companyId: uuid('company_id'),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('profiles_tenant_idx').on(table.tenantId),
]);

// Objectives table - high-level OKR objectives
export const objectives = pgTable('objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  owner_id: uuid('owner_id').notNull(),
  department: text('department'),
  status: text('status').default('no_iniciado'),
  progress: integer('progress').default(0),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  company_id: uuid('company_id'),
  tenant_id: uuid('tenant_id'),
}, (table) => [
  index('objectives_tenant_idx').on(table.tenant_id),
]);

// Initiatives table - strategic initiatives linked to objectives
export const initiatives = pgTable('initiatives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  objective_id: uuid('objective_id').notNull(),
  owner_id: uuid('owner_id').notNull(),
  status: text('status').default('no_iniciado'),
  progress: integer('progress').default(0),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  company_id: uuid('company_id'),
  tenant_id: uuid('tenant_id'),
}, (table) => [
  index('initiatives_tenant_idx').on(table.tenant_id),
]);

// Activities table - specific activities/tasks linked to initiatives
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  initiative_id: uuid('initiative_id').notNull(),
  owner_id: uuid('owner_id').notNull(),
  status: text('status').default('no_iniciado'),
  progress: integer('progress').default(0),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  company_id: uuid('company_id'),
  tenant_id: uuid('tenant_id'),
  completedAt: timestamp('completed_at'), // Keep this for analytics
}, (table) => [
  index('activities_tenant_idx').on(table.tenant_id),
]);

// Comments table - comments for objectives, initiatives, and activities
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'objective', 'initiative', 'activity'
  entityId: uuid('entity_id').notNull(),
  authorId: text('author_id').notNull().references(() => usersSyncInNeonAuth.id),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('comments_entity_idx').on(table.entityType, table.entityId),
  index('comments_author_idx').on(table.authorId),
  index('comments_company_idx').on(table.companyId),
  index('comments_tenant_idx').on(table.tenantId),
]);

// Key Results table - specific measurable results for objectives
export const keyResults = pgTable('key_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 50 }).notNull(),
  progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0'),
  objectiveId: uuid('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => usersSyncInNeonAuth.id),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('key_results_objective_idx').on(table.objectiveId),
  index('key_results_company_idx').on(table.companyId),
  index('key_results_tenant_idx').on(table.tenantId),
]);

// Update History table - track changes to OKR entities
export const updateHistory = pgTable('update_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 20 }).notNull(), // 'objective', 'initiative', 'activity'
  entityId: uuid('entity_id').notNull(),
  field: varchar('field', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  updatedBy: text('updated_by').notNull().references(() => usersSyncInNeonAuth.id),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('update_history_entity_idx').on(table.entityType, table.entityId),
  index('update_history_updated_by_idx').on(table.updatedBy),
  index('update_history_company_idx').on(table.companyId),
  index('update_history_tenant_idx').on(table.tenantId),
]);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  objectives: many(objectives),
  initiatives: many(initiatives),
  activities: many(activities),
  comments: many(comments),
  keyResults: many(keyResults),
  updateHistory: many(updateHistory),
}));

// Simplified relations for profiles
export const profilesRelations = relations(profiles, ({ one }) => ({
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  company: one(companies, {
    fields: [objectives.companyId],
    references: [companies.id],
  }),
  creator: one(usersSyncInNeonAuth, {
    fields: [objectives.createdBy],
    references: [usersSyncInNeonAuth.id],
    relationName: 'createdBy',
  }),
  assignee: one(usersSyncInNeonAuth, {
    fields: [objectives.assignedTo],
    references: [usersSyncInNeonAuth.id],
    relationName: 'assignedTo',
  }),
  initiatives: many(initiatives),
  keyResults: many(keyResults),
  comments: many(comments),
  updateHistory: many(updateHistory),
}));

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [initiatives.objectiveId],
    references: [objectives.id],
  }),
  company: one(companies, {
    fields: [initiatives.companyId],
    references: [companies.id],
  }),
  creator: one(usersSyncInNeonAuth, {
    fields: [initiatives.createdBy],
    references: [usersSyncInNeonAuth.id],
    relationName: 'createdBy',
  }),
  assignee: one(usersSyncInNeonAuth, {
    fields: [initiatives.assignedTo],
    references: [usersSyncInNeonAuth.id],
    relationName: 'assignedTo',
  }),
  activities: many(activities),
  comments: many(comments),
  updateHistory: many(updateHistory),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  initiative: one(initiatives, {
    fields: [activities.initiativeId],
    references: [initiatives.id],
  }),
  company: one(companies, {
    fields: [activities.companyId],
    references: [companies.id],
  }),
  creator: one(usersSyncInNeonAuth, {
    fields: [activities.createdBy],
    references: [usersSyncInNeonAuth.id],
    relationName: 'createdBy',
  }),
  assignee: one(usersSyncInNeonAuth, {
    fields: [activities.assignedTo],
    references: [usersSyncInNeonAuth.id],
    relationName: 'assignedTo',
  }),
  comments: many(comments),
  updateHistory: many(updateHistory),
}));

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
  objective: one(objectives, {
    fields: [keyResults.objectiveId],
    references: [objectives.id],
  }),
  company: one(companies, {
    fields: [keyResults.companyId],
    references: [companies.id],
  }),
  creator: one(usersSyncInNeonAuth, {
    fields: [keyResults.createdBy],
    references: [usersSyncInNeonAuth.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(usersSyncInNeonAuth, {
    fields: [comments.authorId],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [comments.companyId],
    references: [companies.id],
  }),
}));

export const updateHistoryRelations = relations(updateHistory, ({ one }) => ({
  updatedBy: one(usersSyncInNeonAuth, {
    fields: [updateHistory.updatedBy],
    references: [usersSyncInNeonAuth.id],
  }),
  company: one(companies, {
    fields: [updateHistory.companyId],
    references: [companies.id],
  }),
}));

// Organization Invitations table - tenant-specific invitations
export const organizationInvitations = pgTable('organization_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: userRoleEnum('role').notNull().default('empleado'),
  organizationId: uuid('organization_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by').notNull().references(() => usersSyncInNeonAuth.id),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('org_invitations_email_idx').on(table.email),
  index('org_invitations_token_idx').on(table.token),
  index('org_invitations_org_idx').on(table.organizationId),
  index('org_invitations_status_idx').on(table.status),
]);

// Onboarding Sessions table - track user onboarding progress
export const onboardingSessions = pgTable('onboarding_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull(),
  status: text('status').notNull().default('in_progress'),
  currentStep: text('current_step').notNull(),
  partialData: jsonb('partial_data').default({}),
  invitationToken: text('invitation_token'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('onboarding_user_idx').on(table.userId),
  index('onboarding_status_idx').on(table.status),
  index('onboarding_token_idx').on(table.invitationToken),
  index('onboarding_last_activity_idx').on(table.lastActivity),
]);

// Relations for new tables
export const organizationInvitationsRelations = relations(organizationInvitations, ({ one }) => ({
  organization: one(companies, {
    fields: [organizationInvitations.organizationId],
    references: [companies.id],
  }),
  inviter: one(usersSyncInNeonAuth, {
    fields: [organizationInvitations.invitedBy],
    references: [usersSyncInNeonAuth.id],
  }),
}));

export const onboardingSessionsRelations = relations(onboardingSessions, ({ one }) => ({
  invitation: one(organizationInvitations, {
    fields: [onboardingSessions.invitationToken],
    references: [organizationInvitations.token],
  }),
}));