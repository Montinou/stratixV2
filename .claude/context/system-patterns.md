---
created: 2025-10-01T09:07:54Z
last_updated: 2025-10-01T09:07:54Z
version: 1.0
author: Claude Code PM System
---

# System Patterns

## Architectural Style

### Overall Architecture
- **Pattern**: Modern serverless full-stack application
- **Paradigm**: Server-first with progressive enhancement
- **Rendering**: Server-Side Rendering (SSR) + Client Components
- **API**: RESTful endpoints with Next.js API Routes

### Key Characteristics
- Monolithic repository (monorepo)
- Type-safe end-to-end with TypeScript
- Database-first design with ORM
- Component-based UI architecture

## Design Patterns

### 1. Provider Pattern
**Location**: `components/providers/`, `app/layout.tsx`

```typescript
// AuthProvider wraps entire app
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

**Usage**:
- Authentication state management
- Theme management (next-themes)
- Global state distribution
- React Context for shared state

### 2. Server/Client Component Split
**Pattern**: Selective client-side hydration

```typescript
// Server Component (default)
async function ServerPage() {
  const data = await db.query.users.findMany()
  return <ClientComponent data={data} />
}

// Client Component (explicit)
'use client'
function ClientComponent({ data }) {
  const [state, setState] = useState(data)
  return <UI />
}
```

**Benefits**:
- Reduced JavaScript bundle size
- Better SEO
- Faster initial page loads
- Secure server-side data fetching

### 3. Repository Pattern
**Location**: `lib/database/`, `lib/services/`

```typescript
// Database operations abstracted
export const userRepository = {
  findById: (id) => db.query.users.findFirst({ where: eq(users.id, id) }),
  create: (data) => db.insert(users).values(data),
  update: (id, data) => db.update(users).set(data).where(eq(users.id, id))
}
```

**Benefits**:
- Testable data access
- Centralized query logic
- Type-safe operations

### 4. API Route Handlers
**Location**: `app/api/[resource]/route.ts`

```typescript
export async function GET(req: NextRequest) {
  // Authentication
  // Validation
  // Business logic
  // Response
  return NextResponse.json(data)
}
```

**Structure**:
- RESTful conventions (GET, POST, PUT, DELETE)
- Middleware for auth and validation
- Error handling with try-catch
- Type-safe request/response

### 5. Form Handling Pattern
**Libraries**: React Hook Form + Zod

```typescript
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

const form = useForm({
  resolver: zodResolver(schema)
})

async function onSubmit(values) {
  await api.post('/endpoint', values)
}
```

**Benefits**:
- Type-safe validation
- Declarative schemas
- Automatic error handling
- Reusable validation logic

### 6. Authentication Pattern
**Provider**: Stack Auth with Server-Side Sessions

```typescript
// Server-side
const user = await stackServerApp.getUser()
if (!user) redirect('/login')

// Client-side
const user = useUser()
if (!user) return <LoginPrompt />
```

**Features**:
- JWT-based authentication
- Server and client hooks
- Automatic session refresh
- Middleware-based route protection

## Data Flow Patterns

### 1. Server → Client Data Flow
```
Database → API Route → Server Component → Client Component → UI
```

### 2. Client → Server Data Flow
```
User Input → Form Validation → API Call → API Route → Database → Response
```

### 3. Real-time Updates (Future)
```
Database Change → Redis Pub/Sub → WebSocket → Client Update
```

## Component Patterns

### 1. Composition Pattern
**Shadcn/ui approach**: Small, composable primitives

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2. Render Props / Children Props
```tsx
<DataTable
  columns={columns}
  data={data}
  renderCell={(cell) => <CustomCell {...cell} />}
/>
```

### 3. Custom Hooks
```typescript
function useUser() {
  // Encapsulates auth logic
  const user = stackServerApp.useUser()
  const isAdmin = user?.role === 'admin'
  return { user, isAdmin }
}
```

## Security Patterns

### 1. Row Level Security (RLS)
**Database Level**: PostgreSQL policies

```sql
CREATE POLICY company_isolation ON objectives
  FOR ALL
  USING (company_id = current_setting('app.company_id')::uuid);
```

### 2. Authentication Middleware
```typescript
export async function middleware(req: NextRequest) {
  const user = await stackServerApp.getUser()
  if (!user && isProtectedRoute(req.pathname)) {
    return NextResponse.redirect('/login')
  }
}
```

### 3. Input Validation
- Zod schemas for all API inputs
- TypeScript for compile-time safety
- Sanitization of user inputs

## Error Handling Patterns

### 1. API Error Responses
```typescript
try {
  const result = await operation()
  return NextResponse.json(result)
} catch (error) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

### 2. React Error Boundaries
```tsx
// app/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Caching Strategy

### 1. Redis Caching
- Session data
- Frequently accessed data
- Rate limiting counters

### 2. Next.js Caching
- Static page generation
- Incremental Static Regeneration (ISR)
- API route caching

## File Upload Pattern

### CSV/XLSX Import
```typescript
1. Client uploads file → React Dropzone
2. Parse on server → papaparse/xlsx
3. Validate data → Zod schemas
4. Bulk insert → Drizzle ORM transactions
5. Return results → Success/error report
```

## Styling Patterns

### 1. Utility-First CSS
**Tailwind CSS**: Inline utility classes

```tsx
<div className="flex items-center gap-4 p-4 rounded-lg bg-card">
  <Avatar className="h-12 w-12" />
  <div className="flex-1">
    <h3 className="text-lg font-semibold">Title</h3>
    <p className="text-sm text-muted-foreground">Description</p>
  </div>
</div>
```

### 2. CSS Variables for Theming
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

### 3. Component Variants
**CVA (Class Variance Authority)**:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3"
      }
    }
  }
)
```

## Testing Patterns (Emerging)

### 1. Playwright for E2E
- Browser automation
- User flow testing
- Integration testing

### 2. Unit Testing (Future)
- Jest + Testing Library
- Component testing
- Utility function testing
