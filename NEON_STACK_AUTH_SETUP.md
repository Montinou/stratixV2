# Neon + Stack Auth Complete Setup Plan

## Prerequisites Completed ✅
1. Stack Auth configured as provider
2. Component patterns implemented correctly (componente-servidor.tsx, componente-cliente.tsx)

## Database Setup Requirements

### Step 1: Install pg_session_jwt Extension
```sql
-- Connect to your Neon database and run:
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;
```

### Step 2: Configure Postgres Roles
```sql
-- Grant permissions for existing tables
GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES
  IN SCHEMA public
  TO authenticated;

GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES
  IN SCHEMA public
  TO anonymous;

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES
  IN SCHEMA public
  GRANT SELECT, UPDATE, INSERT, DELETE ON TABLES
  TO authenticated;

ALTER DEFAULT PRIVILEGES
  IN SCHEMA public
  GRANT SELECT, UPDATE, INSERT, DELETE ON TABLES
  TO anonymous;

-- Grant USAGE on "public" schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anonymous;
```

### Step 3: Configure Row Level Security (RLS)
```sql
-- Enable RLS on all tables that need user-specific access
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
-- Example for profiles table:
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (user_id = auth.user_id());

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (user_id = auth.user_id());

-- Repeat similar policies for other tables
```

## Environment Variables Required

### In `.env.local` and Vercel Dashboard:
```env
# Neon Database URLs
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
DIRECT_DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require

# Authenticated URLs (with auth token support)
DATABASE_AUTHENTICATED_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require&authToken=true
NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require&authToken=true

# Stack Auth
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key
```

## Code Updates Required

### 1. Update Database Client (`/lib/database/client.ts`)
Add support for authenticated connections:

```typescript
import { neon } from '@neondatabase/serverless';
import { stackServerApp } from '@/stack';

export async function getAuthenticatedDb() {
  const user = await stackServerApp.getUser();
  const authToken = (await user?.getAuthJson())?.accessToken;
  
  if (!authToken) {
    throw new Error('Not authenticated');
  }
  
  return neon(process.env.DATABASE_AUTHENTICATED_URL!, {
    authToken: authToken
  });
}
```

### 2. Update All Page Components
Add dynamic rendering to prevent Stack Auth errors during build:

```typescript
export const dynamic = 'force-dynamic'
```

Files to update:
- `/app/page.tsx`
- `/app/activities/page.tsx`
- `/app/analytics/page.tsx`
- `/app/auth/verify-email/page.tsx`
- `/app/companies/page.tsx`
- `/app/dashboard/page.tsx`
- `/app/import/page.tsx`
- `/app/initiatives/page.tsx`
- `/app/insights/page.tsx`
- `/app/objectives/page.tsx`
- `/app/profile/page.tsx`
- `/app/team/page.tsx`
- `/app/layout.tsx`

### 3. Update API Routes
Ensure all API routes use authenticated database connections:

```typescript
import { getAuthenticatedDb } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const sql = await getAuthenticatedDb();
    const result = await sql('SELECT * FROM table WHERE user_id = auth.user_id()');
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

## Deployment Checklist

### Database Setup:
- [ ] Run pg_session_jwt extension installation
- [ ] Configure authenticated and anonymous roles
- [ ] Set up RLS policies on all user tables
- [ ] Test auth.user_id() function works

### Code Updates:
- [ ] Add `export const dynamic = 'force-dynamic'` to all pages
- [ ] Update database client for authenticated connections
- [ ] Update API routes to use authenticated DB
- [ ] Verify environment variables in Vercel

### Testing:
- [ ] Test local build: `npm run build`
- [ ] Test authentication flow
- [ ] Test database queries with RLS
- [ ] Deploy to Vercel preview
- [ ] Verify production deployment

## SQL Script for Complete Setup

Save this as `neon-auth-setup.sql` and run in Neon console:

```sql
-- 1. Install extension
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- 2. Grant permissions to roles
GRANT SELECT, UPDATE, INSERT, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT, UPDATE, INSERT, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO anonymous;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anonymous;

-- 3. Enable RLS on user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (user_id = auth.user_id());
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = auth.user_id());

-- Objectives (with department/role logic)
CREATE POLICY "Users can view objectives" ON objectives
  FOR SELECT USING (
    user_id = auth.user_id() OR
    department IN (SELECT department FROM profiles WHERE user_id = auth.user_id()) OR
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.user_id() AND role_type = 'corporativo')
  );

-- Similar policies for other tables...
```

## Verification Steps

1. **Test JWT Extension:**
```sql
SELECT auth.user_id();  -- Should return current user's ID when authenticated
```

2. **Test RLS:**
```sql
-- As authenticated user
SELECT * FROM profiles;  -- Should only show current user's profile
```

3. **Test in Application:**
- Login with Stack Auth
- Check that database queries return user-specific data
- Verify no unauthorized data access

## Common Issues & Solutions

### Issue: "No token" error
**Solution:** Ensure user is authenticated before database access

### Issue: RLS blocking all queries
**Solution:** Check that roles have proper GRANT permissions

### Issue: Build fails with Stack Auth error
**Solution:** Add `export const dynamic = 'force-dynamic'` to all pages

### Issue: auth.user_id() returns null
**Solution:** Verify JWT token is being passed correctly in connection

## Final Steps for Production

1. Run database setup SQL script
2. Update all page components with dynamic export
3. Test locally with `npm run build`
4. Deploy to Vercel preview
5. Verify all features work
6. Deploy to production