---
created: 2025-09-29T04:50:25Z
last_updated: 2025-10-01T02:58:50Z
version: 1.1
author: Claude Code PM System
---

# System Patterns

## Architectural Patterns

### App Router Pattern (Next.js 15)
The application follows Next.js 15 App Router conventions with server-side rendering and component-based routing:

```typescript
// app/layout.tsx - Root layout pattern
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StackProvider>
          <StackTheme>
            {children}
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  )
}
```

### Authentication Pattern (Stack Auth)
Centralized authentication using Stack Auth with provider pattern:

```typescript
// Pattern: Authentication provider wrapping
<StackProvider>
  <StackTheme>
    <AuthenticatedApp />
  </StackTheme>
</StackProvider>

// Pattern: Hook-based user access
const user = useUser({ or: "redirect" });
```

### Database Access Pattern (Drizzle ORM)
Type-safe database operations with connection pooling and multi-tenant support:

```typescript
// Pattern: Serverless connection with pooling
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

// Pattern: Type-safe queries with tenant isolation (RLS)
const results = await db.select().from(table).where(eq(table.id, userId));
// Note: Row-Level Security policies automatically filter by tenant_id
```

### Multi-Tenant Pattern (Row-Level Security)
Tenant isolation using PostgreSQL RLS:

```typescript
// Pattern: Setting tenant context for RLS
await sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

// Pattern: All subsequent queries automatically filtered by tenant
const data = await db.select().from(objectives);
// Returns only data for current tenant due to RLS policies

// Pattern: Organization service for tenant operations
import { OrganizationService } from '@/lib/organization/organization-service';
const orgService = new OrganizationService();
const org = await orgService.getOrganization(orgId);
```

## Component Patterns

### shadcn/ui Component Pattern
Consistent component architecture using Class Variance Authority:

```typescript
// Pattern: Component with variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Form Handling Pattern
React Hook Form with Zod validation:

```typescript
// Pattern: Form with validation schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    title: "",
    description: "",
  },
})
```

### Server Action Pattern
API routes following RESTful conventions:

```typescript
// Pattern: API route with authentication
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Business logic here
  return NextResponse.json(data);
}
```

## State Management Patterns

### Local State Pattern
Component-level state management with React hooks:

```typescript
// Pattern: Local state with effects
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData();
}, []);
```

### Context Provider Pattern
Global state management for theme and authentication:

```typescript
// Pattern: Context with provider
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Provider implementation
};
```

## Data Flow Patterns

### Server-to-Client Data Flow
1. **API Route** → Database query with Drizzle
2. **Client Component** → Fetch from API route
3. **State Update** → React state management
4. **UI Update** → Component re-render

### Authentication Flow
1. **User Action** → Login attempt
2. **Stack Auth** → Authentication verification
3. **Session Creation** → Server-side session management
4. **Route Protection** → Middleware validation
5. **Component Access** → User context availability

### Form Submission Flow
1. **User Input** → Form field changes
2. **Validation** → Zod schema validation
3. **Submit Handler** → API call with validated data
4. **Database Update** → Drizzle ORM operation
5. **UI Feedback** → Success/error messaging

### Onboarding Flow
1. **User Signup** → Stack Auth registration
2. **Check Onboarding Status** → API call to `/api/onboarding/status`
3. **Draft Management** → Persistent state in `/api/onboarding/draft`
4. **Organization Creation** → POST to `/api/onboarding/create-organization`
5. **Approval Workflow** → Pending approval state
6. **Admin Approval** → Organization activation
7. **User Access** → Full application access

### Invitation Flow
1. **Invite Generation** → Admin creates invitation with token
2. **Email Delivery** → Invitation link sent to user
3. **Token Validation** → GET `/api/invitations/[token]`
4. **User Acceptance** → POST `/api/invitations/accept`
5. **Organization Assignment** → User added to organization
6. **Access Granted** → User can access tenant data

## Error Handling Patterns

### API Error Pattern
Consistent error handling across API routes:

```typescript
// Pattern: Standardized error responses
try {
  const result = await operation();
  return NextResponse.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Client-Side Error Pattern
Error boundaries and error state management:

```typescript
// Pattern: Error state handling
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (data: FormData) => {
  try {
    setError(null);
    await submitData(data);
  } catch (err) {
    setError('Failed to submit data');
  }
};
```

## Security Patterns

### Access Control Pattern
Role-based access control throughout the application:

```typescript
// Pattern: Role-based component rendering
if (!hasAccess(user.role, 'admin')) {
  return <AccessDenied />;
}

// Pattern: API route protection
const user = await getUser();
if (!user || !hasPermission(user, 'write')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Environment Variable Pattern
Secure configuration management:

```typescript
// Pattern: Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'STACK_SECRET_SERVER_KEY',
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## Performance Patterns

### Database Connection Pattern
Connection pooling and efficient queries:

```typescript
// Pattern: Connection management
const db = neon(process.env.DATABASE_URL!, {
  poolSize: 10,
  connectionTimeoutMillis: 5000,
});
```

### Component Optimization Pattern
Memoization and lazy loading:

```typescript
// Pattern: Memoized expensive components
const ExpensiveComponent = memo(({ data }: { data: ComplexData }) => {
  const processedData = useMemo(() => processData(data), [data]);
  return <div>{/* Rendered content */}</div>;
});

// Pattern: Lazy loading
const LazyComponent = lazy(() => import('./HeavyComponent'));
```

These patterns ensure consistency, maintainability, and scalability throughout the StratixV2 OKR Management System while leveraging modern React and Next.js best practices.