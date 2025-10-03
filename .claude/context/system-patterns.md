# System Patterns

## Security

### Row Level Security (RLS)
```typescript
// Set PostgreSQL session context
await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId]);

// RLS wrapper
export async function withRLSContext<T>(userId: string, callback: (db) => Promise<T>) {
  const client = await pool.connect();
  try {
    await setUserContext(userId, client);
    return await callback(drizzle(client, { schema }));
  } finally { client.release(); }
}
```
**Location:** `lib/database/rls-client.ts`

### Multi-Tenant Isolation
- Every query filtered by `company_id`
- Profile links users to companies
- RLS policies at database level
- Zero cross-tenant access

### Email Verification
**Order:** Blacklist → Domain whitelist → Email whitelist
```typescript
if (await isBlacklisted(email)) return false;
const domain = email.split('@')[1];
return await isDomainWhitelisted(domain) || await isEmailWhitelisted(email);
```

## Authentication

### Onboarding Flow
1. Stack Auth → Check profile → if exists, return
2. Check pending invitation → create session → redirect `/invite/{token}`
3. Multi-step onboarding with session state
4. Profile creation with role from invitation

**Session States:** `in_progress`, `completed`, `abandoned` (>7 days)

### Invitation System
1. Admin creates invitation (DB record + token)
2. Email sent (optional - whitelist works without)
3. User signs up → system detects invitation
4. User accepts → profile with invitation role

**Key:** Database = truth, email = notification

## Data Access

### Mixed Database Access
- **Drizzle:** CRUD, type safety, simple queries
- **SQL:** Aggregations, complex JOINs, performance

### Connection Pooling
```typescript
const pool = new Pool({
  connectionString: DATABASE_URL_UNPOOLED,
  max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
});
// Always release in finally
```

## Service Layer

### Type-Safe Interfaces
```typescript
export interface CreateCompanyInput {
  name: string; slug: string; creatorUserId: string;
}
export async function createCompany(input: CreateCompanyInput) { }
```

### Slug Generation
```typescript
let slug = baseSlug, counter = 1;
while (await db.query.companies.findFirst({ where: eq(companies.slug, slug) })) {
  slug = `${baseSlag}-${counter++}`;
}
```

## API

### REST Route Pattern
Auth → Profile → Company check → Data query

**Error Handling Standard:** Return 401 (not redirect) for auth failures
```typescript
const user = await stackServerApp.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Server Actions
```typescript
'use server'
export async function createObjective(formData: FormData) {
  const { user, profile } = await ensureAuthenticated();
  // Direct DB with automatic RLS
  revalidatePath('/objectives');
}
```

### RLS-Wrapped Queries
```typescript
// Dashboard stats with RLS context
const stats = await withRLSContext(userId, async (db) => {
  return db.query.objectives.findMany({
    where: eq(objectives.companyId, companyId)
  });
});
```

## Components

### Feature-Based Organization
```
components/okr/
├── activities/  ├── analytics/  ├── objectives/
└── index.ts
```

### Client/Server Separation
- **Server (page.tsx):** Data fetching, auth
- **Client (*-page-client.tsx):** Interactive UI, state

## Email (Brevo)

### REST API Email
```typescript
await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ to: [{ email }], templateId, params }),
});
```

### Non-Blocking Pattern
```typescript
const invitation = await db.insert(...).returning();
try { await sendEmail(...); } catch (e) { console.error('Email failed'); }
return invitation; // Success even if email fails
```

### Webhook Events
`delivered`, `soft_bounce`, `hard_bounce`, `spam`
**Location:** `app/api/webhooks/brevo/route.ts`

## Company Customization

### Dynamic Theming
```typescript
document.documentElement.style.setProperty('--company-primary', primaryColor);
```

### Logo Management
Company-isolated storage with validation

## Scheduled Jobs

### Vercel Cron
```json
{
  "crons": [
    { "path": "/api/cron/cleanup-invitations", "schedule": "0 2 * * *" },
    { "path": "/api/cron/invitation-reminders", "schedule": "0 10 * * *" }
  ]
}
```

## Design Decisions

1. **Database-First Security:** RLS at PostgreSQL with session context
2. **Mixed ORM:** Drizzle + SQL for different use cases
3. **Stateful Onboarding:** Multi-step with sessions
4. **Invitation Whitelist:** DB = truth, email = notification
5. **Server-Heavy:** RSC + Server Actions for better performance
6. **Unpooled for RLS:** Direct connections for session context
7. **Company-Centric:** All data by tenant (schema refactor complete)
8. **Email Non-Blocking:** Failures don't block operations
9. **API Error Standard:** 401 responses (not redirects) for consistency
10. **RLS Everywhere:** All queries wrapped in RLS context for security

## Performance

- Connection pooling: max 20, 30s idle
- RLS context: one connection per op
- Server components: reduce bundle
- SQL for aggregations
- Strategic cache revalidation
