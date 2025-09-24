import { pgTable, uuid, text, timestamp, pgEnum, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const statusEnum = pgEnum('status', ['draft', 'in_progress', 'completed', 'cancelled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const roleTypeEnum = pgEnum('role_type', ['corporativo', 'gerente', 'empleado']);
export const initiativeStatusEnum = pgEnum('initiative_status', ['planning', 'in_progress', 'completed', 'cancelled']);
export const activityStatusEnum = pgEnum('activity_status', ['todo', 'in_progress', 'completed', 'cancelled']);

// Companies table
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  industry: text('industry'),
  size: text('size'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Profiles table
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey(),
  fullName: text('full_name').notNull(),
  roleType: roleTypeEnum('role_type').notNull(),
  department: text('department').notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Objectives table
export const objectives = pgTable('objectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  department: text('department').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  priority: priorityEnum('priority').notNull().default('medium'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  ownerId: uuid('owner_id').references(() => profiles.userId).notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  progress: integer('progress').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Initiatives table
export const initiatives = pgTable('initiatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  objectiveId: uuid('objective_id').references(() => objectives.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: initiativeStatusEnum('status').notNull().default('planning'),
  priority: priorityEnum('priority').notNull().default('medium'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  ownerId: uuid('owner_id').references(() => profiles.userId).notNull(),
  progress: integer('progress').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Activities table
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  initiativeId: uuid('initiative_id').references(() => initiatives.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: activityStatusEnum('status').notNull().default('todo'),
  priority: priorityEnum('priority').notNull().default('medium'),
  dueDate: text('due_date').notNull(),
  assignedTo: uuid('assigned_to').references(() => profiles.userId).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  objectives: many(objectives),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
  objectivesOwned: many(objectives),
  initiativesOwned: many(initiatives),
  activitiesAssigned: many(activities),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  company: one(companies, {
    fields: [objectives.companyId],
    references: [companies.id],
  }),
  owner: one(profiles, {
    fields: [objectives.ownerId],
    references: [profiles.userId],
  }),
  initiatives: many(initiatives),
}));

export const initiativesRelations = relations(initiatives, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [initiatives.objectiveId],
    references: [objectives.id],
  }),
  owner: one(profiles, {
    fields: [initiatives.ownerId],
    references: [profiles.userId],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [activities.initiativeId],
    references: [initiatives.id],
  }),
  assignee: one(profiles, {
    fields: [activities.assignedTo],
    references: [profiles.userId],
  }),
}));

// Type exports for compatibility
export type Company = typeof companies.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Objective = typeof objectives.$inferSelect;
export type Initiative = typeof initiatives.$inferSelect;
export type Activity = typeof activities.$inferSelect;

export type InsertCompany = typeof companies.$inferInsert;
export type InsertProfile = typeof profiles.$inferInsert;
export type InsertObjective = typeof objectives.$inferInsert;
export type InsertInitiative = typeof initiatives.$inferInsert;
export type InsertActivity = typeof activities.$inferInsert;