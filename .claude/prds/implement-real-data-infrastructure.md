---
name: implement-real-data-infrastructure
description: Replace mock data with real database queries across all dashboard pages in phased epics, ensuring proper multi-tenant isolation
status: backlog
created: 2025-10-01T02:44:31Z
---

# PRD: Real Data Implementation - Multi-Tenant OKR Dashboard

## Executive Summary

Replace hardcoded mock data across 6 dashboard pages with real PostgreSQL queries using Drizzle ORM, ensuring complete tenant isolation via Row Level Security (RLS). Implementation will be phased across multiple epics (one per page) to manage risk and allow for incremental testing and deployment.

**Key Value Proposition:**
- Users see their organization's real data, not placeholder mocks
- Complete data isolation between tenants enforced at database level
- Type-safe queries with Drizzle ORM
- Foundation for production-ready multi-tenant SaaS

## Problem Statement

### What Problem Are We Solving?

Currently, all dashboard pages display hardcoded mock data arrays, which means:
1. **No Real User Value**: Users cannot track their actual OKRs, initiatives, or activities
2. **Breaks Multi-Tenant Promise**: New users who create organizations see "demo data" from other fake organizations
3. **Incorrect User Experience**: Invited users see the same mock data as organization owners
4. **No Production Readiness**: Application cannot be deployed to real customers

### Why Is This Important Now?

The multi-tenant infrastructure is **COMPLETE & PRODUCTION READY** (RLS applied, onboarding flows working), but users cannot actually use the system because all data is fake. This is the critical missing piece between a technical prototype and a production SaaS application.

### Current State vs. Desired State

**Current State:**
```typescript
// ❌ Hardcoded in every page
const objectives = [
  { id: '1', title: 'Aumentar satisfacción', department: 'Ventas', ... },
  { id: '2', title: 'Reducir costos', department: 'Finanzas', ... },
  // ... same data for ALL tenants
];
```

**Desired State:**
```typescript
// ✅ Real data per tenant
const objectives = await getObjectivesForPage(user.id, profile.tenantId);
// Each tenant sees ONLY their data
```

## User Stories

### Primary User Personas

1. **Organization Creator ("Corporativo" Role)**
   - Creates their own organization during onboarding
   - Has `tenant_id = organization_id`
   - Expects to see ONLY their organization's data
   - Needs to create objectives, initiatives, activities for their team

2. **Invited Team Member ("Gerente" or "Empleado" Role)**
   - Invited by organization owner via invitation link
   - Joins existing organization
   - Has `tenant_id = inviting_organization_id`
   - Expects to see ONLY their organization's data
   - Cannot see data from other organizations (strict isolation)

3. **Multi-Org User (Future)**
   - User invited to multiple organizations
   - Can switch between organizations
   - Sees different data based on selected `tenant_id`

### User Journeys

#### Journey 1: New Organization Owner Creates First Objective

**As a** newly registered user who created my own organization
**I want to** create my first objective and see it in my dashboard
**So that** I can start tracking my organization's goals

**Flow:**
1. User completes onboarding → Creates "Acme Corp" organization
2. System creates: `companies` record + `profiles` record with `tenant_id = acme_corp_id`
3. User navigates to `/tools/objectives`
4. Page loads → Calls `getObjectivesForPage(user.id, acme_corp_id)`
5. **Expected**: Empty state ("No hay objetivos")
6. User clicks "Nuevo Objetivo" → Creates objective with `tenant_id = acme_corp_id`
7. Page refreshes → Shows the new objective

**Acceptance Criteria:**
- ✅ User sees empty state initially (no mock data)
- ✅ Created objective appears immediately after creation
- ✅ Objective has correct `tenant_id` (verified in database)
- ✅ RLS context is set before query (`app.current_user_id = user.id`)

#### Journey 2: Invited User Sees Only Their Organization's Data

**As a** user invited to "Beta LLC" organization
**I want to** see only Beta LLC's objectives, not other organizations' data
**So that** I have confidence in data privacy and isolation

**Flow:**
1. User A (owner of "Acme Corp") creates 5 objectives
2. User B receives invitation to "Beta LLC"
3. User B accepts invitation → Gets `tenant_id = beta_llc_id`
4. User B navigates to `/tools/objectives`
5. **Expected**: Empty state (cannot see Acme Corp's 5 objectives)
6. User B creates objective for Beta LLC
7. **Expected**: Sees only 1 objective (Beta LLC's)
8. User B navigates away and returns
9. **Expected**: Still sees only 1 objective

**Acceptance Criteria:**
- ✅ User B sees 0 objectives initially (strict tenant isolation)
- ✅ User A's objectives are completely invisible to User B
- ✅ RLS policies enforce isolation (database-level security)
- ✅ No client-side filtering required (handled by PostgreSQL)

#### Journey 3: Organization Owner Sees Team Activity

**As an** organization owner
**I want to** see activities assigned to my team members
**So that** I can track progress and identify blockers

**Flow:**
1. Owner navigates to `/tools/activities`
2. Page queries activities with JOINs:
   - `activities` → `initiatives` → `profiles` (assignee)
3. **Expected**: See all activities for this `tenant_id` with assignee names
4. Activities from other tenants are invisible

**Acceptance Criteria:**
- ✅ All activities shown belong to owner's `tenant_id`
- ✅ Assignee names populated via JOIN with `profiles`
- ✅ Initiative titles populated via JOIN with `initiatives`
- ✅ Query is performant (<2s with 100+ activities)

## Requirements

### Functional Requirements

#### FR-1: RLS Context Setup (Foundation)

**Priority**: P0 (Blocker for all other work)

**Description**: Create infrastructure to set PostgreSQL RLS context before every tenant-scoped query.

**Implementation:**
- Create `lib/database/rls-client.ts` with:
  - `setUserContext(userId: string)` - Sets `app.current_user_id`
  - `withRLSContext(userId, callback)` - Wrapper for queries
  - `getDb()` - Returns Drizzle instance

**Acceptance Criteria:**
- ✅ `setUserContext()` executes `SELECT set_config('app.current_user_id', $1, true)`
- ✅ `withRLSContext()` sets context, executes callback, returns result
- ✅ Works with unpooled connection (`DATABASE_URL_UNPOOLED`)
- ✅ Type-safe with Drizzle schema inference

**Edge Cases:**
- Context setting fails (connection error) → Throw error, do not proceed
- User ID is null/undefined → Throw error immediately
- Concurrent requests → Each request sets its own context (transaction-scoped)

---

#### FR-2: Objectives Page Real Data

**Epic**: Implement Real Data - Objectives Page

**Description**: Replace mock objectives with real database queries filtered by `tenant_id`.

**Pages Affected:**
- `/app/tools/objectives/page.tsx`

**Service Functions Required:**
```typescript
// lib/services/objectives-service.ts
getObjectivesForPage(userId, tenantId): Promise<ObjectiveWithAssignee[]>
getObjectiveStats(userId, tenantId): Promise<StatsResponse>
```

**Database Tables:**
- `objectives` (primary)
- `profiles` (LEFT JOIN for assignee name)

**Acceptance Criteria:**
- ✅ Page shows user's tenant data only
- ✅ Empty state displays when no objectives exist
- ✅ Stats cards show real counts (total, draft, in_progress, completed, cancelled)
- ✅ Assignee names populated from `profiles` table
- ✅ Progress bars show real `progress_percentage` values
- ✅ Dates formatted correctly (Spanish locale)
- ✅ Status badges use correct colors
- ✅ Priority badges use correct colors
- ✅ "Nuevo Objetivo" button functional (placeholder action OK for this epic)

**Multi-Tenant Test Cases:**
1. User A creates 5 objectives → User B sees 0 objectives
2. User B creates 2 objectives → User A still sees 5 objectives
3. Shared invited user sees correct count per tenant when switching

**Performance:**
- Page load <2s with 100 objectives
- Query uses indexes: `objectives_tenant_idx`, `objectives_status_idx`

---

#### FR-3: Initiatives Page Real Data

**Epic**: Implement Real Data - Initiatives Page

**Description**: Replace mock initiatives with real database queries including JOIN with objectives.

**Pages Affected:**
- `/app/tools/initiatives/page.tsx`

**Service Functions Required:**
```typescript
// lib/services/initiatives-service.ts
getInitiativesForPage(userId, tenantId): Promise<InitiativeWithDetails[]>
getInitiativeStats(userId, tenantId): Promise<StatsResponse>
```

**Database Tables:**
- `initiatives` (primary)
- `objectives` (INNER JOIN for objective title/department)
- `profiles` (LEFT JOIN for assignee name)

**Acceptance Criteria:**
- ✅ Page shows user's tenant data only
- ✅ Empty state displays when no initiatives exist
- ✅ Stats cards show real counts (total, planning, in_progress, completed, cancelled)
- ✅ Objective titles displayed via JOIN
- ✅ Assignee names populated from `profiles` table
- ✅ Budget values formatted correctly (currency)
- ✅ Progress bars show real `progress_percentage` values

**Multi-Tenant Test Cases:**
1. User A creates initiative linked to their objective → User B cannot see it
2. User B's initiatives reference only User B's objectives (referential integrity)

**Performance:**
- Page load <2s with 100 initiatives
- Query uses indexes: `initiatives_tenant_idx`, `initiatives_objective_idx`

---

#### FR-4: Activities Page Real Data

**Epic**: Implement Real Data - Activities Page

**Description**: Replace mock activities with real database queries including multi-level JOINs.

**Pages Affected:**
- `/app/tools/activities/page.tsx`

**Service Functions Required:**
```typescript
// lib/services/activities-service.ts
getActivitiesForPage(userId, tenantId): Promise<ActivityWithDetails[]>
getActivityStats(userId, tenantId): Promise<StatsResponse>
```

**Database Tables:**
- `activities` (primary)
- `initiatives` (INNER JOIN for initiative title)
- `profiles` (LEFT JOIN for assignee name)

**Acceptance Criteria:**
- ✅ Page shows user's tenant data only
- ✅ Empty state displays when no activities exist
- ✅ Stats cards show real counts (total, todo, in_progress, completed, overdue)
- ✅ Initiative titles displayed via JOIN
- ✅ Assignee names populated from `profiles` table
- ✅ Due date calculations correct (overdue = dueDate < now AND status != completed)
- ✅ Estimated vs actual hours displayed
- ✅ Completed date shown for completed activities
- ✅ Checkbox interaction (visual only for this epic)

**Multi-Tenant Test Cases:**
1. User A's activities reference only User A's initiatives
2. Overdue count calculated correctly per tenant
3. Assignee filtering works within tenant scope only

**Performance:**
- Page load <2s with 200 activities
- Query uses indexes: `activities_tenant_idx`, `activities_initiative_idx`

---

#### FR-5: OKR Dashboard Real Data

**Epic**: Implement Real Data - OKR Dashboard

**Description**: Replace mock stats with real aggregate queries.

**Pages Affected:**
- `/app/tools/okr/page.tsx`

**Service Functions Required:**
```typescript
// lib/services/analytics-service.ts
getOKRDashboardStats(userId, tenantId): Promise<DashboardStats>
```

**Database Tables:**
- `objectives` (aggregate COUNT, AVG)
- `initiatives` (aggregate COUNT)
- `activities` (aggregate COUNT)
- `profiles` (COUNT for team members)

**Acceptance Criteria:**
- ✅ Total objectives count is accurate
- ✅ Active initiatives count correct (status = 'in_progress')
- ✅ Completed activities count correct
- ✅ Overall progress calculated as AVG(objectives.progress_percentage)
- ✅ Team members count from `profiles` table
- ✅ Days to deadline calculated from nearest objective end_date

**Multi-Tenant Test Cases:**
1. Stats reflect only current tenant's data
2. Multiple tenants have independent stat calculations

**Performance:**
- Page load <1s (simple aggregations)
- Consider caching for frequently accessed stats

---

#### FR-6: Analytics Page Real Data

**Epic**: Implement Real Data - Analytics Page

**Description**: Replace complex analytics mocks with real aggregate queries and groupings.

**Pages Affected:**
- `/app/tools/analytics/page.tsx`

**Service Functions Required:**
```typescript
// lib/services/analytics-service.ts
getAnalyticsOverview(userId, tenantId): Promise<OverviewStats>
getDepartmentProgress(userId, tenantId): Promise<DepartmentProgress[]>
getTopPerformers(userId, tenantId): Promise<Performer[]>
getUpcomingDeadlines(userId, tenantId): Promise<Deadline[]>
```

**Database Tables:**
- `objectives` (GROUP BY department, aggregate functions)
- `initiatives` (aggregate)
- `activities` (aggregate, JOIN with profiles for performers)
- `profiles` (GROUP BY for top performers)

**Acceptance Criteria:**
- ✅ Overview stats match individual page stats
- ✅ Department progress calculated per department (GROUP BY)
- ✅ Top performers ranked by completed activities count
- ✅ Upcoming deadlines filtered by date range (next 60 days)
- ✅ Progress trends show realistic data (not hardcoded trends)

**Multi-Tenant Test Cases:**
1. Department breakdown includes only tenant's departments
2. Top performers list includes only tenant's team members

**Performance:**
- Page load <3s (multiple complex queries)
- Consider parallel Promise.all() for independent queries

---

#### FR-7: Insights Page Real Data (DEFERRED)

**Epic**: Implement Real Data - AI Insights Page

**Description**: Implement AI-powered insights (requires external AI integration).

**Status**: ⚠️ **OUT OF SCOPE FOR INITIAL IMPLEMENTATION**

**Reason**: Requires:
- AI Gateway integration (OpenAI/Anthropic)
- Background job processing
- New database tables (`ai_insights`, `ai_conversations`)
- Significant AI infrastructure investment

**Placeholder Behavior**: Keep existing mock data with clear "Coming Soon" messaging.

**Future Requirements:**
- Create `ai_insights` table with tenant_id
- Implement background job to generate insights
- Create chat interface for AI conversations
- Ensure AI context includes only tenant-scoped data

---

### Non-Functional Requirements

#### NFR-1: Multi-Tenant Security

**Requirement**: Complete data isolation between tenants enforced at database level.

**Implementation:**
- Every query MUST call `withRLSContext(userId, callback)`
- RLS policies MUST filter by `tenant_id`
- Defense in depth: Application filters by `tenantId` AND database enforces via RLS

**Testing:**
- Security audit: Two users in different tenants cannot see each other's data
- Attempt to bypass RLS by manipulating client-side tenantId (should fail)
- Verify RLS policies active: `SELECT tablename, rowsecurity FROM pg_tables`

**Acceptance Criteria:**
- ✅ All queries set `app.current_user_id` before execution
- ✅ All tenant-scoped tables have RLS enabled
- ✅ Attempting query without context returns empty or throws error
- ✅ Manual SQL injection test cannot bypass tenant isolation

---

#### NFR-2: Performance

**Requirement**: Acceptable page load times for 100+ records per table.

**Targets:**
- Objectives page: <2s load time
- Initiatives page: <2s load time
- Activities page: <2s load time
- OKR Dashboard: <1s load time
- Analytics page: <3s load time

**Implementation:**
- Use existing indexes: `*_tenant_idx`, `*_status_idx`
- Fetch only required columns (SELECT specific fields, not *)
- Use INNER JOIN for required relations, LEFT JOIN for optional
- Limit result sets when appropriate

**Monitoring:**
- Log query execution times in development
- Alert if queries exceed SLA thresholds

---

#### NFR-3: Type Safety

**Requirement**: All database queries must be type-safe using Drizzle ORM inference.

**Implementation:**
- Use `InferSelectModel<typeof table>` for base types
- Define custom interfaces for JOIN results
- No `any` types in service functions
- TypeScript strict mode enabled

**Acceptance Criteria:**
- ✅ All service functions have explicit return types
- ✅ All query results are properly typed
- ✅ TypeScript build passes with no errors

---

#### NFR-4: Error Handling

**Requirement**: Graceful degradation when queries fail or return no data.

**Implementation:**
- Empty states for zero results
- Error boundaries for query failures
- Meaningful error messages (avoid exposing SQL errors to users)
- Retry logic for transient database errors (optional)

**User Experience:**
- Empty state: Show "No hay objetivos" with "Crear Primer Objetivo" button
- Query failure: Show "Error cargando datos" with "Reintentar" button
- RLS context failure: Redirect to login or show authentication error

---

## Success Criteria

### Measurable Outcomes

#### Primary Metrics

1. **Data Accuracy**: 100% of data shown belongs to user's tenant
   - Verification: Multi-tenant test suite passes
   - Test: Create data in Org A, verify invisible to Org B

2. **Page Coverage**: 100% of mock data replaced with real queries
   - Verification: Search codebase for `// TODO: Implementar queries`
   - Test: All TODO comments removed, grep returns 0 results

3. **Performance SLA**: 95% of page loads meet performance targets
   - Verification: Performance testing with 100+ records
   - Test: Load each page 10 times, measure P95 latency

4. **Security Audit**: Zero cross-tenant data leaks
   - Verification: Penetration testing report
   - Test: Attempt to access other tenant's data via API/UI

#### Secondary Metrics

1. **Type Safety**: Zero TypeScript errors in service layer
2. **Test Coverage**: 80% coverage for service functions
3. **Documentation**: All service functions documented with JSDoc

### Key Performance Indicators (KPIs)

**Pre-Launch Checklist:**
- [ ] All 6 pages migrated from mocks to real data
- [ ] Multi-tenant isolation verified (2+ organizations tested)
- [ ] Performance benchmarks passed
- [ ] Security audit completed
- [ ] Empty states tested
- [ ] Error handling tested (network failures, database errors)

**Post-Launch Monitoring:**
- Monitor query performance in production
- Track RLS context failures (should be 0)
- Monitor page load times via analytics

## Constraints & Assumptions

### Technical Constraints

1. **Database**: NeonDB PostgreSQL 17.5 (cannot change)
2. **ORM**: Drizzle ORM (already integrated)
3. **Auth**: Stack Auth (users in `neon_auth.users_sync`)
4. **Framework**: Next.js 15 Server Components

### Timeline Constraints

1. **Phased Rollout**: One epic per page (not all at once)
2. **Estimated Duration**: 14 hours total across all epics
3. **Dependencies**: Each epic blocks the next (sequential)

### Resource Constraints

1. **Development**: Assume single developer (sequential implementation)
2. **Testing**: Manual multi-tenant testing required
3. **Code Review**: Each epic requires review before merge

### Assumptions

1. **RLS Infrastructure Exists**: Row Level Security policies already applied
2. **Database Populated**: Assumes users will create real data (no seed data required)
3. **Onboarding Works**: Users can successfully create organizations and profiles
4. **Stack Auth Integration**: Authentication system fully functional
5. **Multi-Tenant Flow Correct**:
   - New user → Creates own organization → Gets `tenant_id = org_id`
   - Invited user → Joins existing organization → Gets `tenant_id = inviting_org_id`

## Out of Scope

### Explicitly NOT Building

1. ❌ **AI Insights Integration** (Deferred to separate epic)
2. ❌ **New Features** (Only replacing mocks, no new functionality)
3. ❌ **UI/UX Redesign** (Keep existing layouts and components)
4. ❌ **Performance Caching** (No Redis, no ISR - basic queries only)
5. ❌ **Real-time Updates** (No WebSockets, no live data refresh)
6. ❌ **Data Migration Scripts** (Assumes fresh start, no legacy data)
7. ❌ **Advanced Filtering** (No search, sort, pagination beyond basic ORDER BY)
8. ❌ **CSV Export** (Keep "Exportar" buttons as placeholders)
9. ❌ **Charting Library Integration** (Keep "Gráficos - Próximamente" placeholders)
10. ❌ **Multi-Organization Switching** (Single tenant context per session)

## Dependencies

### External Dependencies

1. **NeonDB Availability**: Database must be accessible and responsive
2. **Stack Auth Service**: User authentication must be functional
3. **Environment Variables**: Must be configured:
   - `DATABASE_URL_UNPOOLED` - For RLS context setting
   - `DATABASE_URL` - For pooled queries (if used)

### Internal Dependencies

**Epic Sequence** (must be completed in order):

1. **Epic 0**: RLS Infrastructure Setup (Foundation)
   - Creates `lib/database/rls-client.ts`
   - Blocks: All other epics

2. **Epic 1**: Objectives Page
   - Creates `lib/services/objectives-service.ts`
   - Blocks: None (can be tested independently)

3. **Epic 2**: Initiatives Page
   - Creates `lib/services/initiatives-service.ts`
   - Depends on: Objectives data existing (for JOINs)

4. **Epic 3**: Activities Page
   - Creates `lib/services/activities-service.ts`
   - Depends on: Initiatives data existing (for JOINs)

5. **Epic 4**: OKR Dashboard
   - Adds to `lib/services/analytics-service.ts`
   - Depends on: Objectives, Initiatives, Activities data

6. **Epic 5**: Analytics Page
   - Completes `lib/services/analytics-service.ts`
   - Depends on: All other epics (uses all tables)

7. **Epic 6**: Insights Page (DEFERRED)
   - Requires: AI infrastructure (separate epic)

### Cross-Team Dependencies

**None** - This is a self-contained frontend/backend feature within the existing application.

## Risks & Mitigation

### Risk 1: RLS Context Not Set Correctly

**Impact**: HIGH - Queries return empty results or incorrect data

**Probability**: MEDIUM

**Mitigation:**
- Add logging to `setUserContext()` in development
- Create utility function that throws if context not set
- Write integration tests that verify RLS context

**Contingency:**
- If RLS fails, add application-level filtering as fallback
- Alert monitoring for RLS failures

---

### Risk 2: Performance Degradation with Large Datasets

**Impact**: MEDIUM - Slow page loads impact UX

**Probability**: MEDIUM

**Mitigation:**
- Load test with 500+ records before production
- Add pagination if needed (out of scope for v1)
- Monitor query execution times

**Contingency:**
- Add database query caching (Redis)
- Implement pagination
- Add indexes if missing

---

### Risk 3: Cross-Tenant Data Leakage

**Impact**: CRITICAL - Security vulnerability

**Probability**: LOW (RLS already applied)

**Mitigation:**
- Security audit before production launch
- Manual testing with 2+ organizations
- Automated tests for tenant isolation

**Contingency:**
- Immediate rollback if leak detected
- Incident response plan
- User notification if data exposed

---

### Risk 4: Migration Breaks Existing Mock-Based Tests

**Impact**: LOW - Tests need updating

**Probability**: HIGH

**Mitigation:**
- Update tests to use real database queries
- Create test database with seed data
- Use database transactions for test isolation

**Contingency:**
- Keep mock data in test fixtures
- Mock service layer in tests

## Implementation Phases

### Phase 0: Foundation (Epic 0)

**Duration**: 2 hours

**Deliverables:**
- `lib/database/rls-client.ts` created
- RLS context setting verified
- Documentation for using `withRLSContext()`

**Success Criteria:**
- Can execute query with RLS context
- Can verify context is set via PostgreSQL logs

---

### Phase 1: Objectives Page (Epic 1)

**Duration**: 2 hours

**Deliverables:**
- `lib/services/objectives-service.ts` created
- `/app/tools/objectives/page.tsx` updated
- Empty state tested
- Multi-tenant isolation verified

**Success Criteria:**
- User A sees their objectives only
- User B sees their objectives only
- Empty state displays when no data

---

### Phase 2: Initiatives Page (Epic 2)

**Duration**: 2 hours

**Deliverables:**
- `lib/services/initiatives-service.ts` created
- `/app/tools/initiatives/page.tsx` updated
- JOIN with objectives verified
- Multi-tenant isolation verified

---

### Phase 3: Activities Page (Epic 3)

**Duration**: 2 hours

**Deliverables:**
- `lib/services/activities-service.ts` created
- `/app/tools/activities/page.tsx` updated
- JOIN with initiatives verified
- Overdue calculation tested

---

### Phase 4: OKR Dashboard (Epic 4)

**Duration**: 1 hour

**Deliverables:**
- `getOKRDashboardStats()` added to analytics service
- `/app/tools/okr/page.tsx` updated
- Aggregate queries verified

---

### Phase 5: Analytics Page (Epic 5)

**Duration**: 4 hours

**Deliverables:**
- Complete `lib/services/analytics-service.ts`
- `/app/tools/analytics/page.tsx` updated
- Department progress, top performers, deadlines working
- Complex aggregations tested

---

### Phase 6: Insights Page (Epic 6) - DEFERRED

**Status**: Blocked - requires AI infrastructure

**Next Steps**: Create separate PRD for AI integration

## Appendix

### Multi-Tenant Architecture Reference

**Tenant Assignment Rules:**

1. **New User (No Invitation)**:
   ```
   Sign Up → Email Verification → No Pending Invitation
   → Redirect to /onboarding/create
   → Create Organization (companies table)
   → Create Profile (profiles table)
      - tenant_id = organization.id
      - role = 'corporativo'
   ```

2. **Invited User**:
   ```
   Click Invite Link → Sign Up/Sign In → Email Verification
   → Pending Invitation Found
   → Redirect to /invite/[token]
   → Accept Invitation
   → Create Profile (profiles table)
      - tenant_id = invitation.organization_id
      - role = invitation.role (corporativo | gerente | empleado)
   ```

3. **Tenant Isolation**:
   - All queries filter by `WHERE tenant_id = $1`
   - RLS policies enforce `tenant_id = get_current_tenant_id()`
   - `get_current_tenant_id()` reads from user's profile via `app.current_user_id`

### Database Tables Reference

**Tenant-Scoped Tables** (require `tenant_id` filtering):
- `profiles`
- `objectives`
- `initiatives`
- `activities`
- `key_results`
- `comments`
- `update_history`

**Global Tables** (no tenant_id):
- `companies` (each company IS a tenant)
- `neon_auth.users_sync` (Stack Auth users)
- `organization_invitations` (scoped by organization_id)
- `onboarding_sessions` (temporary, deleted after onboarding)

### Related Documentation

- **Implementation Guide**: `MOCK_DATA_REPLACEMENT_GUIDE.md`
- **Multi-Tenant Summary**: `FINAL_IMPLEMENTATION_SUMMARY.md`
- **RLS Policies**: `drizzle/0005_rls_policies_neon.sql`
- **Database Schema**: `db/okr-schema.ts`

---

**PRD Status**: Ready for Epic Creation
**Next Step**: Run `/pm:prd-parse implement-real-data-infrastructure` to generate implementation epics
