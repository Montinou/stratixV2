---
created: 2025-09-24T00:43:39Z
last_updated: 2025-09-24T00:43:39Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Coding Standards & Conventions

### TypeScript Guidelines

#### Naming Conventions
- **Variables & Functions**: camelCase (`userName`, `fetchUserData`)
- **Types & Interfaces**: PascalCase (`UserData`, `ObjectiveInterface`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`, `MAX_OBJECTIVES`)
- **Files**: kebab-case for components (`user-profile.tsx`), camelCase for utilities (`userHelpers.ts`)

#### Type Definitions
```typescript
// Interface naming with descriptive suffixes
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// Props interfaces with component name + Props
interface ObjectiveCardProps {
  objective: Objective;
  onUpdate: (id: string) => void;
}

// Type unions with descriptive names
type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'archived';
```

### Component Architecture

#### File Structure Patterns
```
components/
├── ui/              # Shadcn/UI base components
│   ├── button.tsx
│   ├── dialog.tsx
│   └── form.tsx
├── objective/       # Feature-specific components
│   ├── objective-card.tsx
│   ├── objective-form.tsx
│   └── objective-list.tsx
└── shared/          # Reusable business components
    ├── navigation.tsx
    └── layout.tsx
```

#### Component Naming
- **Components**: PascalCase (`ObjectiveCard`, `UserProfile`)
- **Component Files**: Match component name (`ObjectiveCard.tsx`)
- **Hooks**: Start with `use` (`useObjectives`, `useAuth`)
- **Utilities**: camelCase with descriptive action (`formatDate`, `calculateProgress`)

### React Patterns

#### Component Structure
```typescript
interface ComponentProps {
  // Props definition first
}

export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // 1. Hooks (useState, useEffect, custom hooks)
  // 2. Derived state and calculations
  // 3. Event handlers
  // 4. Early returns (loading, error states)
  // 5. Main render

  return (
    <div className="component-wrapper">
      {/* JSX content */}
    </div>
  );
}
```

#### Hook Usage Patterns (Updated for Stack Auth)
```typescript
// ✅ CORRECT - Modern auth pattern with Stack Auth
const { user, isLoading } = useUser();

useEffect(() => {
  if (!isLoading && !user) {
    redirect('/auth/signin');
  }
}, [user, isLoading]);

// ✅ CORRECT - Database service pattern
const [objectives, setObjectives] = useState<Objective[]>([]);
const [loading, setLoading] = useState(true);

const fetchObjectives = useCallback(async () => {
  try {
    setLoading(true);
    const data = await objectiveService.getAll();
    setObjectives(data);
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
  } finally {
    setLoading(false);
  }
}, []);

// ✅ CORRECT - Server action usage
const addObjective = useCallback(async (newObjective: CreateObjectiveInput) => {
  const result = await createObjective(newObjective);
  if (result.success) {
    setObjectives(prev => [...prev, result.data]);
  }
}, []);
```

### Styling Conventions

#### Tailwind CSS Patterns
```typescript
// ✅ PREFERRED - Utility-first with consistent spacing
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900">Objective Title</h2>
  <Button variant="outline" size="sm">Edit</Button>
</div>

// Component variants using Class Variance Authority
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-transparent hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1",
      },
    },
  }
);
```

#### CSS Custom Properties
```css
/* Use CSS variables for theme consistency */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --secondary: 240 4.8% 95.9%;
}

[data-theme="dark"] {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
}
```

## Form Handling Standards

### React Hook Form + Zod + Server Actions Pattern
```typescript
// Define schema in shared validation file
const objectiveSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().optional(),
  targetDate: z.string().datetime(),
  userId: z.string().uuid(),
});

type ObjectiveForm = z.infer<typeof objectiveSchema>;

export function ObjectiveForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
      targetDate: new Date().toISOString(),
    },
  });

  const onSubmit = async (data: ObjectiveForm) => {
    startTransition(async () => {
      const result = await createObjectiveAction(data);
      if (result.success) {
        form.reset();
        toast.success('Objective created successfully');
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Objective'}
        </Button>
      </form>
    </Form>
  );
}
```

## File Organization

### Directory Structure
```
project/
├── app/                 # Next.js app directory
│   ├── (dashboard)/    # Route groups
│   ├── api/           # API routes (legacy)
│   ├── globals.css    # Global styles
│   └── layout.tsx     # Root layout
├── components/         # React components
│   ├── ui/           # Shadcn/ui components
│   ├── okr/          # OKR-specific components
│   └── auth/         # Authentication components
├── lib/               # Core libraries
│   ├── database/     # Database client and services
│   ├── actions/      # Server actions
│   ├── hooks/        # Custom React hooks
│   ├── types/        # TypeScript definitions
│   ├── validations/  # Zod schemas
│   └── utils/        # Utility functions
├── scripts/           # Database and deployment scripts
└── .claude/           # Claude Code PM system
```

### Import Conventions
```typescript
// 1. External libraries
import React from 'react';
import { useForm } from 'react-hook-form';

// 2. Internal utilities and types
import { cn } from '@/lib/utils';
import { objectiveService } from '@/lib/database/services';
import type { Objective } from '@/lib/types/objective';

// 3. Server actions
import { createObjectiveAction } from '@/lib/actions/objectives';

// 4. Components (in dependency order)
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/okr/objective-card';
```

## Comment Style

### Documentation Comments
```typescript
/**
 * Calculates the progress percentage for an objective based on completed key results
 * @param objective - The objective to calculate progress for
 * @returns Progress percentage as a number between 0 and 100
 */
function calculateObjectiveProgress(objective: Objective): number {
  // Implementation details when necessary
  const completedResults = objective.keyResults.filter(kr => kr.status === 'completed');
  return Math.round((completedResults.length / objective.keyResults.length) * 100);
}
```

### Inline Comments
```typescript
// ⚠️ TODO: Implement error boundary for this component
// 🔍 INVESTIGATE: Performance impact of real-time updates
// 🚨 CRITICAL: This prevents infinite loops in auth state
```

## Error Handling Patterns

### Database Service Error Handling
```typescript
// Service layer error handling
export async function fetchObjectives(userId: string): Promise<Objective[]> {
  try {
    const client = await getDbClient();
    const result = await client.query(
      'SELECT * FROM objectives WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      targetDate: row.target_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Database error fetching objectives:', error);
    throw new Error('Failed to load objectives. Please try again.');
  }
}

// Server action error handling
export async function createObjectiveAction(data: ObjectiveForm): Promise<ActionResult<Objective>> {
  try {
    const validatedData = objectiveSchema.parse(data);
    const objective = await objectiveService.create(validatedData);
    revalidatePath('/objectives');
    return { success: true, data: objective };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid data provided' };
    }
    console.error('Server action error:', error);
    return { success: false, error: 'Failed to create objective' };
  }
}
```

### Component Error Boundaries
```typescript
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-lg font-semibold text-red-600">Something went wrong</h2>
      <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      <Button onClick={() => window.location.reload()} className="mt-4">
        Reload Page
      </Button>
    </div>
  );
}
```

## Performance Guidelines

### Component Optimization
- Use `React.memo()` for expensive components
- Implement `useCallback()` for event handlers passed to children
- Use `useMemo()` for expensive calculations
- Avoid creating objects in render methods

### Bundle Size Management
- Dynamic imports for large components
- Tree-shaking friendly exports
- Minimize dependency footprint
- Use Next.js automatic code splitting