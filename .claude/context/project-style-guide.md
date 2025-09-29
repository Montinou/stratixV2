---
created: 2025-09-29T04:50:25Z
last_updated: 2025-09-29T04:50:25Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Style Standards

### TypeScript Configuration

**Strict Mode**: Full TypeScript strict mode enabled
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Type Definitions**: All functions and components must have explicit types
```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  role: UserRole;
}

const UserCard = ({ id, name, role }: UserProps): JSX.Element => {
  return <div>{name}</div>;
};

// ❌ Bad
const UserCard = ({ id, name, role }: any) => {
  return <div>{name}</div>;
};
```

### Naming Conventions

**Files and Directories:**
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Pages**: lowercase (e.g., `page.tsx`, `layout.tsx`)
- **Utilities**: kebab-case (e.g., `auth-utils.ts`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- **Types**: PascalCase (e.g., `UserTypes.ts`)

**Variables and Functions:**
```typescript
// Variables: camelCase
const currentUser = await getUser();
const isAuthenticated = !!currentUser;

// Functions: camelCase
const handleSubmit = (data: FormData) => {};
const validateInput = (input: string): boolean => {};

// Constants: UPPER_SNAKE_CASE
const API_ENDPOINTS = {
  USERS: '/api/users',
  OBJECTIVES: '/api/objectives',
} as const;

// Interfaces: PascalCase with 'I' prefix for interfaces
interface IUserRepository {
  findById(id: string): Promise<User>;
}

// Types: PascalCase
type UserRole = 'admin' | 'manager' | 'employee';
```

**React Components:**
```typescript
// Component names: PascalCase
const ObjectiveCard = ({ objective }: ObjectiveCardProps) => {};

// Props interfaces: ComponentName + Props
interface ObjectiveCardProps {
  objective: Objective;
  onEdit?: (id: string) => void;
}
```

### Import Organization

**Import Order and Grouping:**
```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party library imports (alphabetical)
import { z } from 'zod';
import { useForm } from 'react-hook-form';

// 3. Internal library imports (alphabetical)
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

// 4. Relative imports (alphabetical)
import { UserCard } from './UserCard';
import { validateForm } from '../utils/validation';
```

**Barrel Exports**: Used for component groups
```typescript
// components/okr/index.ts
export { ObjectiveCard } from './ObjectiveCard';
export { InitiativeForm } from './InitiativeForm';
export { ActivityList } from './ActivityList';
```

## Component Architecture

### Component Structure Pattern

```typescript
// Component file structure
import React from 'react';
// ... other imports

// Types and interfaces
interface ComponentProps {
  // prop definitions
}

// Component implementation
const ComponentName = ({ prop1, prop2 }: ComponentProps) => {
  // Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState<StateType>(initialValue);

  // Event handlers
  const handleEvent = (data: EventData) => {
    // handler implementation
  };

  // Early returns for loading/error states
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  // Main render
  return (
    <div className={cn("base-classes", conditionalClasses)}>
      {/* JSX content */}
    </div>
  );
};

// Default export
export default ComponentName;

// Named export if part of barrel
export { ComponentName };
```

### Hook Patterns

**Custom Hook Structure:**
```typescript
// hooks/use-auth.ts
interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook implementation

  return { user, loading, error, login, logout };
};
```

## CSS and Styling Guidelines

### Tailwind CSS Usage

**Class Organization:**
```tsx
// Order: layout → spacing → sizing → colors → typography → decorative
<div className={cn(
  "flex items-center justify-between", // layout
  "px-4 py-2 mb-4",                   // spacing
  "w-full h-12",                      // sizing
  "bg-white border border-gray-200",  // colors/borders
  "text-sm font-medium",              // typography
  "rounded-lg shadow-sm hover:shadow-md transition-shadow" // decorative
)}>
```

**CSS Variables for Theming:**
```css
/* globals.css */
:root {
  --primary: 262.1 83.3% 57.8%;
  --primary-foreground: 210 20% 98%;
  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;
}

[data-theme="dark"] {
  --primary: 263.4 70% 50.4%;
  --primary-foreground: 210 20% 98%;
  --secondary: 215 27.9% 16.9%;
  --secondary-foreground: 210 20% 98%;
}
```

**Component-Specific Styles:**
```tsx
// Use cn() utility for conditional classes
const Button = ({ variant, size, disabled, className, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        buttonVariants({ variant, size }),
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
};
```

## Database and API Patterns

### Database Schema Conventions

**Table Names**: snake_case, plural
```sql
-- Tables
users
objectives
key_results
activities

-- Columns
user_id
created_at
updated_at
```

**Drizzle Schema Patterns:**
```typescript
// db/schema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const objectives = pgTable('objectives', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### API Route Conventions

**Route Structure:**
```typescript
// app/api/objectives/route.ts
export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const objectives = await getObjectivesByUser(user.id);
    return NextResponse.json(objectives);
  } catch (error) {
    console.error('Failed to fetch objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Validation Schemas:**
```typescript
// lib/validations/objective.ts
export const createObjectiveSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;
```

## Error Handling Standards

### Error Boundaries
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### API Error Handling
```typescript
// lib/api-client.ts
export const apiClient = {
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Network error');
    }
  },
};
```

## Documentation Standards

### Component Documentation
```typescript
/**
 * ObjectiveCard displays an objective with progress, status, and actions
 *
 * @param objective - The objective data to display
 * @param onEdit - Callback when edit button is clicked
 * @param onDelete - Callback when delete button is clicked
 * @param className - Additional CSS classes
 *
 * @example
 * <ObjectiveCard
 *   objective={objective}
 *   onEdit={(id) => router.push(`/objectives/${id}/edit`)}
 *   onDelete={handleDelete}
 * />
 */
```

### Function Documentation
```typescript
/**
 * Validates user permissions for a given resource
 *
 * @param user - The user to check permissions for
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @returns boolean indicating if user has permission
 *
 * @throws {UnauthorizedError} When user lacks required permissions
 */
const checkPermission = (
  user: User,
  resource: Resource,
  action: Action
): boolean => {
  // Implementation
};
```

This style guide ensures consistency, maintainability, and scalability across the StratixV2 codebase while adhering to modern TypeScript and React best practices.