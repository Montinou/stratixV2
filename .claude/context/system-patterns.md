---
created: 2025-10-02T03:02:00Z
last_updated: 2025-10-02T03:36:10Z
version: 1.2
author: Claude Code PM System
---

# System Patterns & Architecture

## Architectural Style

**Multi-Tenant SaaS Architecture** with strict data isolation and role-based access control.

**Key Characteristics:**
- Row Level Security (RLS) for data isolation
- Session-scoped security context
- Organization-centric data model
- Invitation-based provisioning
- Stateful onboarding flows

## Security Patterns

### 1. Row Level Security (RLS)

**Pattern:** Session-scoped user context via PostgreSQL configuration variables

**Implementation:**
```typescript
// Set user context for session
await client.query('SELECT set_config($1, $2, false)', [
  'app.current_user_id',
  userId,
]);

// Wrapper for RLS-enabled operations
export async function withRLSContext<T>(
  userId: string,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await setUserContext(userId, client);
    const db = drizzle(client, { schema });
    return await callback(db);
  } finally {
    client.release();
  }
}
```

**Location:** `lib/database/rls-client.ts`

**Key Points:**
- Uses unpooled DATABASE_URL for proper RLS
- Session variables persist across queries (local=false)
- Connection released after callback execution
- Type-safe with Drizzle ORM integration

### 2. Multi-Tenant Data Isolation

**Pattern:** Company-based data filtering across all queries

**Implementation:**
```typescript
// Get user's company from profile
const profile = await sql`
  SELECT company_id FROM profiles WHERE id = ${user.id}
`;

// All queries filtered by company_id
const objectives = await sql`
  SELECT o.* FROM objectives o
  WHERE o.company_id = ${profile[0].company_id}
`;
```

**Key Points:**
- Every data access checks company_id
- Profile table links users to companies
- No cross-tenant data access possible
- RLS policies enforce at database level

### 3. Whitelist/Blacklist Verification

**Pattern:** Email domain and address verification before user access

**Implementation:**
```typescript
// Check blacklist first (priority)
const isBlacklisted = await db.query.blacklistedEmailsTable.findFirst({
  where: eq(blacklistedEmailsTable.email, email),
});
if (isBlacklisted) return false;

// Check domain whitelist
const domain = email.split('@')[1];
const isDomainWhitelisted = await db.query.whitelistedDomainsTable.findFirst({
  where: eq(whitelistedDomainsTable.domain, domain),
});
if (isDomainWhitelisted) return true;

// Check email whitelist
const isEmailWhitelisted = await db.query.whitelistedEmailsTable.findFirst({
  where: eq(whitelistedEmailsTable.email, email),
});
return Boolean(isEmailWhitelisted);
```

**Location:** `lib/auth.ts`

**Verification Order:**
1. Blacklist check (immediate rejection)
2. Domain whitelist check
3. Email whitelist check

## Authentication Patterns

### 1. Multi-Step Onboarding Flow

**Pattern:** Stateful onboarding with session persistence

**Flow:**
1. User authenticates via Stack Auth
2. System checks for existing profile
3. If no profile, check for pending invitation
4. Create onboarding session with current step
5. Redirect to appropriate onboarding page
6. Complete onboarding and create profile

**Implementation:**
```typescript
export async function ensureAuthenticated() {
  const user = await stackServerApp.getUser({ or: 'redirect' });
  const profile = await getUserProfile(user.id);

  if (profile) {
    return { user, profile };
  }

  // Check for pending invitation (whitelist)
  const pendingInvitation = await getPendingInvitation(primaryEmail);
  if (pendingInvitation) {
    await createOnboardingSession({
      userId: user.id,
      email: primaryEmail,
      step: 'accept_invite',
      invitationToken: pendingInvitation.token,
    });
    redirect(`/invite/${pendingInvitation.token}`);
  }
}
```

**Location:** `lib/auth.ts`

**Session States:**
- `in_progress` - User actively onboarding
- `completed` - Onboarding finished
- `abandoned` - Session inactive > 7 days

### 2. Invitation-Based Provisioning

**Pattern:** Pre-approved user access via invitation tokens

**Workflow:**
1. Admin creates invitation with role assignment
2. Secure token generated: `crypto.randomBytes(32).toString('base64url')`
3. Database record created (status: pending, 7-day expiry)
4. Email sent (optional - whitelist works without it)
5. User signs up independently
6. System detects pending invitation
7. User accepts invitation
8. Profile created with exact role from invitation

**Location:** `lib/organization/organization-service.ts`

**Key Features:**
- Email delivery failure doesn't block whitelist
- Database record is source of truth
- Automatic role assignment on acceptance
- Token-based secure access

## Data Access Patterns

### 1. Mixed Database Access

**Pattern:** Drizzle ORM for type-safety, direct SQL for complex queries

**Drizzle ORM (Type-safe):**
```typescript
const invitation = await db.query.organizationInvitations.findFirst({
  where: and(
    eq(organizationInvitations.email, email),
    eq(organizationInvitations.status, 'pending'),
    gte(organizationInvitations.expiresAt, new Date())
  ),
  with: {
    organization: true,
    inviter: true,
  },
});
```

**Direct SQL (Complex queries):**
```typescript
const objectives = await sql`
  SELECT o.*, p.full_name as owner_name,
         COUNT(DISTINCT i.id) as initiative_count
  FROM objectives o
  LEFT JOIN profiles p ON o.owner_id = p.id
  LEFT JOIN initiatives i ON i.objective_id = o.id
  WHERE o.company_id = ${companyId}
  GROUP BY o.id, p.full_name
  ORDER BY o.created_at DESC
`;
```

**When to Use:**
- **Drizzle ORM:** CRUD operations, simple queries, type safety needed
- **Direct SQL:** Aggregations, complex JOINs, performance-critical queries

### 2. Connection Pooling

**Pattern:** Managed connection pool with lifecycle controls

**Configuration:**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

**Location:** `lib/database/rls-client.ts`

**Pool Management:**
- Max 20 connections
- 30s idle timeout
- 10s connection timeout
- Always release connections in finally block

## Service Layer Patterns

### 1. Type-Safe Service Interfaces

**Pattern:** Explicit input/output types for all service functions

**Example:**
```typescript
export type UserRole = 'corporativo' | 'gerente' | 'empleado';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  creatorUserId: string;
  creatorEmail: string;
  creatorFullName?: string;
}

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  organizationId: string;
  invitedBy: string;
}

export async function createOrganization(
  input: CreateOrganizationInput
) {
  // Pure business logic
}
```

**Location:** `lib/organization/organization-service.ts`

**Benefits:**
- Compile-time type checking
- Self-documenting APIs
- Easy refactoring
- IDE autocomplete support

### 2. Slug Generation with Collision Handling

**Pattern:** Automatic unique identifier generation

**Implementation:**
```typescript
export async function generateOrganizationSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query.companies.findFirst({
      where: eq(companies.slug, slug),
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
```

**Pattern:** Infinite loop with database checks until unique slug found

## API Patterns

### 1. Server Actions Pattern

**Pattern:** Direct server-side execution with 'use server' directive

**Implementation:**
```typescript
'use server'

export async function createObjective(formData: FormData) {
  const { user, profile } = await ensureAuthenticated();

  // Business logic with automatic RLS
  const objective = await db.insert(objectives).values({
    title: formData.get('title'),
    companyId: profile.companyId,
    ownerId: user.id,
  }).returning();

  revalidatePath('/objectives');
  return objective;
}
```

**Key Features:**
- No API route needed
- Automatic authentication check
- Direct database access
- Form data handling
- Cache revalidation

### 2. REST API Route Pattern

**Pattern:** Authentication → Company verification → Data filtering

**Implementation:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Authentication
  const user = await stackServerApp.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get company_id from profile (RLS pattern)
  const profile = await sql`
    SELECT company_id FROM profiles WHERE id = ${user.id}
  `;

  if (!profile[0]?.company_id) {
    return NextResponse.json({ error: 'User not associated with a company' }, { status: 403 });
  }

  // 3. Query with company filtering
  const data = await sql`
    SELECT * FROM objectives
    WHERE company_id = ${profile[0].company_id}
  `;

  return NextResponse.json(data);
}
```

**Location:** `app/api/objectives/route.ts`

**Standard Flow:**
1. Stack Auth user verification
2. Profile lookup for company_id
3. Company existence check
4. Multi-tenant filtered query
5. JSON response

## Component Patterns

### 1. Feature-Based Organization

**Structure:**
```
components/okr/
├── activities/          # Activity feature components
├── analytics/           # Analytics feature components
├── charts/              # Chart components
├── dashboard/           # Dashboard components
├── filters/             # Filter components
├── forms/               # Form components
├── initiatives/         # Initiative components
├── insights/            # Insights components
├── objectives/          # Objective components
├── activity-form.tsx    # Shared form
├── initiative-form.tsx  # Shared form
├── objective-form.tsx   # Shared form
└── index.ts             # Barrel export
```

**Pattern:** Group by feature, not by component type

### 2. Client/Server Separation

**Pattern:** Page-level client components with -page-client.tsx suffix

**Examples:**
- `activities-page-client.tsx` (10K)
- `initiatives-page-client.tsx` (8.8K)
- `objectives-page-client.tsx` (8.4K)

**Server Component (page.tsx):**
```typescript
export default async function ObjectivesPage() {
  const { user, profile } = await ensureAuthenticated();
  const objectives = await getObjectives(profile.companyId);

  return <ObjectivesPageClient objectives={objectives} />;
}
```

**Client Component (objectives-page-client.tsx):**
```typescript
'use client'

export default function ObjectivesPageClient({ objectives }) {
  const [selectedObjective, setSelectedObjective] = useState(null);

  return (
    <div>
      {/* Interactive UI */}
    </div>
  );
}
```

**Benefits:**
- Server components for data fetching
- Client components for interactivity
- Clear separation of concerns
- Optimal bundle size

### 3. Form Component Pattern

**Pattern:** Large, comprehensive form components with validation

**Examples:**
- `objective-form.tsx` (10K)
- `initiative-form.tsx` (10K)
- `activity-form.tsx` (11K)

**Features:**
- React Hook Form integration
- Zod schema validation
- Multi-step form support
- Draft saving capabilities
- Server action submission

## Data Flow Patterns

### 1. Authentication → Profile → Company → Data

**Flow:**
1. Stack Auth provides user identity
2. Profile table links user to company
3. Company_id used in all data queries
4. RLS enforces at database level

### 2. Invitation → Registration → Acceptance → Profile

**Flow:**
1. Admin creates invitation (database record)
2. Email sent (optional notification)
3. User registers with Stack Auth
4. System detects pending invitation
5. User redirected to acceptance page
6. Profile created with invitation role
7. User gains company access

### 3. Server Component → Server Action → Revalidation

**Flow:**
1. Server component fetches initial data
2. User interaction triggers server action
3. Server action mutates data
4. Path/cache revalidation
5. UI automatically updates

## Crypto & Security Utilities

### 1. Secure Token Generation

**Pattern:** Cryptographically secure random tokens

**Implementation:**
```typescript
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
```

**Features:**
- 32 bytes of randomness (256 bits)
- URL-safe base64 encoding
- Used for invitation tokens
- No collisions in practice

## Email Communication Patterns

### 1. Brevo Integration for Transactional Emails

**Pattern:** REST API-based email service with webhook support

**Implementation:**
```typescript
// Brevo client configuration
export const brevoClient = {
  apiKey: process.env.BREVO_API_KEY,
  baseUrl: 'https://api.brevo.com/v3',
};

// Email sending with template
export async function sendTemplateEmail({
  to,
  templateId,
  params,
}: SendEmailInput) {
  const response = await fetch(`${brevoClient.baseUrl}/smtp/email`, {
    method: 'POST',
    headers: {
      'api-key': brevoClient.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ email: to }],
      templateId,
      params,
    }),
  });

  return response.json();
}
```

**Location:** `lib/services/brevo/`

**Key Features:**
- Template-based emails (invitation, welcome, etc.)
- Webhook event handling (delivery, bounce, spam)
- Graceful degradation on email failure
- Database-first approach (email is notification, not requirement)

### 2. Email Notification Without Blocking

**Pattern:** Email failure doesn't block core functionality

**Workflow:**
1. Create database record (e.g., invitation)
2. Attempt email send
3. Log email failure if occurs
4. Continue with operation success
5. User can still complete action (whitelist still works)

**Implementation:**
```typescript
// Create invitation (database record)
const invitation = await db.insert(organizationInvitations).values({
  email,
  token,
  status: 'pending',
}).returning();

// Try sending email (non-blocking)
try {
  await sendInvitationEmail(email, token);
} catch (error) {
  console.error('Email send failed, but invitation created:', error);
  // Invitation still valid - user can accept via whitelist
}

return invitation;
```

**Key Principle:** Database state is source of truth, email is convenience

### 3. Webhook Event Processing

**Pattern:** Handle email delivery events via webhooks

**Implementation:**
```typescript
// Brevo webhook handler
export async function POST(request: NextRequest) {
  const event = await request.json();

  switch (event.event) {
    case 'delivered':
      await markEmailDelivered(event.email);
      break;
    case 'soft_bounce':
    case 'hard_bounce':
      await handleBounce(event.email, event.reason);
      break;
    case 'spam':
      await handleSpamReport(event.email);
      break;
  }

  return NextResponse.json({ received: true });
}
```

**Location:** `app/api/webhooks/brevo/route.ts`

**Event Types:**
- `delivered` - Email successfully delivered
- `soft_bounce` - Temporary delivery failure
- `hard_bounce` - Permanent delivery failure
- `spam` - Marked as spam by recipient

## Company Customization Patterns

### 1. Company-Specific Theming

**Pattern:** Dynamic theme injection based on company settings

**Implementation:**
```typescript
'use client'

export function CompanyThemeProvider({ children, companyId }) {
  const [theme, setTheme] = useState<CompanyTheme | null>(null);

  useEffect(() => {
    async function loadTheme() {
      const settings = await fetch(`/api/company/settings?id=${companyId}`);
      const data = await settings.json();

      if (data.primaryColor || data.logoUrl) {
        document.documentElement.style.setProperty(
          '--company-primary',
          data.primaryColor || '#default'
        );
      }

      setTheme(data);
    }

    loadTheme();
  }, [companyId]);

  return <>{children}</>;
}
```

**Location:** `components/providers/company-theme-provider.tsx`

**Key Features:**
- CSS variable injection for colors
- Logo customization
- Per-company branding
- Client-side theme application

### 2. Company Logo Management

**Pattern:** Secure logo upload with company isolation

**Implementation:**
```typescript
export async function POST(request: NextRequest) {
  const user = await stackServerApp.getUser();
  if (!user) return unauthorized();

  const profile = await getUserProfile(user.id);
  const formData = await request.formData();
  const logo = formData.get('logo') as File;

  // Validate file type and size
  if (!logo.type.startsWith('image/')) {
    return badRequest('Invalid file type');
  }

  // Store logo with company_id isolation
  const logoUrl = await uploadLogo(logo, profile.companyId);

  await db.update(companies)
    .set({ logoUrl })
    .where(eq(companies.id, profile.companyId));

  return NextResponse.json({ logoUrl });
}
```

**Location:** `app/api/company/logo/route.ts`

**Security:**
- Company-isolated storage
- File type validation
- Size limits enforced
- Direct company_id association

## Scheduled Job Patterns

### 1. Cron-Based Cleanup Jobs

**Pattern:** Vercel cron jobs for database maintenance

**Configuration:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-invitations",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/invitation-reminders",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Implementation:**
```typescript
// Cleanup expired invitations
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized();
  }

  const result = await db.delete(organizationInvitations)
    .where(
      and(
        eq(organizationInvitations.status, 'pending'),
        lt(organizationInvitations.expiresAt, new Date())
      )
    );

  return NextResponse.json({ deleted: result.count });
}
```

**Location:** `app/api/cron/`

**Job Types:**
- **Cleanup:** Remove expired invitations, abandoned sessions
- **Reminders:** Send reminder emails for pending invitations
- **Maintenance:** Database optimization, analytics aggregation

## Key Design Decisions

1. **Database-First Security:** RLS policies enforce multi-tenancy at database level
2. **Mixed ORM Approach:** Drizzle for type-safety, SQL for performance
3. **Stateful Onboarding:** Session persistence enables multi-step flows
4. **Invitation Whitelist:** Database record is source of truth, email is notification
5. **Server-Heavy Architecture:** Leverage Next.js server components and actions
6. **Feature-Based Components:** Organize by domain, not technical type
7. **Unpooled for RLS:** Use unpooled connections for proper session variables
8. **Type-Safe Services:** Explicit interfaces for all business logic
9. **Company-Centric Model:** All data belongs to a company tenant
10. **Stack Auth Integration:** Outsource authentication, own authorization
11. **Email Non-Blocking:** Email failures don't prevent core operations
12. **Webhook Event Processing:** Handle email delivery events asynchronously
13. **Company Theming:** Dynamic brand customization per organization
14. **Cron-Based Maintenance:** Scheduled jobs for cleanup and notifications

## Performance Considerations

1. **Connection Pooling:** Max 20 connections with automatic lifecycle
2. **RLS Context Reuse:** One connection per RLS operation
3. **Server Components:** Reduce client bundle size
4. **SQL for Aggregations:** Direct SQL for complex queries
5. **Cache Revalidation:** Strategic path/tag invalidation
