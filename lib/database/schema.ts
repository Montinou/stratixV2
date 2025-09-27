import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  pgEnum,
  integer,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { authenticatedRole, authUid, crudPolicy } from 'drizzle-orm/neon';

// Enums for status and role types
export const userRoleEnum = pgEnum('user_role', ['corporativo', 'gerente', 'empleado']);
export const objectiveStatusEnum = pgEnum('objective_status', ['draft', 'in_progress', 'completed', 'cancelled']);
export const initiativeStatusEnum = pgEnum('initiative_status', ['planning', 'in_progress', 'completed', 'cancelled']);
export const activityStatusEnum = pgEnum('activity_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

// Users table - handles authentication and basic user info
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Stack Auth integration - link to auth.user_id()
  stackUserId: varchar('stack_user_id', { length: 255 })
    .unique()
    .notNull()
    .default(sql`(auth.user_id())`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  // Legacy fields (to be removed after migration)
  passwordHash: varchar('password_hash', { length: 255 }),
  emailConfirmed: timestamp('email_confirmed'),
  // Multi-tenancy support
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { emailIdx: index('users_email_idx').on(table.email) },
  { stackUserIdx: index('users_stack_user_idx').on(table.stackUserId) },
  { tenantIdx: index('users_tenant_idx').on(table.tenantId) },
  // RLS Policy - users can only access their own record
  crudPolicy({
    role: authenticatedRole,
    read: authUid(table.stackUserId),
    modify: authUid(table.stackUserId),
  }),
]);

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
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )`,
    modify: sql`EXISTS (
      SELECT 1 FROM profiles 
      WHERE company_id = ${table.id} 
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND role_type = 'corporativo'
    )`,
  }),
]);

// Profiles table - detailed user profile information linked to auth users
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey()
    .default(sql`(SELECT id FROM users WHERE stack_user_id = auth.user_id())`),
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
  // RLS Policy - users can only access their own profile
  crudPolicy({
    role: authenticatedRole,
    read: sql`${table.userId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
    modify: sql`${table.userId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
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
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .default(sql`(SELECT id FROM users WHERE stack_user_id = auth.user_id())`),
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
      ${table.ownerId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        AND (
          role_type = 'corporativo' 
          OR (role_type = 'gerente' AND department = ${table.department})
        )
      )
    `,
    modify: sql`
      ${table.ownerId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
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
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .default(sql`(SELECT id FROM users WHERE stack_user_id = auth.user_id())`),
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
      ${table.ownerId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM objectives o, profiles p
        WHERE o.id = ${table.objectiveId}
        AND p.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        AND (
          o.owner_id = p.user_id
          OR p.role_type = 'corporativo' 
          OR (p.role_type = 'gerente' AND p.department = o.department)
        )
      )
    `,
    modify: sql`
      ${table.ownerId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
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
  assignedTo: uuid('assigned_to')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .default(sql`(SELECT id FROM users WHERE stack_user_id = auth.user_id())`),
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
      ${table.assignedTo} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM initiatives i, objectives o, profiles p
        WHERE i.id = ${table.initiativeId}
        AND o.id = i.objective_id
        AND p.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        AND (
          i.owner_id = p.user_id
          OR o.owner_id = p.user_id
          OR p.role_type = 'corporativo' 
          OR (p.role_type = 'gerente' AND p.department = o.department)
        )
      )
    `,
    modify: sql`
      ${table.assignedTo} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
        AND role_type IN ('corporativo', 'gerente')
      )
    `,
  }),
]);

// Relations definitions for type-safe joins
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  ownedObjectives: many(objectives),
  ownedInitiatives: many(initiatives),
  assignedActivities: many(activities),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  profiles: many(profiles),
  objectives: many(objectives),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),

  company: one(companies, {
    fields: [profiles.companyId],
    references: [companies.id],
  }),
}));

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  owner: one(users, {
    fields: [objectives.ownerId],
    references: [users.id],
  }),
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
  owner: one(users, {
    fields: [initiatives.ownerId],
    references: [users.id],

  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  initiative: one(initiatives, {
    fields: [activities.initiativeId],
    references: [initiatives.id],
  }),
  assignee: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
  }),
}));

// Export all tables for use in queries and migrations
export const schema = {
  users,
  companies,
  profiles,
  objectives,
  initiatives,
  activities,
  // Relations
  usersRelations,
  companiesRelations,
  profilesRelations,
  objectivesRelations,
  initiativesRelations,
  activitiesRelations,
  // Enums
  userRoleEnum,
  objectiveStatusEnum,
  initiativeStatusEnum,
  activityStatusEnum,
  priorityEnum,
};
