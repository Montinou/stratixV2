---
created: 2025-09-23T20:09:22Z
last_updated: 2025-09-23T20:09:22Z
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

#### Hook Usage Patterns
```typescript
// ✅ CORRECT - Safe effect pattern
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/home");
      }
    }
  );
  
  return () => subscription.unsubscribe(); // Cleanup crucial
}, []);

// ✅ CORRECT - Functional state updates
const [objectives, setObjectives] = useState<Objective[]>([]);

const addObjective = useCallback((newObjective: Objective) => {
  setObjectives(prev => [...prev, newObjective]);
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

### React Hook Form + Zod Pattern
```typescript
const objectiveSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().optional(),
  targetDate: z.date(),
});

type ObjectiveForm = z.infer<typeof objectiveSchema>;

export function ObjectiveForm() {
  const form = useForm<ObjectiveForm>({
    resolver: zodResolver(objectiveSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: ObjectiveForm) => {
    // Handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

## File Organization

### Directory Structure
```
src/
├── app/                 # Next.js app directory
│   ├── (dashboard)/    # Route groups
│   ├── api/           # API routes
│   └── globals.css    # Global styles
├── components/         # React components
├── lib/               # Utility functions
│   ├── supabase.ts   # Supabase client
│   ├── validations.ts # Zod schemas
│   └── utils.ts       # General utilities
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── constants/         # Application constants
```

### Import Conventions
```typescript
// 1. External libraries
import React from 'react';
import { useForm } from 'react-hook-form';

// 2. Internal utilities and types
import { cn } from '@/lib/utils';
import type { Objective } from '@/types/objective';

// 3. Components (in dependency order)
import { Button } from '@/components/ui/button';
import { ObjectiveCard } from '@/components/objective/objective-card';
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

### API Error Handling
```typescript
async function fetchObjectives(): Promise<Objective[]> {
  try {
    const { data, error } = await supabase
      .from('objectives')
      .select('*');
    
    if (error) {
      console.error('Failed to fetch objectives:', error);
      throw new Error('Unable to load objectives');
    }
    
    return data || [];
  } catch (error) {
    // Log error and provide user-friendly message
    console.error('Objective fetch error:', error);
    throw error;
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