---
created: 2025-10-01T09:07:54Z
last_updated: 2025-10-01T09:07:54Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Standards

### TypeScript Standards

#### Type Definitions
- **Always use TypeScript**: No `.js` or `.jsx` files
- **Strict mode enabled**: No `any` types without justification
- **Explicit return types**: For all functions
- **Interface over type**: For object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<User> {
  return await db.query.users.findFirst({ where: eq(users.id, id) });
}

// ❌ Bad
function getUser(id) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

#### Null Safety
- Use optional chaining: `user?.profile?.name`
- Use nullish coalescing: `value ?? defaultValue`
- Avoid loose equality: Use `===` and `!==`

```typescript
// ✅ Good
const name = user?.profile?.name ?? 'Anonymous';

if (status === 'active') {
  // ...
}

// ❌ Bad
const name = user && user.profile && user.profile.name || 'Anonymous';

if (status == 'active') {
  // ...
}
```

### Naming Conventions

#### Variables & Functions
- **camelCase**: For variables, functions, methods
- **Descriptive names**: No single letters except loops
- **Boolean prefixes**: `is`, `has`, `should`, `can`

```typescript
// ✅ Good
const userProfile = getUserProfile();
const isAuthenticated = checkAuth();
const hasPermission = user.role === 'admin';

function calculateTotalProgress(objectives: Objective[]): number {
  // ...
}

// ❌ Bad
const up = getUserProfile();
const auth = checkAuth();
const perm = user.role === 'admin';

function calc(objs) {
  // ...
}
```

#### Components
- **PascalCase**: For React components and types
- **Kebab-case**: For component files

```typescript
// File: components/okr/objective-card.tsx
export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  // ...
}

// File: components/dashboard/analytics-chart.tsx
export function AnalyticsChart({ data }: AnalyticsChartProps) {
  // ...
}
```

#### Constants
- **UPPER_SNAKE_CASE**: For true constants
- **camelCase**: For configuration objects

```typescript
// ✅ Good
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const formConfig = {
  maxLength: 100,
  required: true
};

// ❌ Bad
const maxuploadsize = 5242880;
const FORM_CONFIG = {
  maxLength: 100
};
```

#### Database Tables & Columns
- **snake_case**: For database identifiers
- **Descriptive names**: Full words, not abbreviations

```typescript
// ✅ Good
export const objectivesTable = pgTable('objectives', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// ❌ Bad
export const objTbl = pgTable('objs', {
  id: uuid('id').primaryKey(),
  cId: uuid('c_id').notNull(),
  crAt: timestamp('cr_at').defaultNow()
});
```

### File Structure Patterns

#### Component Files
```typescript
// File: components/okr/objective-card.tsx

// 1. Imports (grouped)
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Objective } from '@/lib/types';

// 2. Types/Interfaces
interface ObjectiveCardProps {
  objective: Objective;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// 3. Component
export function ObjectiveCard({ objective, onEdit, onDelete }: ObjectiveCardProps) {
  // 3a. Hooks
  const [isExpanded, setIsExpanded] = useState(false);

  // 3b. Derived state
  const isComplete = objective.status === 'completed';

  // 3c. Handlers
  const handleEdit = () => {
    onEdit?.(objective.id);
  };

  // 3d. Render
  return (
    <Card>
      <CardHeader>
        <CardTitle>{objective.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ... */}
      </CardContent>
    </Card>
  );
}
```

#### API Route Files
```typescript
// File: app/api/objectives/route.ts

// 1. Imports
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database/client';
import { stackServerApp } from '@/lib/stack-auth';

// 2. Validation schemas
const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  areaId: z.string().uuid()
});

// 3. Route handlers
export async function GET(req: NextRequest) {
  try {
    // Authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Business logic
    const objectives = await db.query.objectives.findMany({
      where: eq(objectives.companyId, user.companyId)
    });

    // Response
    return NextResponse.json(objectives);
  } catch (error) {
    console.error('GET /api/objectives error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Similar structure...
}
```

### Comment Style

#### When to Comment
- **Complex logic**: Explain "why", not "what"
- **Business rules**: Document requirements
- **Workarounds**: Explain temporary solutions
- **TODOs**: Track future improvements

```typescript
// ✅ Good - Explains why
// We use company_id filter to enforce RLS at application level
// in addition to database policies for defense in depth
const objectives = await db.query.objectives.findMany({
  where: eq(objectives.companyId, user.companyId)
});

// Business rule: Managers can only create initiatives under
// objectives owned by their area
if (user.role === 'manager' && !userOwnsArea(objective.areaId)) {
  throw new Error('Insufficient permissions');
}

// TODO: Implement caching here once Redis is configured
// Issue: #123
const analytics = await calculateAnalytics(companyId);

// ❌ Bad - States the obvious
// Get objectives from database
const objectives = await db.query.objectives.findMany();

// Loop through users
for (const user of users) {
  // ...
}
```

#### JSDoc for Public APIs
```typescript
/**
 * Calculates the completion percentage for an objective based on its initiatives.
 *
 * @param objectiveId - The UUID of the objective
 * @returns A number between 0 and 100 representing completion percentage
 * @throws {NotFoundError} If objective doesn't exist
 */
export async function calculateObjectiveProgress(objectiveId: string): Promise<number> {
  // Implementation
}
```

## React/Next.js Conventions

### Component Patterns

#### Server vs. Client Components
```typescript
// ✅ Server Component (default) - Good for:
// - Data fetching
// - Direct database access
// - No interactivity
async function ObjectivesPage() {
  const objectives = await db.query.objectives.findMany();
  return <ObjectiveList objectives={objectives} />;
}

// ✅ Client Component - Good for:
// - Interactive features
// - Browser APIs
// - State management
'use client'
function ObjectiveForm() {
  const [title, setTitle] = useState('');
  // ...
}
```

#### Custom Hooks
```typescript
// File: lib/hooks/use-user.ts

'use client'
import { useUser as useStackUser } from '@stackframe/stack';

export function useUser() {
  const stackUser = useStackUser();

  const isAdmin = stackUser?.role === 'corporate';
  const isManager = stackUser?.role === 'manager';
  const isEmployee = stackUser?.role === 'employee';

  return {
    user: stackUser,
    isAdmin,
    isManager,
    isEmployee,
    isAuthenticated: !!stackUser
  };
}
```

### Styling Conventions

#### Tailwind CSS Usage
```tsx
// ✅ Good - Semantic grouping, readable
<div className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm">
  <Avatar className="h-10 w-10" />
  <div className="flex-1 space-y-1">
    <h3 className="text-sm font-medium">User Name</h3>
    <p className="text-xs text-muted-foreground">user@example.com</p>
  </div>
</div>

// ❌ Bad - Hard to read
<div className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm"><Avatar className="h-10 w-10" /><div className="flex-1 space-y-1"><h3 className="text-sm font-medium">User Name</h3><p className="text-xs text-muted-foreground">user@example.com</p></div></div>
```

#### CSS Variables
```css
/* ✅ Good - Use design system variables */
.custom-card {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}

/* ❌ Bad - Hardcoded colors */
.custom-card {
  background: #ffffff;
  color: #000000;
  border: 1px solid #e5e7eb;
}
```

## Database Conventions

### Query Patterns
```typescript
// ✅ Good - Type-safe with Drizzle
const objective = await db.query.objectives.findFirst({
  where: and(
    eq(objectives.id, objectiveId),
    eq(objectives.companyId, user.companyId)
  ),
  with: {
    initiatives: true,
    area: true
  }
});

// ✅ Good - Transactions for related operations
await db.transaction(async (tx) => {
  const objective = await tx.insert(objectives).values(data).returning();
  await tx.insert(audit_logs).values({
    action: 'create_objective',
    objectiveId: objective.id
  });
});

// ❌ Bad - Raw SQL without reason
await db.execute('SELECT * FROM objectives WHERE id = $1', [objectiveId]);
```

### Migration Patterns
```typescript
// File: drizzle/0001_add_areas.ts

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export async function up(db) {
  await db.schema.createTable('areas', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    companyId: uuid('company_id').notNull().references(() => companies.id),
    createdAt: timestamp('created_at').defaultNow().notNull()
  });

  await db.schema.createIndex('areas_company_id_idx')
    .on('areas', 'company_id');
}
```

## Testing Conventions (Future)

### Test File Structure
```typescript
// File: __tests__/lib/services/objective-service.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { calculateObjectiveProgress } from '@/lib/services/objective-service';

describe('ObjectiveService', () => {
  describe('calculateObjectiveProgress', () => {
    it('returns 0 for objective with no initiatives', async () => {
      const progress = await calculateObjectiveProgress('obj-123');
      expect(progress).toBe(0);
    });

    it('calculates average progress from initiatives', async () => {
      // Setup test data
      // Run calculation
      // Assert result
    });
  });
});
```

## Git Conventions

### Commit Messages
Format: `<type>: <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `style`: Formatting, missing semicolons
- `test`: Adding tests
- `chore`: Maintenance tasks

```bash
# ✅ Good
feat: implement CSV and XLSX import functionality with role-based permissions
fix: correct schema field naming for consistency
refactor: extract objective service into separate module
docs: update README with deployment instructions

# ❌ Bad
updated stuff
fix bug
new feature
changes
```

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code improvements
- `docs/description` - Documentation

```bash
# ✅ Good
feature/csv-import
fix/auth-redirect-loop
refactor/objective-service
docs/api-endpoints

# ❌ Bad
new-stuff
bugfix
temp
test-branch
```

## Error Handling

### API Error Responses
```typescript
// ✅ Good - Consistent error structure
return NextResponse.json(
  {
    error: 'Validation failed',
    details: validationErrors,
    code: 'VALIDATION_ERROR'
  },
  { status: 400 }
);

// ✅ Good - Proper error logging
catch (error) {
  console.error('Failed to create objective:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

## Security Best Practices

### Input Validation
```typescript
// ✅ Always validate user input
const schema = z.object({
  title: z.string().min(1).max(200),
  email: z.string().email()
});

const validated = schema.parse(req.body);

// ✅ Sanitize HTML if displaying user content
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### Authentication Checks
```typescript
// ✅ Check auth first in every API route
const user = await stackServerApp.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ✅ Validate permissions
if (user.role !== 'corporate' && user.role !== 'manager') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Database Security
```typescript
// ✅ Always filter by company_id
const objectives = await db.query.objectives.findMany({
  where: and(
    eq(objectives.companyId, user.companyId),
    eq(objectives.id, requestedId)
  )
});

// ❌ Never trust user input for company_id
// This could allow data leakage!
const objectives = await db.query.objectives.findMany({
  where: eq(objectives.companyId, req.body.companyId) // DANGEROUS!
});
```
