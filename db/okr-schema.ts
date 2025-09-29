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
  index('companies_name_idx').on(table.name),
]);

// Profiles table - detailed user profile information linked to Neon Auth users
export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .notNull()
    .primaryKey()
    .references(() => usersSyncInNeonAuth.id), // Reference to neon_auth.users_sync
  fullName: varchar('full_name', { length: 255 }).notNull(),
  roleType: userRoleEnum('role_type').notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('profiles_company_idx').on(table.companyId),
  index('profiles_role_idx').on(table.roleType),
  index('profiles_department_idx').on(table.department),
  index('profiles_tenant_idx').on(table.tenantId),
]);

// Objectives table - high-level OKR objectives
export const objectives = pgTable('objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  department: varchar('department', { length: 100 }).notNull(),
  status: objectiveStatusEnum('status').notNull().default('draft'),
  priority: priorityEnum('priority').notNull().default('medium'),
  progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0'),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }).default('0'),
  unit: varchar('unit', { length: 50 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => usersSyncInNeonAuth.id),
  assignedTo: text('assigned_to').references(() => usersSyncInNeonAuth.id),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('objectives_company_idx').on(table.companyId),
  index('objectives_department_idx').on(table.department),
  index('objectives_status_idx').on(table.status),
  index('objectives_assigned_idx').on(table.assignedTo),
  index('objectives_tenant_idx').on(table.tenantId),
]);

// Initiatives table - strategic initiatives linked to objectives
export const initiatives = pgTable('initiatives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: initiativeStatusEnum('status').notNull().default('planning'),
  priority: priorityEnum('priority').notNull().default('medium'),
  progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0'),
  budget: numeric('budget', { precision: 12, scale: 2 }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  objectiveId: uuid('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => usersSyncInNeonAuth.id),
  assignedTo: text('assigned_to').references(() => usersSyncInNeonAuth.id),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('initiatives_objective_idx').on(table.objectiveId),
  index('initiatives_company_idx').on(table.companyId),
  index('initiatives_status_idx').on(table.status),
  index('initiatives_assigned_idx').on(table.assignedTo),
  index('initiatives_tenant_idx').on(table.tenantId),
]);

// Activities table - specific activities/tasks linked to initiatives
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: activityStatusEnum('status').notNull().default('todo'),
  priority: priorityEnum('priority').notNull().default('medium'),
  estimatedHours: numeric('estimated_hours', { precision: 6, scale: 2 }),
  actualHours: numeric('actual_hours', { precision: 6, scale: 2 }).default('0'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  initiativeId: uuid('initiative_id').notNull().references(() => initiatives.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => usersSyncInNeonAuth.id),
  assignedTo: text('assigned_to').references(() => usersSyncInNeonAuth.id),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('activities_initiative_idx').on(table.initiativeId),
  index('activities_company_idx').on(table.companyId),
  index('activities_status_idx').on(table.status),
  index('activities_assigned_idx').on(table.assignedTo),
  index('activities_due_date_idx').on(table.dueDate),
  index('activities_tenant_idx').on(table.tenantId),
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

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
  user: one(usersSyncInNeonAuth, {
    fields: [profiles.userId],
    references: [usersSyncInNeonAuth.id],
  }),
  createdObjectives: many(objectives, { relationName: 'createdBy' }),
  assignedObjectives: many(objectives, { relationName: 'assignedTo' }),
  createdInitiatives: many(initiatives, { relationName: 'createdBy' }),
  assignedInitiatives: many(initiatives, { relationName: 'assignedTo' }),
  createdActivities: many(activities, { relationName: 'createdBy' }),
  assignedActivities: many(activities, { relationName: 'assignedTo' }),
  comments: many(comments),
  createdKeyResults: many(keyResults),
  updateHistory: many(updateHistory),
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