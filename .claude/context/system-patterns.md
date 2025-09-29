---
created: 2025-09-29T04:50:25Z
last_updated: 2025-09-29T04:50:25Z
version: 1.0
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
Type-safe database operations with connection pooling:

```typescript
// Pattern: Serverless connection with pooling
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

// Pattern: Type-safe queries
const results = await db.select().from(table).where(eq(table.id, userId));
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