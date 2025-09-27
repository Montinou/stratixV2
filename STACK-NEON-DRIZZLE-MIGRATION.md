# Stack Auth + Neon + Drizzle Migration Guide

## 🚨 CRITICAL SECURITY ALERT
**Authentication is currently DISABLED in production API routes. This must be fixed immediately.**

## Current State Analysis

### ✅ What's Working
- **Neon Database**: Connected and configured properly
- **Drizzle ORM**: Schema defined with complete OKR domain model
- **Connection Pooling**: Advanced configuration with monitoring
- **Stack Auth**: Partially configured but not integrated

### ❌ Critical Issues Found

#### 1. **Authentication Completely Disabled**
- All API routes have authentication commented out with TODO markers
- Production endpoints are exposed without any protection
- Custom JWT auth system conflicts with Stack Auth

#### 2. **Database Security Gaps**
- No Row Level Security (RLS) policies implemented
- No multi-tenant isolation at database level
- Missing migration files - schema not deployed to production

#### 3. **Dual Authentication Systems**
- Custom JWT-based neon-auth system still active
- Stack Auth configured but not integrated
- Frontend uses custom auth, API expects Stack Auth

## Migration Plan

### Phase 1: Immediate Security Fixes (Day 1)

#### 1.1 Re-enable API Authentication
**Files to modify:**
- `/app/api/companies/route.ts`
- `/app/api/objectives/route.ts` 
- `/app/api/initiatives/route.ts`
- `/app/api/activities/route.ts`
- `/app/api/profiles/route.ts`

**Changes needed:**
```typescript
// Replace commented TODO auth with:
import { stackServerApp } from '@/stack';

export async function GET() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

#### 1.2 Environment Variables Audit
**Required variables:**
```env
# Stack Auth (CRITICAL)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key

# Neon Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@host/db?sslmode=require&pgbouncer=true

# JWT (to be removed after migration)
JWT_SECRET=your_current_jwt_secret
```

### Phase 2: Database Migration (Day 1-2)

#### 2.1 Generate Initial Migration
```bash
# Generate migration from current schema
npx drizzle-kit generate

# Review generated SQL files in /drizzle/
# Deploy to development first
npx drizzle-kit migrate

# Then deploy to production
NODE_ENV=production npx drizzle-kit migrate
```

#### 2.2 Add Multi-tenancy Support
**Schema changes needed in `/lib/database/schema.ts`:**

```typescript
// Add to all tables that need tenant isolation
export const users = pgTable('users', {
  // ... existing fields
  companyId: uuid('company_id').references(() => companies.id),
  tenantId: uuid('tenant_id').notNull(), // Add this
});

export const objectives = pgTable('objectives', {
  // ... existing fields  
  tenantId: uuid('tenant_id').notNull(), // Add this
});
```

### Phase 3: Row Level Security Implementation (Day 2-3)

#### 3.1 Enable RLS in Neon Console
1. Go to Neon Console → Settings → RLS
2. Add Stack Auth as JWT provider
3. Use JWKS URL: `https://api.stack-auth.com/api/v1/projects/{PROJECT_ID}/.well-known/jwks.json`

#### 3.2 Create RLS Policies
**File: `/sql/rls-policies.sql`**

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- User access policies
CREATE POLICY "Users can only see their own data"
ON users FOR ALL
TO authenticated
USING (auth.user_id() = stack_user_id)
WITH CHECK (auth.user_id() = stack_user_id);

-- Company-based tenant isolation
CREATE POLICY "Users can only access their company's objectives"
ON objectives FOR ALL
TO authenticated  
USING (
  tenant_id IN (
    SELECT company_id FROM profiles 
    WHERE stack_user_id = auth.user_id()
  )
);

-- Similar policies for initiatives, activities, etc.
```

### Phase 4: Authentication System Consolidation (Day 3-4)

#### 4.1 Remove Custom Neon Auth
**Files to delete:**
- `/lib/neon-auth/client.ts` (keep parts needed for database)
- `/lib/neon-auth/server.ts` (keep database client only)
- `/lib/neon-auth/middleware.ts`

#### 4.2 Update Frontend Auth Hook
**File: `/lib/hooks/use-auth.tsx`**

```typescript
// Replace entire file with Stack Auth integration
import { useUser } from '@stackframe/stack';

export function useAuth() {
  const user = useUser();
  
  return {
    user: user ? {
      id: user.id,
      email: user.primaryEmail,
      name: user.displayName,
      // Map other needed properties
    } : null,
    isLoading: user === undefined,
    isAuthenticated: !!user,
    signOut: () => user?.signOut(),
  };
}
```

#### 4.3 Update Layout to Use Stack Auth
**File: `/app/layout.tsx`**

```typescript
import { StackProvider, StackTheme } from '@stackframe/stack';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <StackProvider>
          <div className="min-h-screen bg-background">
            {children}
          </div>
        </StackProvider>
      </body>
    </html>
  );
}
```

### Phase 5: User Synchronization (Day 4-5)

#### 5.1 Create User Sync Function
**File: `/lib/database/user-sync.ts`**

```typescript
import { stackServerApp } from '@/stack';
import { db } from './client';
import { users, profiles } from './schema';

export async function syncUserWithDatabase() {
  const user = await stackServerApp.getUser();
  if (!user) return null;

  // Check if user exists in database
  const existingUser = await db.query.users.findFirst({
    where: eq(users.stackUserId, user.id),
  });

  if (!existingUser) {
    // Create new user and profile
    return await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          stackUserId: user.id,
          email: user.primaryEmail!,
          name: user.displayName,
          avatarUrl: user.profileImageUrl,
        })
        .returning();

      // Create default profile
      await tx.insert(profiles).values({
        userId: newUser.id,
        role: 'member',
        // Add other default profile data
      });

      return newUser;
    });
  }

  return existingUser;
}
```

### Phase 6: Testing & Validation (Day 5-6)

#### 6.1 End-to-End Auth Testing
```typescript
// Test file: __tests__/auth-flow.test.ts
describe('Stack Auth Integration', () => {
  test('API routes require authentication', async () => {
    const response = await fetch('/api/objectives');
    expect(response.status).toBe(401);
  });

  test('Authenticated requests work', async () => {
    // Test with valid Stack Auth token
  });

  test('RLS policies enforce tenant isolation', async () => {
    // Test that users can't access other tenants' data
  });
});
```

#### 6.2 Database Migration Validation
```bash
# Verify all tables exist
npx drizzle-kit introspect

# Test RLS policies
psql $DATABASE_URL -c "SELECT * FROM objectives" # Should fail without auth context

# Verify indexes
psql $DATABASE_URL -c "\d+ objectives" # Check indexes exist
```

## Risk Mitigation

### High-Risk Areas
1. **Data Loss**: Always backup before migrations
2. **Downtime**: Deploy during low-traffic periods
3. **Auth Failure**: Have rollback plan ready
4. **RLS Lockout**: Test policies thoroughly before production

### Rollback Plan
1. **Disable RLS** if policies cause issues
2. **Revert API changes** if Stack Auth fails
3. **Restore database** from backup if needed
4. **Re-enable custom auth** temporarily if required

## Post-Migration Checklist

### ✅ Security Verification
- [ ] All API routes require authentication
- [ ] RLS policies prevent cross-tenant access
- [ ] No authentication bypass possible
- [ ] JWT tokens are properly validated

### ✅ Functionality Testing
- [ ] Users can sign in/out
- [ ] Data loads correctly for authenticated users
- [ ] CRUD operations work with proper permissions
- [ ] Multi-tenant isolation is enforced

### ✅ Performance Validation
- [ ] Database queries are optimized
- [ ] Connection pooling is working
- [ ] No significant latency increase
- [ ] Memory usage is stable

## Monitoring & Maintenance

### Key Metrics to Watch
- Authentication success rate
- Database connection pool utilization
- RLS policy performance impact
- User sync success rate

### Regular Maintenance Tasks
- Monitor Stack Auth integration health
- Review RLS policy effectiveness
- Update JWT token expiration as needed
- Audit user permissions quarterly

## Conclusion

This migration will transform your application from an insecure, partially-implemented state to a production-ready system with:

- ✅ **Secure authentication** via Stack Auth
- ✅ **Database-level security** via RLS policies  
- ✅ **Multi-tenant isolation** preventing data leaks
- ✅ **Modern architecture** with Neon + Drizzle + Stack Auth
- ✅ **Production readiness** with proper monitoring and error handling

**Estimated timeline: 5-6 days** for complete migration with thorough testing.

**Critical Success Factor: Fix the disabled authentication in API routes IMMEDIATELY** - this is a severe security vulnerability that must be addressed before any other work.