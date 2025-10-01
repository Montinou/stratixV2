# Mock Data Replacement Guide

**Date**: 2025-09-30
**Status**: 📋 Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Reference](#database-schema-reference)
3. [RLS Context Setup](#rls-context-setup)
4. [Page-by-Page Migration](#page-by-page-migration)
   - [Objectives Page](#1-objectives-page)
   - [Initiatives Page](#2-initiatives-page)
   - [Activities Page](#3-activities-page)
   - [Analytics Page](#4-analytics-page)
   - [OKR Dashboard](#5-okr-dashboard)
   - [Insights Page](#6-insights-page)
5. [Service Layer Patterns](#service-layer-patterns)
6. [TypeScript Types](#typescript-types)
7. [Testing Checklist](#testing-checklist)

---

## Overview

This guide documents the complete process for replacing hardcoded mock data with real database queries across all dashboard pages. The application uses:

- **Database**: NeonDB (PostgreSQL)
- **ORM**: Drizzle ORM
- **Auth**: Stack Auth (users in `neon_auth.users_sync`)
- **Multi-Tenancy**: Row Level Security (RLS) with `tenant_id`
- **Framework**: Next.js 15 Server Components

**Critical Requirements:**
1. ✅ All queries must set RLS context (`app.current_user_id`)
2. ✅ All queries must filter by `tenant_id`
3. ✅ Use Drizzle ORM for type safety
4. ✅ Handle empty states gracefully
5. ✅ Use Server Components for data fetching

---

## Database Schema Reference

### Core Tables

#### `companies` (Organizations)
```typescript
{
  id: uuid,
  name: text,
  slug: text (unique),
  logoUrl: text,
  settings: jsonb,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `profiles` (User Profiles)
```typescript
{
  id: uuid,              // Stack Auth user ID
  email: text,
  fullName: text,
  role: 'corporativo' | 'gerente' | 'empleado',
  department: text,
  managerId: uuid,
  companyId: uuid,       // FK to companies
  tenantId: uuid,        // = companyId for isolation
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `objectives` (OKR Objectives)
```typescript
{
  id: uuid,
  title: varchar(500),
  description: text,
  department: varchar(100),
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high',
  progressPercentage: numeric(5,2),
  targetValue: numeric(10,2),
  currentValue: numeric(10,2),
  unit: varchar(50),
  startDate: timestamp,
  endDate: timestamp,
  companyId: uuid,       // FK to companies
  createdBy: text,       // FK to neon_auth.users_sync
  assignedTo: text,      // FK to neon_auth.users_sync
  tenantId: uuid,        // For RLS
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `initiatives` (Strategic Initiatives)
```typescript
{
  id: uuid,
  title: varchar(500),
  description: text,
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high',
  progressPercentage: numeric(5,2),
  budget: numeric(12,2),
  startDate: timestamp,
  endDate: timestamp,
  objectiveId: uuid,     // FK to objectives
  companyId: uuid,       // FK to companies
  createdBy: text,       // FK to neon_auth.users_sync
  assignedTo: text,      // FK to neon_auth.users_sync
  tenantId: uuid,        // For RLS
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `activities` (Tasks)
```typescript
{
  id: uuid,
  title: varchar(500),
  description: text,
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high',
  estimatedHours: numeric(6,2),
  actualHours: numeric(6,2),
  dueDate: timestamp,
  completedAt: timestamp,
  initiativeId: uuid,    // FK to initiatives
  companyId: uuid,       // FK to companies
  createdBy: text,       // FK to neon_auth.users_sync
  assignedTo: text,      // FK to neon_auth.users_sync
  tenantId: uuid,        // For RLS
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Indexes

All major tables have indexes on:
- `tenant_id` - Critical for RLS performance
- `status` - For filtering by status
- `assigned_to` - For user-specific queries
- Foreign keys (company_id, objective_id, initiative_id)

---

## RLS Context Setup

### Critical: Set User Context Before Queries

RLS policies use `current_setting('app.current_user_id', true)::text` to determine the current user's `tenant_id`. **You must set this before every query.**

### Pattern 1: Database Client Wrapper

**File**: `lib/database/rls-client.ts` (create this)

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/db/okr-schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
});

/**
 * Set RLS context for current user
 * MUST be called before any tenant-scoped queries
 */
export async function setUserContext(userId: string) {
  await pool.query(
    'SELECT set_config($1, $2, true)',
    ['app.current_user_id', userId]
  );
}

/**
 * Get database instance with Drizzle
 */
export function getDb() {
  return drizzle(pool, { schema });
}

/**
 * Execute query with RLS context set
 * Recommended pattern for Server Components
 */
export async function withRLSContext<T>(
  userId: string,
  callback: () => Promise<T>
): Promise<T> {
  await setUserContext(userId);
  return await callback();
}
```

### Pattern 2: Using in Server Components

```typescript
import { stackServerApp } from '@/stack/server';
import { withRLSContext, getDb } from '@/lib/database/rls-client';
import { objectives } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

export default async function ObjectivesPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });

  // Get user's profile to access tenant_id
  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect('/onboarding/create');
  }

  // Execute query with RLS context
  const objectivesList = await withRLSContext(user.id, async () => {
    const db = getDb();
    return await db
      .select()
      .from(objectives)
      .where(eq(objectives.tenantId, profile.tenantId))
      .orderBy(objectives.createdAt);
  });

  return (
    <div>
      {objectivesList.map(obj => (
        <ObjectiveCard key={obj.id} objective={obj} />
      ))}
    </div>
  );
}
```

### Pattern 3: Service Layer (Recommended)

**File**: `lib/services/objectives-service.ts` (create this)

```typescript
import { getDb, withRLSContext } from '@/lib/database/rls-client';
import { objectives } from '@/db/okr-schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getObjectives(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db
      .select()
      .from(objectives)
      .where(eq(objectives.tenantId, tenantId))
      .orderBy(desc(objectives.createdAt));
  });
}

export async function getObjectivesByStatus(
  userId: string,
  tenantId: string,
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db
      .select()
      .from(objectives)
      .where(
        and(
          eq(objectives.tenantId, tenantId),
          eq(objectives.status, status)
        )
      )
      .orderBy(desc(objectives.createdAt));
  });
}
```

---

## Page-by-Page Migration

### 1. Objectives Page

**File**: `/app/tools/objectives/page.tsx`

#### Current Mock Data

```typescript
const objectives = [
  {
    id: '1',
    title: 'Aumentar la satisfacción del cliente',
    department: 'Ventas',
    status: 'in_progress',
    priority: 'high',
    progress: 75,
    targetValue: 90,
    currentValue: 67.5,
    unit: '%',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    assignedTo: 'María García',
  },
  // ... 4 more items
];
```

#### New Implementation

**Step 1**: Create service function

```typescript
// lib/services/objectives-service.ts
import { getDb, withRLSContext } from '@/lib/database/rls-client';
import { objectives, profiles } from '@/db/okr-schema';
import { eq, desc, sql } from 'drizzle-orm';

export interface ObjectiveWithAssignee {
  id: string;
  title: string;
  department: string;
  status: string;
  priority: string;
  progressPercentage: string;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  startDate: Date;
  endDate: Date;
  assignedTo: string | null;
  assigneeName: string | null;
  createdAt: Date;
}

export async function getObjectivesForPage(
  userId: string,
  tenantId: string
): Promise<ObjectiveWithAssignee[]> {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    // Query with LEFT JOIN to get assignee name
    const results = await db
      .select({
        id: objectives.id,
        title: objectives.title,
        department: objectives.department,
        status: objectives.status,
        priority: objectives.priority,
        progressPercentage: objectives.progressPercentage,
        targetValue: objectives.targetValue,
        currentValue: objectives.currentValue,
        unit: objectives.unit,
        startDate: objectives.startDate,
        endDate: objectives.endDate,
        assignedTo: objectives.assignedTo,
        assigneeName: profiles.fullName,
        createdAt: objectives.createdAt,
      })
      .from(objectives)
      .leftJoin(profiles, eq(objectives.assignedTo, profiles.id))
      .where(eq(objectives.tenantId, tenantId))
      .orderBy(desc(objectives.createdAt));

    return results.map(r => ({
      ...r,
      id: r.id,
      title: r.title,
      department: r.department ?? 'General',
      status: r.status,
      priority: r.priority,
      progressPercentage: r.progressPercentage ?? '0',
      targetValue: r.targetValue,
      currentValue: r.currentValue,
      unit: r.unit,
      startDate: r.startDate,
      endDate: r.endDate,
      assignedTo: r.assignedTo,
      assigneeName: r.assigneeName ?? 'Sin asignar',
      createdAt: r.createdAt,
    }));
  });
}

export async function getObjectiveStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) FILTER (WHERE status = 'draft')::int`,
        inProgress: sql<number>`count(*) FILTER (WHERE status = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        cancelled: sql<number>`count(*) FILTER (WHERE status = 'cancelled')::int`,
      })
      .from(objectives)
      .where(eq(objectives.tenantId, tenantId));

    return stats[0];
  });
}
```

**Step 2**: Update page component

```typescript
// app/tools/objectives/page.tsx
import { stackServerApp } from '@/stack/server';
import { getUserProfile } from '@/lib/organization/organization-service';
import { getObjectivesForPage, getObjectiveStats } from '@/lib/services/objectives-service';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default async function ObjectivesPage() {
  const user = await stackServerApp.getUser({ or: 'redirect' });
  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect('/onboarding/create');
  }

  // Fetch real data from database
  const [objectivesList, stats] = await Promise.all([
    getObjectivesForPage(user.id, profile.tenantId),
    getObjectiveStats(user.id, profile.tenantId),
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objetivos</h1>
          <p className="text-muted-foreground">
            Gestiona tus Objetivos y Resultados Clave (OKRs)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Objetivo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Objetivos totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Pendientes de iniciar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Actualmente activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Alcanzados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Descartados</p>
          </CardContent>
        </Card>
      </div>

      {/* Objectives List */}
      <div className="space-y-4">
        {objectivesList.length > 0 ? (
          objectivesList.map((objective) => (
            <Card
              key={objective.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{objective.title}</CardTitle>
                    <CardDescription>
                      Departamento: {objective.department} • Asignado a: {objective.assigneeName}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(objective.status)}>
                      {objective.status === 'in_progress'
                        ? 'En Progreso'
                        : objective.status === 'completed'
                        ? 'Completado'
                        : objective.status === 'draft'
                        ? 'Borrador'
                        : 'Cancelado'}
                    </Badge>
                    <Badge className={getPriorityColor(objective.priority)}>
                      {objective.priority === 'high'
                        ? 'Alta'
                        : objective.priority === 'medium'
                        ? 'Media'
                        : 'Baja'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progreso</span>
                    <span className="font-medium">
                      {Number(objective.progressPercentage).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Number(objective.progressPercentage)} />
                  {objective.targetValue && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Actual: {Number(objective.currentValue ?? 0).toFixed(1)}
                        {objective.unit}
                      </span>
                      <span>
                        Meta: {Number(objective.targetValue).toFixed(1)}
                        {objective.unit}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground pt-2">
                    <span>
                      Inicio: {new Date(objective.startDate).toLocaleDateString('es-ES')}
                    </span>
                    <span>
                      Fin: {new Date(objective.endDate).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay objetivos</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comienza creando tu primer objetivo
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Objetivo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

#### Migration Checklist

- [ ] Create `lib/database/rls-client.ts`
- [ ] Create `lib/services/objectives-service.ts`
- [ ] Update `app/tools/objectives/page.tsx`
- [ ] Remove hardcoded mock array
- [ ] Test with multiple users in different tenants
- [ ] Verify RLS isolation (user A cannot see user B's data)
- [ ] Test empty state (no objectives)
- [ ] Test performance with 100+ objectives

---

### 2. Initiatives Page

**File**: `/app/tools/initiatives/page.tsx`

#### Current Mock Data

```typescript
const initiatives = [
  {
    id: '1',
    title: 'Implementar chatbot de atención al cliente',
    description: 'Desarrollar un chatbot con IA para mejorar la atención',
    status: 'in_progress',
    priority: 'high',
    progress: 65,
    budget: 50000,
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    assignedTo: 'Carlos Ruiz',
    objectiveTitle: 'Aumentar la satisfacción del cliente',
    department: 'Tecnología',
  },
  // ... 4 more items
];
```

#### New Implementation

**Service Function**:

```typescript
// lib/services/initiatives-service.ts
import { getDb, withRLSContext } from '@/lib/database/rls-client';
import { initiatives, objectives, profiles } from '@/db/okr-schema';
import { eq, desc, sql } from 'drizzle-orm';

export interface InitiativeWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progressPercentage: string;
  budget: string | null;
  startDate: Date;
  endDate: Date;
  assignedTo: string | null;
  assigneeName: string | null;
  objectiveTitle: string;
  objectiveDepartment: string;
  createdAt: Date;
}

export async function getInitiativesForPage(
  userId: string,
  tenantId: string
): Promise<InitiativeWithDetails[]> {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const results = await db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        progressPercentage: initiatives.progressPercentage,
        budget: initiatives.budget,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        assignedTo: initiatives.assignedTo,
        assigneeName: profiles.fullName,
        objectiveTitle: objectives.title,
        objectiveDepartment: objectives.department,
        createdAt: initiatives.createdAt,
      })
      .from(initiatives)
      .innerJoin(objectives, eq(initiatives.objectiveId, objectives.id))
      .leftJoin(profiles, eq(initiatives.assignedTo, profiles.id))
      .where(eq(initiatives.tenantId, tenantId))
      .orderBy(desc(initiatives.createdAt));

    return results.map(r => ({
      ...r,
      description: r.description,
      progressPercentage: r.progressPercentage ?? '0',
      budget: r.budget,
      assignedTo: r.assignedTo,
      assigneeName: r.assigneeName ?? 'Sin asignar',
      objectiveTitle: r.objectiveTitle,
      objectiveDepartment: r.objectiveDepartment ?? 'General',
      createdAt: r.createdAt,
    }));
  });
}

export async function getInitiativeStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        planning: sql<number>`count(*) FILTER (WHERE status = 'planning')::int`,
        inProgress: sql<number>`count(*) FILTER (WHERE status = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        cancelled: sql<number>`count(*) FILTER (WHERE status = 'cancelled')::int`,
      })
      .from(initiatives)
      .where(eq(initiatives.tenantId, tenantId));

    return stats[0];
  });
}
```

**Updated Page Component**:

Similar pattern to objectives page - replace mock data with service calls, handle empty states.

#### Migration Checklist

- [ ] Create `lib/services/initiatives-service.ts`
- [ ] Update `app/tools/initiatives/page.tsx`
- [ ] Remove hardcoded mock array
- [ ] Test JOIN with objectives table
- [ ] Verify assignee names display correctly
- [ ] Test empty state

---

### 3. Activities Page

**File**: `/app/tools/activities/page.tsx`

#### Service Function

```typescript
// lib/services/activities-service.ts
import { getDb, withRLSContext } from '@/lib/database/rls-client';
import { activities, initiatives, profiles } from '@/db/okr-schema';
import { eq, desc, sql } from 'drizzle-orm';

export interface ActivityWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimatedHours: string | null;
  actualHours: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  assignedTo: string | null;
  assigneeName: string | null;
  initiativeTitle: string;
  department: string;
  createdAt: Date;
}

export async function getActivitiesForPage(
  userId: string,
  tenantId: string
): Promise<ActivityWithDetails[]> {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const results = await db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        status: activities.status,
        priority: activities.priority,
        estimatedHours: activities.estimatedHours,
        actualHours: activities.actualHours,
        dueDate: activities.dueDate,
        completedAt: activities.completedAt,
        assignedTo: activities.assignedTo,
        assigneeName: profiles.fullName,
        initiativeTitle: initiatives.title,
        // Get department from parent initiative's objective would require another join
        // For simplicity, using a default or profile department
        department: profiles.department,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .innerJoin(initiatives, eq(activities.initiativeId, initiatives.id))
      .leftJoin(profiles, eq(activities.assignedTo, profiles.id))
      .where(eq(activities.tenantId, tenantId))
      .orderBy(desc(activities.createdAt));

    return results.map(r => ({
      ...r,
      description: r.description,
      estimatedHours: r.estimatedHours,
      actualHours: r.actualHours,
      dueDate: r.dueDate,
      completedAt: r.completedAt,
      assignedTo: r.assignedTo,
      assigneeName: r.assigneeName ?? 'Sin asignar',
      department: r.department ?? 'General',
    }));
  });
}

export async function getActivityStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(*) FILTER (WHERE status = 'todo')::int`,
        inProgress: sql<number>`count(*) FILTER (WHERE status = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        overdue: sql<number>`count(*) FILTER (WHERE status != 'completed' AND due_date < now())::int`,
      })
      .from(activities)
      .where(eq(activities.tenantId, tenantId));

    return stats[0];
  });
}
```

---

### 4. Analytics Page

**File**: `/app/tools/analytics/page.tsx`

This page requires complex aggregations. The current mock includes:
- Overview stats (total objectives, progress, etc.)
- Department progress breakdown
- Monthly trends
- Top performers
- Upcoming deadlines

#### Service Function

```typescript
// lib/services/analytics-service.ts
import { getDb, withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles } from '@/db/okr-schema';
import { eq, sql, and, lt, desc } from 'drizzle-orm';

export async function getAnalyticsOverview(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const [objectiveStats, initiativeStats, activityStats] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
          avgProgress: sql<number>`avg(COALESCE(progress_percentage::numeric, 0))::numeric`,
        })
        .from(objectives)
        .where(eq(objectives.tenantId, tenantId))
        .then(r => r[0]),

      db
        .select({
          active: sql<number>`count(*) FILTER (WHERE status = 'in_progress')::int`,
        })
        .from(initiatives)
        .where(eq(initiatives.tenantId, tenantId))
        .then(r => r[0]),

      db
        .select({
          completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        })
        .from(activities)
        .where(eq(activities.tenantId, tenantId))
        .then(r => r[0]),
    ]);

    return {
      totalObjectives: objectiveStats.total,
      completedObjectives: objectiveStats.completed,
      activeInitiatives: initiativeStats.active,
      completedActivities: activityStats.completed,
      overallProgress: Number(objectiveStats.avgProgress ?? 0),
    };
  });
}

export async function getDepartmentProgress(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const results = await db
      .select({
        department: objectives.department,
        progress: sql<number>`avg(COALESCE(progress_percentage::numeric, 0))::numeric`,
        target: sql<number>`avg(COALESCE(target_value::numeric, 100))::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(objectives)
      .where(eq(objectives.tenantId, tenantId))
      .groupBy(objectives.department)
      .orderBy(desc(sql`avg(COALESCE(progress_percentage::numeric, 0))`));

    return results.map(r => ({
      department: r.department ?? 'General',
      progress: Number(r.progress),
      target: 100, // Simplified - could calculate from target_value
      trend: 'neutral' as const, // Would require historical data
    }));
  });
}

export async function getTopPerformers(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const results = await db
      .select({
        id: profiles.id,
        name: profiles.fullName,
        department: profiles.department,
        completed: sql<number>`count(activities.id) FILTER (WHERE activities.status = 'completed')::int`,
      })
      .from(profiles)
      .leftJoin(
        activities,
        and(
          eq(profiles.id, activities.assignedTo),
          eq(activities.tenantId, tenantId)
        )
      )
      .where(eq(profiles.tenantId, tenantId))
      .groupBy(profiles.id, profiles.fullName, profiles.department)
      .orderBy(desc(sql`count(activities.id) FILTER (WHERE activities.status = 'completed')`))
      .limit(4);

    return results.map(r => ({
      name: r.name,
      department: r.department ?? 'General',
      completed: r.completed,
    }));
  });
}

export async function getUpcomingDeadlines(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const results = await db
      .select({
        title: objectives.title,
        endDate: objectives.endDate,
        progress: objectives.progressPercentage,
      })
      .from(objectives)
      .where(
        and(
          eq(objectives.tenantId, tenantId),
          sql`${objectives.endDate} > now()`,
          sql`${objectives.endDate} < now() + interval '60 days'`
        )
      )
      .orderBy(objectives.endDate)
      .limit(4);

    return results.map(r => ({
      title: r.title,
      daysLeft: Math.ceil(
        (new Date(r.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      ),
      progress: Number(r.progress ?? 0),
    }));
  });
}
```

#### Page Update

Replace all mock data sections with service calls:

```typescript
const [overview, deptProgress, topPerformers, deadlines] = await Promise.all([
  getAnalyticsOverview(user.id, profile.tenantId),
  getDepartmentProgress(user.id, profile.tenantId),
  getTopPerformers(user.id, profile.tenantId),
  getUpcomingDeadlines(user.id, profile.tenantId),
]);
```

---

### 5. OKR Dashboard

**File**: `/app/tools/okr/page.tsx`

Currently shows basic stats with placeholder text. Replace with real aggregate queries.

#### Service Function

```typescript
// Add to lib/services/analytics-service.ts
export async function getOKRDashboardStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();

    const [stats, teamCount, nearestDeadline] = await Promise.all([
      db
        .select({
          totalObjectives: sql<number>`(SELECT count(*)::int FROM objectives WHERE tenant_id = ${tenantId})`,
          activeInitiatives: sql<number>`(SELECT count(*)::int FROM initiatives WHERE tenant_id = ${tenantId} AND status = 'in_progress')`,
          completedActivities: sql<number>`(SELECT count(*)::int FROM activities WHERE tenant_id = ${tenantId} AND status = 'completed')`,
          overallProgress: sql<number>`(SELECT avg(COALESCE(progress_percentage::numeric, 0))::numeric FROM objectives WHERE tenant_id = ${tenantId})`,
        })
        .then(r => r[0]),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(profiles)
        .where(eq(profiles.tenantId, tenantId))
        .then(r => r[0].count),

      db
        .select({ endDate: objectives.endDate })
        .from(objectives)
        .where(
          and(
            eq(objectives.tenantId, tenantId),
            sql`${objectives.endDate} > now()`
          )
        )
        .orderBy(objectives.endDate)
        .limit(1)
        .then(r => r[0]?.endDate),
    ]);

    const daysToDeadline = nearestDeadline
      ? Math.ceil((new Date(nearestDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      totalObjectives: stats.totalObjectives,
      activeInitiatives: stats.activeInitiatives,
      completedActivities: stats.completedActivities,
      overallProgress: Number(stats.overallProgress ?? 0),
      teamMembers: teamCount,
      daysToDeadline,
    };
  });
}
```

---

### 6. Insights Page

**File**: `/app/tools/insights/page.tsx`

**Status**: ⚠️ **DEFER IMPLEMENTATION**

This page contains AI-generated insights which require:
1. AI Gateway integration (e.g., OpenAI, Anthropic)
2. Background job processing
3. Insight storage tables
4. Conversation history tables

**Recommendation**: Keep mock data for now. This is a "nice-to-have" feature that requires significant AI infrastructure.

**Future Implementation**:
- Create `ai_insights` table
- Create `ai_conversations` table
- Integrate with AI provider
- Create background job for insight generation
- Implement chat interface

---

## Service Layer Patterns

### General Guidelines

1. **Always use `withRLSContext`** wrapper for tenant-scoped queries
2. **Always filter by `tenantId`** explicitly (defense in depth)
3. **Use Drizzle's type inference** - avoid manual type casting
4. **Handle null values** gracefully (use `??` operator)
5. **Use SQL aggregations** for stats (more efficient than JS array methods)

### Common Patterns

#### Pattern 1: Simple SELECT

```typescript
export async function getItems(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db
      .select()
      .from(table)
      .where(eq(table.tenantId, tenantId))
      .orderBy(desc(table.createdAt));
  });
}
```

#### Pattern 2: SELECT with JOIN

```typescript
export async function getItemsWithRelation(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db
      .select({
        id: table.id,
        title: table.title,
        relatedName: relatedTable.name,
      })
      .from(table)
      .innerJoin(relatedTable, eq(table.relatedId, relatedTable.id))
      .where(eq(table.tenantId, tenantId));
  });
}
```

#### Pattern 3: Aggregations

```typescript
export async function getStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE status = 'completed')::int`,
        avgProgress: sql<number>`avg(progress_percentage)::numeric`,
      })
      .from(table)
      .where(eq(table.tenantId, tenantId));

    return stats[0];
  });
}
```

#### Pattern 4: Complex Aggregation with GROUP BY

```typescript
export async function getGroupedStats(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db
      .select({
        category: table.category,
        count: sql<number>`count(*)::int`,
        avgValue: sql<number>`avg(value)::numeric`,
      })
      .from(table)
      .where(eq(table.tenantId, tenantId))
      .groupBy(table.category)
      .orderBy(desc(sql`count(*)`));
  });
}
```

---

## TypeScript Types

### Drizzle Inferred Types

Use Drizzle's type inference for maximum type safety:

```typescript
import { type InferSelectModel } from 'drizzle-orm';
import { objectives, initiatives, activities } from '@/db/okr-schema';

// Inferred types from schema
export type Objective = InferSelectModel<typeof objectives>;
export type Initiative = InferSelectModel<typeof initiatives>;
export type Activity = InferSelectModel<typeof activities>;

// Custom types for API responses
export interface ObjectiveWithRelations extends Objective {
  assigneeName: string | null;
  initiativeCount: number;
}

export interface InitiativeWithObjective extends Initiative {
  objectiveTitle: string;
  objectiveDepartment: string;
}
```

### API Response Types

Define clear response types for each service:

```typescript
// lib/services/types.ts
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StatsResponse {
  total: number;
  byStatus: Record<string, number>;
  trend: 'up' | 'down' | 'neutral';
}
```

---

## Testing Checklist

### For Each Page Migration

#### Pre-Migration
- [ ] Document current mock data structure
- [ ] Identify all data fields used in UI
- [ ] Map fields to database columns
- [ ] Identify required JOINs

#### Implementation
- [ ] Create service file in `lib/services/`
- [ ] Implement RLS wrapper (`withRLSContext`)
- [ ] Write query functions with proper types
- [ ] Update page component to use service
- [ ] Remove mock data arrays
- [ ] Handle empty states

#### Testing
- [ ] **Tenant Isolation**: User A cannot see User B's data
  ```typescript
  // Test with two users in different organizations
  // User A creates objectives
  // User B should see 0 objectives
  ```

- [ ] **RLS Context**: Queries fail gracefully without context
  ```typescript
  // Try querying without setUserContext() - should fail or return empty
  ```

- [ ] **Empty State**: UI handles no data gracefully
  ```typescript
  // New organization with no objectives/initiatives/activities
  ```

- [ ] **Performance**: Acceptable load time with 100+ records
  ```typescript
  // Create 100+ objectives
  // Measure page load time (should be < 2s)
  ```

- [ ] **Data Integrity**: All fields display correctly
  ```typescript
  // Verify dates, numbers, names, statuses
  // Check for null/undefined handling
  ```

- [ ] **Sorting**: Data ordered correctly
  ```typescript
  // Most recent first (createdAt DESC)
  ```

### Multi-User Testing Script

```sql
-- Create two test organizations
INSERT INTO companies (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Org A', 'test-org-a'),
  ('22222222-2222-2222-2222-222222222222', 'Test Org B', 'test-org-b');

-- Create two test users in different orgs
INSERT INTO profiles (id, email, full_name, role, company_id, tenant_id) VALUES
  ('user-a-id', 'usera@test.com', 'User A', 'corporativo', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('user-b-id', 'userb@test.com', 'User B', 'corporativo', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222');

-- Create objectives for User A
INSERT INTO objectives (title, department, status, company_id, created_by, tenant_id, start_date, end_date)
VALUES ('User A Objective', 'Sales', 'in_progress', '11111111-1111-1111-1111-111111111111', 'user-a-id', '11111111-1111-1111-1111-111111111111', now(), now() + interval '90 days');

-- Create objectives for User B
INSERT INTO objectives (title, department, status, company_id, created_by, tenant_id, start_date, end_date)
VALUES ('User B Objective', 'Marketing', 'in_progress', '22222222-2222-2222-2222-222222222222', 'user-b-id', '22222222-2222-2222-2222-222222222222', now(), now() + interval '90 days');

-- Test RLS: Login as User A, should see only "User A Objective"
-- Test RLS: Login as User B, should see only "User B Objective"
```

---

## Performance Optimization

### Database Indexes

Ensure these indexes exist (check `db/okr-schema.ts`):

```typescript
// Already defined in schema
index('objectives_tenant_idx').on(table.tenantId)
index('objectives_status_idx').on(table.status)
index('objectives_assigned_idx').on(table.assignedTo)
```

### Query Optimization

1. **Use SELECT specific columns** instead of `SELECT *`
2. **Limit results** when appropriate (pagination)
3. **Use LEFT JOIN** only when needed (prefer INNER JOIN)
4. **Avoid N+1 queries** - fetch related data in one query
5. **Use database aggregations** instead of JS array methods

### Caching Strategy (Future)

For production, consider:
- Redis for aggregate stats
- Incremental Static Regeneration (ISR) for analytics
- Client-side caching with SWR/React Query

---

## Migration Priority

1. ✅ **Objectives Page** - Straightforward, no complex JOINs
2. ✅ **Initiatives Page** - Requires JOIN with objectives
3. ✅ **Activities Page** - Requires JOIN with initiatives
4. ⏳ **OKR Dashboard** - Aggregate queries only
5. ⏳ **Analytics Page** - Complex aggregations
6. ❌ **Insights Page** - Defer (requires AI infrastructure)

---

## Common Issues and Solutions

### Issue 1: RLS Blocking Queries

**Symptom**: Queries return empty results even with data

**Solution**: Verify RLS context is set
```typescript
// Add logging
console.log('Setting RLS context for user:', userId);
await setUserContext(userId);
```

### Issue 2: Type Errors with Drizzle

**Symptom**: TypeScript errors on query results

**Solution**: Use explicit type annotations
```typescript
const results = await db
  .select({
    id: objectives.id,
    title: objectives.title,
  })
  .from(objectives);

// Type is inferred as { id: string; title: string }[]
```

### Issue 3: NULL Values in JOINs

**Symptom**: NULL values causing UI crashes

**Solution**: Use nullish coalescing
```typescript
assigneeName: profile.fullName ?? 'Sin asignar',
department: objective.department ?? 'General',
```

### Issue 4: Date Formatting

**Symptom**: Dates display as ISO strings

**Solution**: Format dates explicitly
```typescript
{new Date(objective.startDate).toLocaleDateString('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})}
```

---

## Summary

### What's Ready
✅ Database schema with RLS
✅ RLS policies applied and active
✅ Multi-tenant architecture
✅ Drizzle ORM configured

### What Needs Implementation
⏳ RLS client wrapper (`lib/database/rls-client.ts`)
⏳ Service layer files (`lib/services/*.ts`)
⏳ Page component updates (remove mocks, add service calls)

### Estimated Time
- **Objectives Page**: 2 hours
- **Initiatives Page**: 2 hours
- **Activities Page**: 2 hours
- **Analytics Page**: 4 hours
- **OKR Dashboard**: 1 hour
- **Testing**: 3 hours

**Total**: ~14 hours

### Success Metrics
- [ ] Zero hardcoded mock data in production pages
- [ ] All queries use RLS context
- [ ] Tenant isolation verified (multi-user tests)
- [ ] Empty states handled gracefully
- [ ] Page load time < 2s with 100+ records
- [ ] Type safety with Drizzle inferred types

---

*Generated: 2025-09-30*
*Database: NeonDB PostgreSQL 17.5*
*ORM: Drizzle*
*Auth: Stack Auth*
