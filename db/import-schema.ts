import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profiles, companies } from './okr-schema';

// Import logs table - track import operations
export const importLogs = pgTable('import_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  companyId: uuid('company_id').notNull(),
  fileName: text('file_name').notNull(),
  fileType: varchar('file_type', { length: 10 }).notNull(), // 'csv' or 'xlsx'
  importType: varchar('import_type', { length: 20 }).notNull(), // 'objectives', 'initiatives', 'activities', 'users'
  status: varchar('status', { length: 20 }).notNull().default('processing'), // 'processing', 'completed', 'failed'
  totalRecords: integer('total_records').notNull().default(0),
  successfulRecords: integer('successful_records').notNull().default(0),
  failedRecords: integer('failed_records').notNull().default(0),
  errorDetails: jsonb('error_details'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('import_logs_user_idx').on(table.userId),
  index('import_logs_company_idx').on(table.companyId),
  index('import_logs_status_idx').on(table.status),
  index('import_logs_type_idx').on(table.importType),
]);

// Relations
export const importLogsRelations = relations(importLogs, ({ one }) => ({
  user: one(profiles, {
    fields: [importLogs.userId],
    references: [profiles.id],
  }),
  company: one(companies, {
    fields: [importLogs.companyId],
    references: [companies.id],
  }),
}));