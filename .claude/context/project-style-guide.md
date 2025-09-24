---
created: 2025-09-24T05:32:18Z
last_updated: 2025-09-24T05:32:18Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Style & Conventions

### TypeScript Standards
- **Strict Mode**: Always use TypeScript strict mode configuration
- **Type Definitions**: Prefer explicit types over `any` or implicit types
- **Interface Naming**: Use PascalCase with descriptive names (`UserProfile`, `ObjectiveData`)
- **Type Imports**: Use `import type` for type-only imports
- **Null Handling**: Use optional chaining (`?.`) and nullish coalescing (`??`)

### File Naming Conventions

#### Components
- **React Components**: PascalCase for directories and files (`ObjectiveCard/ObjectiveCard.tsx`)
- **Page Components**: Lowercase matching Next.js routing (`page.tsx`, `loading.tsx`, `error.tsx`)
- **UI Components**: Kebab-case files with PascalCase exports (`button.tsx` → `export Button`)
- **Hook Files**: Camel-case with `use` prefix (`useAuth.ts`, `useObjectives.ts`)

#### Directories
- **Feature Directories**: Kebab-case (`okr-management`, `user-profiles`)
- **Component Categories**: Singular nouns (`component/`, `hook/`, `util/`)
- **API Routes**: RESTful naming (`api/objectives/`, `api/users/`)

#### Database & Scripts
- **Migration Files**: Numbered with descriptive names (`001_initial_schema.sql`)
- **SQL Files**: Snake_case with action prefix (`create_users_table.sql`)
- **Script Files**: Kebab-case with purpose (`run-migration.sh`, `deploy-health-check.sh`)

### Code Organization Patterns

#### Component Structure
```typescript
// Component file structure template
import type { ComponentProps } from 'react'
import { useState, useEffect } from 'react'

// Type definitions first
interface Props extends ComponentProps<'div'> {
  objective: ObjectiveData
  onUpdate?: (id: string) => void
}

// Component implementation
export function ObjectiveCard({ objective, onUpdate, ...props }: Props) {
  // Hooks at the top
  const [loading, setLoading] = useState(false)
  
  // Event handlers
  const handleUpdate = () => {
    // Implementation
  }
  
  // Render
  return (
    <div {...props}>
      {/* JSX content */}
    </div>
  )
}
```

#### Import Organization
```typescript
// External libraries (React, Next.js, third-party)
import { useState } from 'react'
import { NextPage } from 'next'

// Internal utilities and types
import { cn } from '@/lib/utils'
import type { ObjectiveData } from '@/lib/types/okr'

// Components (UI first, then feature components)
import { Button } from '@/components/ui/button'
import { ObjectiveCard } from '@/components/okr/objective-card'
```

### Database Conventions

#### Table Naming
- **Tables**: Plural nouns in snake_case (`users`, `objectives`, `key_results`)
- **Junction Tables**: Combine entity names (`user_objectives`, `objective_activities`)
- **Columns**: Snake_case with descriptive names (`created_at`, `user_id`, `completion_rate`)

#### Query Patterns
- **Parameterized Queries**: Always use parameterized queries with pg client
- **Transaction Patterns**: Wrap multi-step operations in transactions
- **Error Handling**: Consistent error handling across all database operations
- **Connection Management**: Use connection pooling, always close connections

### Styling Conventions

#### Tailwind CSS Usage
- **Utility-First**: Prefer Tailwind utilities over custom CSS
- **Component Variants**: Use Class Variance Authority for component styling
- **Responsive Design**: Mobile-first approach with responsive utilities
- **Theme Variables**: Use CSS custom properties for theme values

#### CSS Custom Properties
```css
/* Theme-aware color system */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

[data-theme="dark"] {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

#### Component Styling Patterns
```typescript
// Using Class Variance Authority
import { cva } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
```

### API Design Standards

#### REST API Conventions
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **URL Structure**: RESTful resource-based URLs (`/api/objectives/{id}`)
- **Response Format**: Consistent JSON structure with status codes
- **Error Handling**: Structured error responses with meaningful messages

#### Next.js API Routes
```typescript
// API route structure template
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const RequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = RequestSchema.parse(body)
    
    // Implementation
    
    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json(
      { error: 'Validation failed' },
      { status: 400 }
    )
  }
}
```

### Form Handling Standards

#### React Hook Form + Zod Pattern
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.date(),
})

type FormData = z.infer<typeof formSchema>

export function ObjectiveForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })
  
  const onSubmit = (data: FormData) => {
    // Handle form submission
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## Documentation Standards

### Code Comments
- **JSDoc**: Use JSDoc comments for public functions and complex logic
- **Inline Comments**: Explain "why" not "what" - focus on business logic
- **TODO Comments**: Include issue numbers and assignee (`TODO: #123 - @username`)
- **FIXME Comments**: Mark temporary solutions with context

### README Standards
- **Structure**: Use consistent heading hierarchy
- **Code Examples**: Always include runnable examples
- **Prerequisites**: List all dependencies and requirements
- **Setup Instructions**: Step-by-step setup with verification steps

### Git Commit Standards

#### Commit Message Format
```
type(scope): description

Extended description if needed

- List specific changes
- Reference issue numbers (#123)
- Include breaking change notes
```

#### Commit Types
- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation updates
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without feature changes
- **test**: Adding or updating tests
- **chore**: Build process, dependency updates

### Error Handling Patterns

#### Frontend Error Handling
```typescript
// Component error boundaries
export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundaryProvider fallback={ErrorFallback}>
      {children}
    </ErrorBoundaryProvider>
  )
}

// Async operation error handling
const [data, error] = await asyncOperation()
if (error) {
  toast.error('Operation failed')
  return
}
```

#### Database Error Handling
```typescript
// Database operation with proper error handling
export async function createObjective(data: ObjectiveData) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const result = await client.query(
      'INSERT INTO objectives (title, description) VALUES ($1, $2) RETURNING *',
      [data.title, data.description]
    )
    
    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw new Error(`Failed to create objective: ${error.message}`)
  } finally {
    client.release()
  }
}
```

## Testing Standards

### Testing Philosophy
- **Test Pyramid**: Unit tests (70%), Integration tests (20%), E2E tests (10%)
- **Test Coverage**: Aim for 80%+ coverage on critical business logic
- **Test Naming**: Descriptive test names explaining the scenario
- **Test Organization**: Group tests by feature/component

### Testing Patterns (Future Implementation)
```typescript
// Component testing template
import { render, screen, fireEvent } from '@testing-library/react'
import { ObjectiveCard } from './ObjectiveCard'

describe('ObjectiveCard', () => {
  it('should display objective title and description', () => {
    const objective = {
      id: '1',
      title: 'Test Objective',
      description: 'Test description',
    }
    
    render(<ObjectiveCard objective={objective} />)
    
    expect(screen.getByText('Test Objective')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })
})
```

## Performance Standards

### Frontend Performance
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Bundle Size**: Keep individual chunks under 250KB
- **Image Optimization**: Always use Next.js Image component
- **Code Splitting**: Implement route-based and component-based splitting

### Database Performance
- **Query Optimization**: Always review query execution plans
- **Connection Pooling**: Use connection pooling for all database operations
- **Index Strategy**: Create indexes for commonly queried columns
- **Migration Performance**: Test migrations on production-like data volumes

### Security Standards

#### Data Protection
- **Input Validation**: Validate all user inputs with Zod schemas
- **SQL Injection Prevention**: Use parameterized queries exclusively
- **XSS Prevention**: Sanitize user content before rendering
- **CSRF Protection**: Implement CSRF tokens for state-changing operations

#### Authentication Security
- **Session Management**: Use secure, database-backed sessions
- **Password Handling**: Never store plain-text passwords
- **Route Protection**: Implement middleware-based route protection
- **API Security**: Validate authentication on all API endpoints

---

**Last Updated**: 2025-09-24T05:32:18Z  
**Style Guide Version**: 1.0 - Initial comprehensive style guide  
**Key Focus**: TypeScript-first development with modern React patterns and NeonDB integration