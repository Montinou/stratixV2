---
name: implement-real-data-infrastructure
status: backlog
created: 2025-10-01T02:48:07Z
progress: 0%
prd: .claude/prds/implement-real-data-infrastructure.md
github: https://github.com/Montinou/stratixV2/issues/96
---

# Epic: Real Data Infrastructure - Multi-Tenant OKR Dashboard

## Overview

Replace hardcoded mock data across 6 dashboard pages with real PostgreSQL queries using Drizzle ORM, ensuring complete tenant isolation via Row Level Security (RLS). This epic establishes the foundation for a production-ready multi-tenant SaaS by connecting the UI to actual database queries while maintaining strict data isolation between organizations.

**Core Value**: Transform the application from a prototype with fake data to a production system where each tenant sees only their organization's real OKRs, initiatives, and activities.

## Architecture Decisions

### 1. RLS-First Security Model

**Decision**: Enforce tenant isolation at the PostgreSQL database level using Row Level Security (RLS) policies, not just application-level filtering.

**Rationale**:
- **Defense in Depth**: Even if application code has bugs, database enforces isolation
- **Already Implemented**: RLS policies exist and are active on all tenant-scoped tables
- **PostgreSQL Native**: No external authorization service needed

**Implementation**:
- Set `app.current_user_id` session variable before every query
- RLS function `get_current_tenant_id()` reads user's profile to get `tenant_id`
- All queries automatically filtered by PostgreSQL policies

### 2. Service Layer Pattern

**Decision**: Create dedicated service functions in `lib/services/` instead of direct Drizzle queries in page components.

**Rationale**:
- **Reusability**: Multiple pages need same data (e.g., stats)
- **RLS Context**: Centralize `withRLSContext()` wrapper logic
- **Type Safety**: Export typed interfaces from services
- **Testability**: Mock service layer in tests, not database

**Pattern**:
```typescript
// lib/services/objectives-service.ts
export async function getObjectivesForPage(userId: string, tenantId: string) {
  return await withRLSContext(userId, async () => {
    const db = getDb();
    return await db.select()...where(eq(objectives.tenantId, tenantId));
  });
}
```

### 3. Drizzle ORM with Type Inference

**Decision**: Use Drizzle's type inference for query results, not manual interfaces.

**Rationale**:
- **Already Integrated**: Drizzle schema exists in `db/okr-schema.ts`
- **Type Safety**: Prevents runtime type errors
- **Refactoring**: Schema changes automatically flow to queries

**Usage**:
```typescript
import { type InferSelectModel } from 'drizzle-orm';
import { objectives } from '@/db/okr-schema';

type Objective = InferSelectModel<typeof objectives>;
```

### 4. Server Components for Data Fetching

**Decision**: Use Next.js 15 Server Components for all database queries, not client-side fetching.

**Rationale**:
- **Already Server Components**: All pages are `async function Page()`
- **No API Routes Needed**: Direct database access from page
- **Performance**: No client-side waterfalls
- **Security**: Database credentials never exposed to browser

### 5. Phased Rollout (One Epic Per Page)

**Decision**: Implement each page as a separate epic, starting with foundation.

**Rationale**:
- **Risk Management**: Isolate failures to one page
- **Incremental Testing**: Verify tenant isolation per page
- **Parallel Work**: Future possibility once pattern established
- **PRD Requirement**: Explicitly requested phased approach

**Sequence**:
1. Foundation (RLS infrastructure)
2. Objectives (simplest - no JOINs)
3. Initiatives (1 JOIN with objectives)
4. Activities (2 JOINs with initiatives + profiles)
5. Dashboard (aggregations only)
6. Analytics (complex aggregations)
7. Insights (DEFERRED - requires AI)

## Technical Approach

### Frontend Components

**No New Components Required**

All UI components already exist. Changes are internal to page components:

**Before**:
```typescript
const objectives = [
  { id: '1', title: 'Mock Objective', ... },
  // hardcoded array
];
```

**After**:
```typescript
const profile = await getUserProfile(user.id);
const objectives = await getObjectivesForPage(user.id, profile.tenantId);
// real database query
```

**Empty States**: Already implemented in existing components. Will display when query returns `[]`.

### Backend Services

**New Service Files** (to be created):

1. **`lib/database/rls-client.ts`** - Foundation
   - `setUserContext(userId: string)`: Sets PostgreSQL session variable
   - `withRLSContext(userId, callback)`: Wrapper ensuring RLS context set
   - `getDb()`: Returns Drizzle instance connected to `DATABASE_URL_UNPOOLED`

2. **`lib/services/objectives-service.ts`**
   - `getObjectivesForPage(userId, tenantId)`: All objectives with assignee names
   - `getObjectiveStats(userId, tenantId)`: Counts by status

3. **`lib/services/initiatives-service.ts`**
   - `getInitiativesForPage(userId, tenantId)`: Initiatives with objective titles
   - `getInitiativeStats(userId, tenantId)`: Counts by status

4. **`lib/services/activities-service.ts`**
   - `getActivitiesForPage(userId, tenantId)`: Activities with initiative names
   - `getActivityStats(userId, tenantId)`: Counts including overdue

5. **`lib/services/analytics-service.ts`**
   - `getOKRDashboardStats(userId, tenantId)`: Dashboard aggregates
   - `getAnalyticsOverview(userId, tenantId)`: Overview metrics
   - `getDepartmentProgress(userId, tenantId)`: GROUP BY department
   - `getTopPerformers(userId, tenantId)`: Top users by completed activities
   - `getUpcomingDeadlines(userId, tenantId)`: Objectives ending soon

**Data Models**

Leverage existing Drizzle schema (`db/okr-schema.ts`):
- `objectives` - Already has `tenant_id`, indexes, RLS
- `initiatives` - Already has `tenant_id`, FK to objectives
- `activities` - Already has `tenant_id`, FK to initiatives
- `profiles` - Already has `tenant_id`, user info

**Business Logic**

Minimal - mostly data transformation:
- Join results: Combine objective title with initiative
- Date calculations: Overdue = `dueDate < now() AND status != 'completed'`
- Aggregations: `COUNT(*)`, `AVG(progress_percentage)`
- Formatting: Spanish dates, currency formatting

### Infrastructure

**Database**:
- **NeonDB PostgreSQL 17.5** (already provisioned)
- **Connection**: Use `DATABASE_URL_UNPOOLED` for RLS context setting
- **RLS Policies**: Already applied to all tenant tables
- **Indexes**: Already exist (`*_tenant_idx`, `*_status_idx`)

**Deployment**:
- **Vercel**: Auto-deploy from main branch (already configured)
- **Environment Variables**: Already set in Vercel
  - `DATABASE_URL_UNPOOLED`
  - `DATABASE_URL`
  - Stack Auth vars

**Monitoring**:
- **Performance**: Log query times in development console
- **Errors**: Next.js error boundaries catch query failures
- **RLS Failures**: Throw errors immediately if context not set

**Scaling**:
- **Current**: Single database connection pool
- **Future** (out of scope): Add Redis for aggregate caching

## Implementation Strategy

### Development Phases

**Phase 0: Foundation (2 hours)**
- Create `lib/database/rls-client.ts`
- Test RLS context setting with simple query
- Document usage pattern for service authors
- **Blocks**: All other phases

**Phase 1: Objectives Page (2 hours)**
- Create `lib/services/objectives-service.ts`
- Update `/app/tools/objectives/page.tsx`
- Remove mock data array
- Test with 2 different tenants
- **Depends**: Phase 0
- **Blocks**: None (independent)

**Phase 2: Initiatives Page (2 hours)**
- Create `lib/services/initiatives-service.ts`
- Update `/app/tools/initiatives/page.tsx`
- Test JOIN with objectives table
- **Depends**: Phase 0, objectives data for testing JOINs
- **Blocks**: Phase 3 (activities reference initiatives)

**Phase 3: Activities Page (2 hours)**
- Create `lib/services/activities-service.ts`
- Update `/app/tools/activities/page.tsx`
- Test multi-level JOINs
- Test overdue calculations
- **Depends**: Phase 0, Phase 2
- **Blocks**: Phase 4 (dashboard uses activity counts)

**Phase 4: OKR Dashboard (1 hour)**
- Add `getOKRDashboardStats()` to analytics service
- Update `/app/tools/okr/page.tsx`
- Simple aggregations only
- **Depends**: Phase 0-3 (aggregates all tables)
- **Blocks**: None

**Phase 5: Analytics Page (4 hours)**
- Complete `lib/services/analytics-service.ts`
- Update `/app/tools/analytics/page.tsx`
- Complex GROUP BY queries
- Department progress, top performers, deadlines
- **Depends**: Phase 0-3
- **Blocks**: None

**Phase 6: Insights Page (DEFERRED)**
- Requires AI infrastructure (separate epic)
- Keep mock data with "Coming Soon" message

### Risk Mitigation

**Risk 1: RLS Context Not Set → Queries Return Empty**

*Mitigation*:
- Add strict validation in `withRLSContext()`: throw if userId is null
- Log every context set in development mode
- Create integration test that verifies RLS works

*Detection*:
- User reports "empty page" despite creating data
- Check server logs for RLS context errors

**Risk 2: Cross-Tenant Data Leak**

*Mitigation*:
- Manual testing: Create User A and User B in different orgs
- Automated test: Verify User A cannot see User B's data
- Code review: Ensure all queries use `withRLSContext()`

*Detection*:
- Security audit before production launch
- Penetration testing

**Risk 3: Performance Degradation**

*Mitigation*:
- Test with 100+ records per table
- Use `EXPLAIN ANALYZE` for slow queries
- Monitor query execution times

*Fallback*:
- Add pagination (out of scope for v1)
- Add caching layer (Redis)

### Testing Approach

**Unit Tests**: Service layer functions
```typescript
describe('getObjectivesForPage', () => {
  it('returns only tenant objectives', async () => {
    // Create test data in two tenants
    // Query as Tenant A
    // Expect only Tenant A's data
  });
});
```

**Integration Tests**: RLS enforcement
```typescript
describe('Multi-tenant isolation', () => {
  it('prevents cross-tenant access', async () => {
    // Setup: User A creates 5 objectives in Tenant A
    // Test: User B (Tenant B) queries objectives
    // Expect: Empty array (not Tenant A's data)
  });
});
```

**Manual Testing**: Full user journeys
1. Create Organization A, add objectives
2. Create Organization B, add different objectives
3. Log in as User A → See only Org A data
4. Log in as User B → See only Org B data
5. Invite User C to Org A → User C sees Org A data

**Performance Testing**:
- Load 100 objectives, measure page load time
- Load 200 activities, measure query time
- Run `EXPLAIN ANALYZE` on complex queries

## Task Breakdown Preview

High-level task categories (10 tasks total):

1. **[Foundation] Create RLS Client Infrastructure**
   - Implement `lib/database/rls-client.ts`
   - Test RLS context setting
   - Document usage pattern

2. **[Foundation] Verify RLS Policies Active**
   - Run PostgreSQL query to confirm RLS enabled
   - Test policy enforcement with manual SQL

3. **[Page 1] Implement Objectives Page Real Data**
   - Create objectives service
   - Update page component
   - Remove mock data
   - Test multi-tenant isolation

4. **[Page 2] Implement Initiatives Page Real Data**
   - Create initiatives service with JOIN
   - Update page component
   - Test referential integrity

5. **[Page 3] Implement Activities Page Real Data**
   - Create activities service with multi-JOIN
   - Update page component
   - Test overdue calculations

6. **[Page 4] Implement OKR Dashboard Real Data**
   - Add dashboard stats to analytics service
   - Update page component
   - Test aggregate accuracy

7. **[Page 5] Implement Analytics Page Real Data**
   - Complete analytics service (4 functions)
   - Update page component
   - Test complex aggregations

8. **[Testing] Multi-Tenant Security Audit**
   - Create 2+ test organizations
   - Verify complete data isolation
   - Document test results

9. **[Testing] Performance Benchmarking**
   - Load test each page with 100+ records
   - Measure P95 latency
   - Verify < SLA thresholds

10. **[Documentation] Update Implementation Guide**
    - Mark pages as "migrated" in `MOCK_DATA_REPLACEMENT_GUIDE.md`
    - Document any deviations from plan
    - Add troubleshooting guide

## Dependencies

### External Dependencies

1. **NeonDB Database Availability**
   - Required for: All queries
   - Risk: Database outage blocks all work
   - Mitigation: Use staging database for development

2. **Stack Auth Service**
   - Required for: User authentication, getting `user.id`
   - Risk: Auth service down blocks RLS context
   - Mitigation: N/A (critical dependency)

3. **Environment Variables**
   - `DATABASE_URL_UNPOOLED` - RLS context requires unpooled connection
   - `DATABASE_URL` - Drizzle connection
   - Risk: Missing vars cause runtime errors
   - Mitigation: Validate on app startup

### Internal Dependencies

**Sequential Epic Dependencies**:

```
Foundation (Epic 0)
    ↓
Objectives (Epic 1) ← Can start immediately after foundation
    ↓
Initiatives (Epic 2) ← Needs objectives data for JOIN testing
    ↓
Activities (Epic 3) ← Needs initiatives data for JOIN testing
    ↓
Dashboard (Epic 4) ← Needs all tables for aggregations
    ↓
Analytics (Epic 5) ← Needs all tables for complex queries
```

**Code Dependencies**:

- All epics depend on `lib/database/rls-client.ts` (Foundation)
- Initiatives service depends on `objectives` table having data
- Activities service depends on `initiatives` table having data
- Dashboard/Analytics depend on all prior services

**Testing Dependencies**:

- Multi-tenant testing requires 2+ organizations created
- Performance testing requires seeding 100+ records
- Security audit requires all pages migrated

### Existing Infrastructure (Already Complete)

✅ **RLS Policies Applied**: All tenant tables have policies
✅ **Database Schema**: Drizzle schema exists with all tables
✅ **Indexes**: `*_tenant_idx` created on all tenant tables
✅ **Onboarding Flow**: Users can create orgs and profiles
✅ **Authentication**: Stack Auth integration working
✅ **Multi-Tenant Foundation**: `tenant_id` on all records

## Success Criteria (Technical)

### Performance Benchmarks

| Page | Target Load Time | Test Condition | Status |
|------|------------------|----------------|--------|
| Objectives | <2s | 100 objectives | ⏳ |
| Initiatives | <2s | 100 initiatives | ⏳ |
| Activities | <2s | 200 activities | ⏳ |
| Dashboard | <1s | All aggregates | ⏳ |
| Analytics | <3s | All queries parallel | ⏳ |

**Measurement**: P95 latency over 10 page loads

### Quality Gates

**Before Merge** (each epic):
- [ ] TypeScript build passes (no errors)
- [ ] All service functions have explicit return types
- [ ] All queries use `withRLSContext()` wrapper
- [ ] Multi-tenant test passes (2 orgs tested)
- [ ] Empty state tested (new org with no data)
- [ ] Performance benchmark met

**Before Production** (overall):
- [ ] Security audit completed (no cross-tenant leaks)
- [ ] All 5 pages migrated (Insights deferred)
- [ ] Performance tests passed for all pages
- [ ] Error handling tested (network failures, DB errors)
- [ ] Documentation updated

### Acceptance Criteria

**Data Accuracy**:
- ✅ 100% of displayed data belongs to user's `tenant_id`
- ✅ Queries filtered by `tenant_id` in WHERE clause
- ✅ RLS policies enforce isolation at database level

**Code Quality**:
- ✅ Zero `any` types in service layer
- ✅ All queries use Drizzle ORM (no raw SQL except RLS context)
- ✅ Consistent error handling across all services

**User Experience**:
- ✅ Empty states display when no data exists
- ✅ Loading states work (Suspense boundaries)
- ✅ Error states show meaningful messages

**Security**:
- ✅ Manual test: User A cannot see User B's data
- ✅ Automated test: Cross-tenant isolation verified
- ✅ RLS context failures throw errors (don't return wrong data)

## Estimated Effort

**Total Duration**: 13 hours (excluding Insights page)

**Breakdown by Phase**:
- Foundation: 2 hours
- Objectives: 2 hours
- Initiatives: 2 hours
- Activities: 2 hours
- Dashboard: 1 hour
- Analytics: 4 hours

**Resource Requirements**:
- 1 Developer (sequential implementation)
- Access to NeonDB production database
- Vercel deployment access

**Critical Path**:
```
Foundation → Objectives → Initiatives → Activities → Dashboard → Analytics
(2h)         (2h)        (2h)          (2h)         (1h)        (4h)
```

**Buffer**: Add 20% (2.6 hours) for unexpected issues
**Total with Buffer**: ~16 hours

## Tasks Created
- [ ] #100 - Create RLS Client Infrastructure (parallel: false)
- [ ] #101 - Verify RLS Policies Active (parallel: false)
- [ ] #102 - Implement Analytics Page Real Data (parallel: false)
- [ ] #103 - Implement Objectives Page Real Data (parallel: true)
- [ ] #104 - Multi-Tenant Security Audit (parallel: false)
- [ ] #105 - Performance Benchmarking (parallel: true)
- [ ] #106 - Update Implementation Documentation (parallel: false)
- [ ] #97 - Implement Initiatives Page Real Data (parallel: true)
- [ ] #98 - Implement Activities Page Real Data (parallel: true)
- [ ] #99 - Implement OKR Dashboard Real Data (parallel: false)

Total tasks: 10
Parallel tasks: 4
Sequential tasks: 6
## Related Documentation

- **PRD**: `.claude/prds/implement-real-data-infrastructure.md`
- **Implementation Guide**: `MOCK_DATA_REPLACEMENT_GUIDE.md`
- **Multi-Tenant Summary**: `FINAL_IMPLEMENTATION_SUMMARY.md`
- **RLS Policies**: `drizzle/0005_rls_policies_neon.sql`
- **Database Schema**: `db/okr-schema.ts`

---

**Epic Status**: ✅ Tasks Decomposed (10 tasks created)
**Next Step**: Run `/pm:epic-sync implement-real-data-infrastructure` to sync to GitHub issues
