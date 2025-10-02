---
created: 2025-10-02T03:39:52Z
last_updated: 2025-10-02T03:39:52Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Organization

### Directory Structure
- `app/` - Next.js App Router pages and layouts
- `components/` - Reusable React components
- `lib/` - Utility functions and services
- `db/` - Database schema and migrations
- `types/` - TypeScript type definitions
- `public/` - Static assets

### File Naming Conventions
- **Components**: PascalCase (e.g., `ObjectiveCard.tsx`)
- **Utilities**: kebab-case (e.g., `format-date.ts`)
- **Pages**: kebab-case (e.g., `objectives/page.tsx`)
- **Types**: PascalCase (e.g., `Objective.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ROUTES.ts`)

## TypeScript Standards

### Type Safety
- **Strict mode enabled**: All TypeScript strict checks enforced
- **Explicit types**: Prefer explicit type annotations over inference for public APIs
- **No `any`**: Use `unknown` or proper types instead
- **Type imports**: Use `import type` for type-only imports

```typescript
// ✅ Good
import type { Objective } from '@/types/Objective';
export function createObjective(data: CreateObjectiveInput): Promise<Objective> {
  // implementation
}

// ❌ Bad
import { Objective } from '@/types/Objective';
export function createObjective(data: any) {
  // implementation
}
```

### Interface vs Type
- **Interfaces**: For object shapes that may be extended
- **Types**: For unions, intersections, and mapped types

```typescript
// ✅ Interface for extensible objects
interface BaseObjective {
  id: string;
  name: string;
}

// ✅ Type for unions
type ObjectiveStatus = 'active' | 'completed' | 'archived';

// ✅ Type for complex compositions
type ObjectiveWithProgress = Objective & { progress: number };
```

## React Patterns

### Component Structure
```typescript
// ✅ Recommended component structure
import type { ComponentProps } from 'react';

interface ObjectiveCardProps {
  objective: Objective;
  onUpdate?: (id: string) => void;
}

export function ObjectiveCard({ objective, onUpdate }: ObjectiveCardProps) {
  // Hooks first
  const [isEditing, setIsEditing] = useState(false);

  // Event handlers
  const handleSave = async () => {
    // implementation
  };

  // Render
  return (
    <Card>
      {/* JSX */}
    </Card>
  );
}
```

### Server vs Client Components
- **Default to Server Components**: Unless interactivity is needed
- **Use 'use client'**: Only when necessary (state, effects, browser APIs)
- **Server Actions**: For mutations and data fetching

```typescript
// ✅ Server Component (default)
export default async function ObjectivesPage() {
  const objectives = await getObjectives();
  return <ObjectiveList objectives={objectives} />;
}

// ✅ Client Component (when needed)
'use client';
export function ObjectiveForm() {
  const [name, setName] = useState('');
  // interactive logic
}
```

### Hooks Usage
- **useState**: Local component state
- **useEffect**: Side effects with cleanup
- **useMemo**: Expensive computations
- **useCallback**: Stable function references

```typescript
// ✅ Proper useEffect with cleanup
useEffect(() => {
  const channel = supabase.channel('objectives')
    .on('postgres_changes', handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## Database Patterns

### Query Organization
- **Services**: Database logic in `lib/database/services.ts`
- **No client queries**: All queries server-side only
- **Type-safe queries**: Use Drizzle ORM with typed schema
- **Connection management**: Use pooled connections from `lib/database/client.ts`

```typescript
// ✅ Good - Service layer
export async function getObjectiveById(id: string, companyId: string) {
  const db = await getDb();
  return db.query.objectives.findFirst({
    where: and(
      eq(objectives.id, id),
      eq(objectives.companyId, companyId)
    ),
  });
}

// ❌ Bad - Direct query in component
const objective = await db.select().from(objectives).where(...);
```

### Row Level Security
- **Company isolation**: All queries filtered by `company_id`
- **RLS policies**: Enforced at PostgreSQL level
- **No client access**: Direct database access prohibited
- **API routes**: All data access through server-side API routes

## API Route Standards

### Route Structure
- **File naming**: `route.ts` for API routes
- **HTTP methods**: GET, POST, PUT, DELETE, PATCH
- **Response format**: Consistent JSON structure
- **Error handling**: Try-catch with proper error responses

```typescript
// ✅ API Route Pattern
export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await fetchData(user.companyId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Response Patterns
```typescript
// ✅ Success response
return NextResponse.json({
  data: result,
  success: true
});

// ✅ Error response
return NextResponse.json({
  error: 'Validation failed',
  details: validationErrors
}, { status: 400 });
```

## Styling Standards

### Tailwind CSS
- **Utility classes**: Primary styling approach
- **CSS variables**: For theming (`--primary`, `--secondary`)
- **Component classes**: Avoid custom CSS when possible
- **Responsive design**: Mobile-first with breakpoints

```tsx
// ✅ Good - Utility classes with variables
<div className="bg-primary text-primary-foreground rounded-lg p-4">
  <h2 className="text-lg font-semibold">Title</h2>
</div>

// ❌ Bad - Inline styles
<div style={{ backgroundColor: '#000', color: '#fff' }}>
  <h2 style={{ fontSize: '18px' }}>Title</h2>
</div>
```

### Shadcn/ui Components
- **CLI installation**: Use `npx shadcn@latest add <component>`
- **No modifications**: Don't edit installed components directly
- **Composition**: Combine components for custom needs
- **Variants**: Use CVA for component variants

```typescript
// ✅ Component with variants
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border border-input',
      },
    },
  }
);
```

## Form Handling

### React Hook Form + Zod
- **Schema validation**: Zod for type-safe validation
- **Form state**: React Hook Form for form management
- **Server Actions**: For form submission

```typescript
// ✅ Form pattern
const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function ObjectiveForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    await createObjective(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* form fields */}
      </form>
    </Form>
  );
}
```

## Import/Export Patterns

### Import Order
1. External dependencies
2. Internal aliases (`@/`)
3. Relative imports
4. Type imports (at the end)

```typescript
// ✅ Correct import order
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '../utils/format-date';
import type { Objective } from '@/types/Objective';
```

### Export Patterns
- **Named exports**: Prefer named exports for components
- **Default exports**: Use for pages and layouts (Next.js requirement)
- **Barrel files**: Use `index.ts` for re-exporting

```typescript
// ✅ Named exports
export function ObjectiveCard() { }
export function ObjectiveList() { }

// ✅ Default export for pages
export default function ObjectivesPage() { }
```

## Error Handling

### Client-Side
- **Try-catch**: Wrap async operations
- **Toast notifications**: User-friendly error messages
- **Error boundaries**: For component-level errors

```typescript
// ✅ Error handling pattern
try {
  await saveObjective(data);
  toast.success('Objective saved successfully');
} catch (error) {
  console.error('Failed to save objective:', error);
  toast.error('Failed to save objective. Please try again.');
}
```

### Server-Side
- **Validation errors**: 400 status with details
- **Authorization errors**: 401/403 status
- **Server errors**: 500 status with generic message
- **Logging**: Console.error for debugging

## Testing Standards

### Test Organization
- **E2E tests**: Playwright in `tests/` directory
- **Test naming**: Descriptive test names with action and expected result
- **Test data**: Use Faker.js for realistic test data
- **No mocks**: Test against real services

```typescript
// ✅ E2E test pattern
test('should create new objective successfully', async ({ page }) => {
  await page.goto('/objectives');
  await page.click('button:has-text("New Objective")');
  await page.fill('input[name="name"]', 'Test Objective');
  await page.click('button:has-text("Create")');

  await expect(page.locator('text=Test Objective')).toBeVisible();
});
```

## Documentation Standards

### Code Comments
- **JSDoc**: For public functions and components
- **Inline comments**: For complex logic only
- **TODO comments**: With context and assignee

```typescript
/**
 * Creates a new objective in the database
 * @param data - The objective data to create
 * @param companyId - The company ID for RLS filtering
 * @returns The created objective with generated ID
 */
export async function createObjective(
  data: CreateObjectiveInput,
  companyId: string
): Promise<Objective> {
  // Implementation
}

// TODO(agustin): Optimize this query for large datasets
```

### README Files
- **Project root**: Setup instructions, architecture overview
- **Feature docs**: In `docs/` directory
- **API documentation**: OpenAPI/Swagger for public APIs

## Security Best Practices

### Authentication
- **Stack Auth**: Use for all authentication flows
- **Session validation**: Server-side session checks
- **Protected routes**: Middleware for route protection

### Authorization
- **Role-based**: Company admin, manager, member, viewer roles
- **Company isolation**: RLS ensures data separation
- **API protection**: All API routes require authentication

### Data Validation
- **Input validation**: Zod schemas for all inputs
- **SQL injection**: Drizzle ORM prevents injection
- **XSS prevention**: React escapes by default

## Performance Guidelines

### Code Splitting
- **Dynamic imports**: For large components
- **Route-based**: Automatic with Next.js App Router
- **Component-based**: Use `next/dynamic` for heavy components

```typescript
// ✅ Dynamic import for heavy component
import dynamic from 'next/dynamic';

const AnalyticsDashboard = dynamic(
  () => import('@/components/AnalyticsDashboard'),
  { loading: () => <LoadingSpinner /> }
);
```

### Database Optimization
- **Connection pooling**: Always use pooled connections
- **Query optimization**: Use indexes, avoid N+1 queries
- **Caching**: Redis for frequently accessed data

### Image Optimization
- **next/image**: Always use Next.js Image component
- **Formats**: WebP with fallbacks
- **Sizing**: Specify width and height

## Git Workflow

### Commit Messages
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`
- **Descriptive**: Clear explanation of changes
- **Scope**: Include affected module/feature

```
feat(objectives): add bulk import functionality
fix(auth): resolve session expiration issue
docs(api): update authentication documentation
refactor(db): optimize objective queries with indexes
```

### Branch Strategy
- **main**: Production-ready code
- **feature/***: New features
- **fix/***: Bug fixes
- **hotfix/***: Urgent production fixes

### Pull Requests
- **Descriptive title**: Clear summary of changes
- **Description**: What, why, and how
- **Testing**: Evidence of testing
- **Screenshots**: For UI changes
