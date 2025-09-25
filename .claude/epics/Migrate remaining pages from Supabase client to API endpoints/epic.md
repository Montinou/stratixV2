---
name: Migrate remaining pages from Supabase client to API endpoints
status: backlog
created: 2025-09-25T03:19:06Z
progress: 0%
prd: .claude/prds/Migrate remaining pages from Supabase client to API endpoints.md
github: [Will be updated when synced to GitHub]
---

# Epic: Migrate Remaining Pages from Supabase Client to API Endpoints

## Overview

Complete the final 40% of the Supabase to NeonDB migration by replacing direct Supabase client calls with established API endpoints in 8 critical pages. The robust API infrastructure (20+ endpoints) and authentication system (NeonAuth + Drizzle) are already operational - this is primarily a **client-side refactoring** to restore broken production functionality.

**Key Insight**: This is NOT about building new APIs - it's about **connecting existing UI to existing APIs** by replacing the failing Supabase client stub.

## Architecture Decisions

### Leverage Existing Infrastructure
- **API Endpoints**: All required endpoints already exist (`/api/initiatives`, `/api/companies`, etc.)
- **Authentication**: NeonAuth integration is complete and working  
- **Database Layer**: Drizzle ORM with NeonDB is operational
- **Response Patterns**: Consistent API patterns established across 20+ endpoints

### Client-Side Strategy
- **Minimal Changes**: Replace `supabase.from('table')` calls with `fetch('/api/endpoint')` calls
- **Error Handling**: Use existing API error response patterns
- **Type Safety**: Leverage existing TypeScript interfaces
- **State Management**: Keep existing React state patterns

### Smart Stub Replacement
Current Supabase client stub already demonstrates the pattern:
```typescript
// Current stub in /lib/supabase/client-stub.ts
supabase.from('initiatives') → fetch('/api/initiatives')
```

We'll replace this stub approach with direct API calls in components.

## Technical Approach

### Frontend Components (Primary Work)
- **Replace Client Calls**: Convert `supabase.from()` patterns to `fetch()` API calls
- **Error Boundaries**: Implement consistent error handling using existing patterns
- **Loading States**: Maintain existing loading UX with proper state management
- **Form Integration**: Update form submissions to use API endpoints instead of client

### Backend Services (Already Complete)
- **API Endpoints**: ✅ All required endpoints exist and tested
- **Authentication**: ✅ NeonAuth server-side validation working
- **Authorization**: ✅ Role-based filtering implemented
- **Data Layer**: ✅ Drizzle repositories and services operational

### Infrastructure (No Changes Required)
- **Database**: ✅ NeonDB connection and schema stable
- **Deployment**: ✅ Vercel configuration working
- **Environment**: ✅ All variables configured properly

## Implementation Strategy

### Phase 1: Critical OKR Features (Days 1-2) 
**Immediate Priority** - Core functionality broken in production
- Initiatives page and form components
- Activities form component  
- Company management page

### Phase 2: User Management (Days 3-4)
**High Priority** - User-facing features
- Team management page
- Profile page integration with NeonAuth

### Phase 3: Analytics & Import (Days 5-6)  
**Medium Priority** - Supporting features
- Insights page with analytics API
- Import page with data processing API

### Risk Mitigation
- **Rollback Plan**: Keep client stub as fallback during migration
- **Testing**: Manual testing of each page after migration
- **Incremental**: One page at a time to minimize blast radius

## Task Breakdown Preview

High-level task categories (≤10 tasks total):

- [ ] **Critical OKR Pages**: Replace Supabase calls in initiatives, activities, and companies pages
- [ ] **User Management Pages**: Migrate team and profile pages to API endpoints  
- [ ] **Analytics Pages**: Connect insights and import pages to API endpoints
- [ ] **Form Components**: Update all form submissions to use API endpoints
- [ ] **Error Handling**: Standardize error handling across migrated components
- [ ] **Authentication Integration**: Ensure NeonAuth works consistently across all pages
- [ ] **Client Stub Cleanup**: Remove temporary Supabase client stub after migration
- [ ] **Testing & Validation**: Manual testing of all migrated functionality
- [ ] **Build Verification**: Ensure application builds and deploys successfully
- [ ] **Documentation Update**: Update any internal docs referencing old patterns

## Dependencies

### Operational Dependencies (Ready)
- ✅ **NeonDB Service**: Database operational and performant
- ✅ **NeonAuth Service**: Authentication service stable
- ✅ **API Endpoints**: All required endpoints functional and tested
- ✅ **Drizzle ORM**: Database layer working correctly

### Development Dependencies
- **Environment Access**: Proper access to development and production environments
- **Testing Capability**: Ability to test changes in staging before production
- **Deployment Pipeline**: Working CI/CD for safe deployments

## Success Criteria (Technical)

### Functionality Restoration
- ✅ **Page Load Success**: All 8 pages load without errors
- ✅ **Data Operations**: CRUD operations work for initiatives, activities, companies
- ✅ **User Experience**: Loading states, error messages, form validation intact
- ✅ **Authentication**: Login/logout, role-based access working correctly

### Code Quality
- ✅ **Build Success**: `npm run build` completes without errors
- ✅ **Type Safety**: No TypeScript errors introduced during migration
- ✅ **Error Handling**: Consistent error patterns across all pages
- ✅ **Performance**: Page load times maintained or improved

### Technical Debt Reduction
- ✅ **Architecture Consistency**: All pages use same API pattern
- ✅ **Auth Unification**: Single NeonAuth system throughout
- ✅ **Clean Codebase**: No Supabase client stub or legacy patterns

## Estimated Effort

### Overall Timeline: 6-7 Days
- **Phase 1** (Critical): 2 days - Restore core OKR functionality
- **Phase 2** (User Mgmt): 2 days - User-facing features  
- **Phase 3** (Analytics): 2 days - Supporting features
- **Cleanup & Testing**: 1 day - Final validation and deployment

### Resource Requirements
- **Single Developer**: Full-stack developer familiar with the codebase
- **Testing Support**: Manual testing capability for each migrated page
- **Deployment Access**: Ability to deploy and rollback changes

### Critical Path Items
1. **Initiatives Page Migration** - Highest user impact, most complex forms
2. **Authentication Consistency** - Must work across all pages  
3. **Error Handling Standardization** - User experience depends on this
4. **Build Pipeline Compatibility** - Must not break existing deployment

This epic focuses on the minimal viable changes to restore production functionality by leveraging the robust API infrastructure already in place, rather than rebuilding systems that already work.

## Tasks Created
- [ ] 001.md - Migrate initiatives page from Supabase client to API endpoints (parallel: true)
- [ ] 002.md - Migrate initiative form component to API endpoints (parallel: true)
- [ ] 003.md - Migrate activity form component to API endpoints (parallel: true)
- [ ] 004.md - Migrate companies page to API endpoints (parallel: true)
- [ ] 005.md - Migrate team management page to API endpoints (parallel: true)
- [ ] 006.md - Integrate profile page with NeonAuth and API endpoints (parallel: true)
- [ ] 007.md - Migrate insights page to analytics API endpoints (parallel: true)
- [ ] 008.md - Migrate import page to API endpoints for data processing (parallel: true)
- [ ] 009.md - Remove Supabase client stub and clean up authentication system (parallel: false)
- [ ] 010.md - End-to-end testing and build verification (parallel: false)

Total tasks: 10
Parallel tasks: 8 (tasks 001-008 can run simultaneously)
Sequential tasks: 2 (tasks 009-010 must wait for dependencies)
Estimated total effort: 60-78 hours (6-7 development days)