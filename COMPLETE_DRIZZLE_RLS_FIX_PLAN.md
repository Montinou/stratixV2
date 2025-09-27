# Complete Drizzle RLS + Stack Auth + Neon Fix Plan

## Overview
This plan fixes ALL deployment issues by implementing the correct Drizzle RLS pattern from Neon documentation, fixing Stack Auth errors, and ensuring production readiness.

## Current Issues
1. **Build Failure**: Stack Auth `Symbol(StackAppInternals)` error during static generation
2. **Missing RLS**: Tables don't have Row Level Security policies defined in Drizzle
3. **Auth Integration**: Need proper Neon + Stack Auth + Drizzle RLS integration

## The Complete Solution

### Phase 1: Update Database Schema with Drizzle RLS (30 minutes)

#### File: `/lib/database/schema.ts`

**Changes Required:**
1. Import RLS utilities from drizzle-orm/neon
2. Add auth.user_id() default for user columns
3. Add RLS policies to each table definition

```typescript
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
  bigint,
  boolean
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { authenticatedRole, authUid, crudPolicy } from 'drizzle-orm/neon';

// [Keep existing enums...]

// Users table with RLS
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  stackUserId: varchar('stack_user_id', { length: 255 })
    .unique()
    .notNull()
    .default(sql`(auth.user_id())`), // Link to auth.user_id()
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { emailIdx: index('users_email_idx').on(table.email) },
  { stackUserIdx: index('users_stack_user_idx').on(table.stackUserId) },
  { tenantIdx: index('users_tenant_idx').on(table.tenantId) },
  // RLS Policy
  crudPolicy({
    role: authenticatedRole,
    read: authUid(table.stackUserId),
    modify: authUid(table.stackUserId),
  }),
]);

// Profiles table with RLS
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey()
    .default(sql`(SELECT id FROM users WHERE stack_user_id = auth.user_id())`),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  roleType: userRoleEnum('role_type').notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  // Indexes
  { companyIdx: index('profiles_company_idx').on(table.companyId) },
  { roleIdx: index('profiles_role_idx').on(table.roleType) },
  { departmentIdx: index('profiles_department_idx').on(table.department) },
  { tenantIdx: index('profiles_tenant_idx').on(table.tenantId) },
  // RLS Policy
  crudPolicy({
    role: authenticatedRole,
    read: sql`${table.userId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
    modify: sql`${table.userId} = (SELECT id FROM users WHERE stack_user_id = auth.user_id())`,
  }),
]);

// Objectives table with RLS
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
  companyId: uuid('company_id').notNull().references(() => companies.id),
  tenantId: uuid('tenant_id').notNull(),
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

// Similar pattern for initiatives and activities tables...
```

### Phase 2: Fix All Page Components (15 minutes)

Add `export const dynamic = 'force-dynamic'` to EVERY page file:

#### Files to Update:
1. `/app/page.tsx`
2. `/app/activities/page.tsx`
3. `/app/analytics/page.tsx`
4. `/app/auth/verify-email/page.tsx`
5. `/app/companies/page.tsx`
6. `/app/dashboard/page.tsx`
7. `/app/import/page.tsx`
8. `/app/initiatives/page.tsx`
9. `/app/insights/page.tsx`
10. `/app/objectives/page.tsx`
11. `/app/profile/page.tsx`
12. `/app/team/page.tsx`
13. `/app/layout.tsx`

**Example for each file:**
```typescript
export const dynamic = 'force-dynamic'

// ... rest of the component
```

### Phase 3: Update Database Client for Authenticated Connections (10 minutes)

#### File: `/lib/database/client.ts`

**Add authenticated connection helper:**
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { stackServerApp } from '@/stack';
import * as schema from './schema';

// Authenticated Drizzle client for server components
export async function getAuthenticatedDrizzleClient() {
  const user = await stackServerApp.getUser();
  const authToken = (await user?.getAuthJson())?.accessToken;
  
  if (!authToken) {
    throw new Error('Not authenticated');
  }
  
  const sql = neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: authToken
  });
  
  return drizzle(sql, { schema });
}

// Client-side helper
export function getClientDrizzle(authToken: string) {
  const sql = neon(process.env.NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL!, {
    authToken: authToken
  });
  
  return drizzle(sql, { schema });
}
```

### Phase 4: Database Migration Script (5 minutes)

#### File: `/migrations/add-rls-policies.sql`

```sql
-- 1. Install required extension
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- 2. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3. Grant permissions to roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO anonymous;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anonymous;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anonymous;

-- 4. Add auth.user_id() function if not exists
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub'
$$ LANGUAGE SQL STABLE;

-- Note: RLS policies will be created by Drizzle migrations
```

### Phase 5: Update API Routes (10 minutes)

#### Update all API routes to use authenticated client:

**Example: `/app/api/objectives/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDrizzleClient } from '@/lib/database/client'
import { objectives } from '@/lib/database/schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = await getAuthenticatedDrizzleClient();
    
    // RLS will automatically filter by user
    const userObjectives = await db
      .select()
      .from(objectives)
      .execute();
    
    return NextResponse.json(userObjectives);
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Phase 6: Environment Variables Setup

#### Add to `.env.local` and Vercel Dashboard:
```env
# Standard database URLs
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
DIRECT_DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Authenticated URLs for RLS
DATABASE_AUTHENTICATED_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require&options=--session_authorization%3Dauthenticated
NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require&options=--session_authorization%3Dauthenticated

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key
```

## Implementation Order

### Step 1: Database Setup (10 minutes)
1. Connect to Neon Console
2. Run the migration SQL script
3. Verify pg_session_jwt extension is installed
4. Test auth.user_id() function

### Step 2: Code Updates (30 minutes)
1. Update `/lib/database/schema.ts` with RLS policies
2. Add `export const dynamic = 'force-dynamic'` to all pages
3. Update `/lib/database/client.ts` with authenticated helpers
4. Update API routes to use authenticated client

### Step 3: Generate and Run Migrations (10 minutes)
```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to database
npx drizzle-kit push:pg

# Or run migrations
npm run db:migrate
```

### Step 4: Testing (10 minutes)
```bash
# Clean build
rm -rf .next
npm run build

# If successful, test locally
npm run dev

# Test authentication and data access
```

### Step 5: Deploy (5 minutes)
```bash
git add .
git commit -m "feat: Implement Drizzle RLS with Stack Auth integration"
git push
```

## Verification Checklist

### Local Testing:
- [ ] `npm run build` succeeds without errors
- [ ] No Stack Auth Symbol errors
- [ ] Authentication works
- [ ] Users can only see their own data
- [ ] Role-based access works (corporativo sees all, gerente sees department)

### Database Verification:
```sql
-- Test as authenticated user
SET LOCAL request.jwt.claims = '{"sub": "user_stack_id"}';
SELECT * FROM objectives; -- Should only show user's objectives

-- Test auth.user_id() function
SELECT auth.user_id(); -- Should return the user's stack ID
```

### Deployment:
- [ ] Vercel preview deployment works
- [ ] All environment variables are set
- [ ] Production deployment successful
- [ ] All features working in production

## Common Issues & Solutions

### Issue: "auth.user_id() doesn't exist"
**Solution:** Run the SQL script to create the function

### Issue: "Permission denied for table"
**Solution:** Ensure GRANT statements have been run

### Issue: Build still fails with Stack Auth error
**Solution:** Verify ALL pages have `export const dynamic = 'force-dynamic'`

### Issue: No data returned from queries
**Solution:** Check RLS policies and ensure user is authenticated

## Benefits of This Approach

1. **Security**: RLS enforced at database level
2. **Type Safety**: Drizzle ORM provides full TypeScript support
3. **Performance**: Database handles filtering, not application
4. **Maintainability**: RLS policies defined with schema
5. **Stack Auth Integration**: Seamless auth token passing

## Total Implementation Time: ~1 hour

- Database Setup: 10 minutes
- Code Updates: 30 minutes
- Migration: 10 minutes
- Testing: 10 minutes
- Deployment: 5 minutes

## Success Metrics

✅ Build completes without errors
✅ No Stack Auth Symbol errors
✅ RLS policies enforced
✅ Authentication works seamlessly
✅ Deployment successful
✅ Production-ready application