---
name: Migrate remaining pages from Supabase client to API endpoints
description: Complete migration of 8 critical pages from direct Supabase client calls to standardized API endpoints following established patterns
status: backlog
created: 2025-09-24T19:29:26Z
---

# PRD: Migrate Remaining Pages from Supabase Client to API Endpoints

## Executive Summary

Complete the final phase of the Supabase to NeonDB migration by migrating 8 remaining critical pages from direct Supabase client calls to standardized API endpoints. This migration follows established API patterns and will resolve current production issues caused by Supabase client stub implementations. The migration prioritizes core OKR functionality to restore critical user features while maintaining the existing robust API architecture.

## Problem Statement

### Current Issues
- **Production Functionality Broken**: Core OKR features (initiatives, companies, activities) are currently non-functional due to Supabase client stub returning mock data
- **Inconsistent Data Access**: Some pages use direct Supabase client calls while others use API endpoints, creating architectural inconsistency  
- **Authentication Fragmentation**: Mixed authentication patterns between legacy Supabase auth and new NeonAuth system
- **Technical Debt**: Temporary client stubs are masking critical functionality gaps

### Why This is Critical Now
- **User Impact**: Core application features are currently broken in production
- **Architecture Completion**: 60% of migration is complete with robust API infrastructure already established
- **Clean Foundation**: Existing API patterns are well-designed and consistent, providing clear migration path
- **Development Velocity**: Mixed architecture patterns are slowing feature development

## User Stories

### Primary User Personas

#### OKR Managers (Critical Impact)
- **As an OKR manager**, I need to create and manage strategic initiatives so that I can execute company objectives
- **As an OKR manager**, I need to track initiative progress and activities so that I can report on strategic outcomes
- **As an OKR manager**, I need reliable data persistence so that strategic planning data is never lost

#### Company Administrators (High Impact)  
- **As a company admin**, I need to manage company settings and departments so that the OKR system reflects our organizational structure
- **As a company admin**, I need to oversee team management and permissions so that access control is properly maintained

#### Team Members (Medium Impact)
- **As a team member**, I need to access my profile and team information so that I can collaborate effectively
- **As a team member**, I need to import data and view insights so that I can contribute to strategic initiatives

### Detailed User Journeys

#### Critical Path: Initiative Management
1. **Access initiatives page** → Should load real initiative data, not mock responses
2. **Create new initiative** → Should persist to NeonDB and trigger proper audit trails
3. **Edit existing initiative** → Should update real data and maintain data integrity
4. **Track progress** → Should reflect actual progress data and calculation logic

#### Administrative Path: Company Management  
1. **Access company settings** → Should load actual company configuration
2. **Update company details** → Should persist changes and update dependent systems
3. **Manage departments** → Should maintain organizational hierarchy integrity

## Requirements

### Functional Requirements

#### Core Migration Tasks
1. **Initiative Management Pages**
   - `/app/initiatives/page.tsx` → Use `/api/initiatives` endpoints
   - `/components/okr/initiative-form.tsx` → Replace Supabase client with API calls
   - Support full CRUD operations with proper error handling

2. **Activity Management Components**  
   - `/components/okr/activity-form.tsx` → Use `/api/activities` endpoints
   - Maintain existing form validation and user experience
   - Integrate with initiative relationships

3. **Company Management System**
   - `/app/companies/page.tsx` → Use `/api/companies` endpoints
   - Support role-based access control (corporativo level required)
   - Maintain company hierarchy and department relationships

4. **Secondary Pages Migration**
   - `/app/team/page.tsx` → Use `/api/users` and `/api/profiles` endpoints
   - `/app/profile/page.tsx` → Integrate with NeonAuth profile system
   - `/app/insights/page.tsx` → Use `/api/analytics` endpoints  
   - `/app/import/page.tsx` → Maintain data import functionality

#### API Integration Standards
- **Authentication**: Use NeonAuth server-side validation (`neonServerClient.getUser()`)
- **Authorization**: Implement role-based filtering (empleado/gerente/corporativo)
- **Error Handling**: Follow established error response patterns
- **Response Format**: Use consistent API response structures
- **Validation**: Apply proper input validation and type safety

### Non-Functional Requirements

#### Performance
- **Response Time**: API endpoints should respond within 200ms for data queries
- **Load Time**: Page load times should not exceed 2 seconds after migration  
- **Throughput**: Support concurrent requests from 100+ users

#### Reliability  
- **Error Recovery**: Graceful error handling with user-friendly messages
- **Data Integrity**: All database operations must maintain referential integrity
- **Session Management**: Proper authentication state management across page transitions

#### Security
- **Access Control**: Strict role-based permissions on all endpoints
- **Data Validation**: Comprehensive input sanitization and validation
- **Audit Trail**: Maintain operation logging for compliance

#### Maintainability
- **Code Consistency**: Follow established patterns from existing API endpoints
- **Type Safety**: Maintain full TypeScript support throughout
- **Error Logging**: Comprehensive logging for debugging and monitoring

## Success Criteria

### Primary Success Metrics
- [ ] **8 critical pages** fully migrated from Supabase client to API endpoints
- [ ] **Zero Supabase client dependencies** remaining in frontend code
- [ ] **100% functionality restoration** - all features work as before migration
- [ ] **Build success** - application builds and deploys without errors

### User Experience Metrics  
- [ ] **Core OKR workflows functional** - initiatives, activities, objectives management
- [ ] **Company administration operational** - settings, departments, team management
- [ ] **User profiles integrated** - NeonAuth profile system fully functional
- [ ] **Data import/export working** - CSV import and insights generation functional

### Technical Quality Metrics
- [ ] **API consistency** - all endpoints follow established patterns
- [ ] **Error handling standardized** - consistent error responses across all endpoints
- [ ] **Authentication unified** - single NeonAuth system throughout application
- [ ] **Type safety maintained** - full TypeScript coverage with proper typing

## Technical Implementation Plan

### Phase 1: Critical Functionality (Priority 1)
**Timeline**: Days 1-2
- `/app/initiatives/page.tsx` → `/api/initiatives`
- `/components/okr/initiative-form.tsx` → API integration
- `/components/okr/activity-form.tsx` → `/api/activities`
- `/app/companies/page.tsx` → `/api/companies`

### Phase 2: User Management (Priority 2)  
**Timeline**: Days 3-4
- `/app/team/page.tsx` → `/api/users`, `/api/profiles`
- `/app/profile/page.tsx` → NeonAuth profile integration

### Phase 3: Analytics & Import (Priority 3)
**Timeline**: Days 5-6  
- `/app/insights/page.tsx` → `/api/analytics`
- `/app/import/page.tsx` → API integration for data processing

### Phase 4: Cleanup & Validation (Priority 4)
**Timeline**: Day 7
- Remove Supabase client stub `/lib/supabase/client-stub.ts`
- Clean up dual authentication system in `/lib/hooks/use-auth.tsx`
- Comprehensive testing and validation

## API Integration Specifications

### Established Patterns to Follow

#### Authentication Flow
```typescript
// Server-side authentication check
const user = await neonServerClient.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Profile-based authorization  
const { data: profile, error } = await getCurrentProfile()
if (!profile) {
  return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
}
```

#### Response Formats
```typescript
// Success responses
{ data: T, status: 200|201 }

// Error responses  
{ error: string, status: 400|401|404|409|500 }

// Enhanced format (for new endpoints)
{ success: boolean, data?: T, error?: string, message?: string }
```

#### Role-Based Filtering
- **empleado**: Access only owned resources (`ownerId = userId`)  
- **gerente**: Access department resources (`department = userDepartment`)
- **corporativo**: Access all company resources (no filtering)

## Constraints & Assumptions

### Technical Constraints
- **Existing API Architecture**: Must follow established patterns from 20+ existing endpoints
- **Database Schema**: NeonDB schema is fixed, cannot modify table structures
- **Authentication System**: NeonAuth integration is established and cannot be changed
- **Response Format Compatibility**: Must maintain backward compatibility with existing API consumers

### Timeline Constraints  
- **Production Impact**: Critical functionality is currently broken, requiring urgent resolution
- **Development Resources**: Single developer working on migration
- **Testing Window**: Limited time for comprehensive testing before deployment

### Resource Limitations
- **Database Connection Pool**: Must work within existing connection pool limits  
- **API Rate Limits**: Must respect NeonDB and NeonAuth rate limitations
- **Memory Constraints**: Frontend bundle size should not increase significantly

## Dependencies

### Internal Dependencies
- **NeonDB Database**: Requires stable NeonDB connection and schema
- **NeonAuth System**: Depends on Stack authentication service  
- **Existing API Endpoints**: Builds upon established API architecture patterns
- **Database Services**: Relies on existing repository pattern implementations

### External Dependencies  
- **Stack (NeonAuth) Service**: External authentication provider must be operational
- **NeonDB Service**: Database service must maintain 99.9% uptime
- **Drizzle ORM**: Database query builder must function correctly
- **Next.js Framework**: Server-side API route functionality

### Deployment Dependencies
- **Vercel Platform**: Deployment environment with environment variable access
- **Environment Variables**: Proper configuration of database and auth credentials
- **Build Pipeline**: Pre-build migration scripts must execute successfully

## Out of Scope

### Explicitly Excluded
- **Database Schema Changes**: No modifications to existing NeonDB table structures
- **New Feature Development**: Focus is migration only, no new functionality
- **Performance Optimization**: Beyond ensuring existing performance levels are maintained
- **UI/UX Changes**: User interface should remain identical after migration
- **Test Suite Creation**: Will reuse existing testing patterns without comprehensive test creation

### Future Considerations (Post-Migration)
- **API Performance Optimization**: Implement caching and query optimization
- **Enhanced Error Recovery**: More sophisticated error handling and retry logic
- **Real-time Features**: WebSocket integration for live updates
- **Comprehensive Test Coverage**: Full test suite for all API endpoints
- **API Documentation**: OpenAPI/Swagger documentation for all endpoints

## Risk Assessment

### High Risk - Production Impact
- **Risk**: Extended downtime if migration fails
- **Mitigation**: Phased rollout with ability to rollback to Supabase client stub
- **Detection**: Automated health checks on critical endpoints

### Medium Risk - Data Consistency  
- **Risk**: Data corruption during transition between systems
- **Mitigation**: Read-only testing phase, comprehensive validation before write operations
- **Detection**: Database integrity checks and audit log monitoring

### Medium Risk - Authentication Issues
- **Risk**: Users unable to access application due to auth system conflicts  
- **Mitigation**: Maintain dual auth support during transition, gradual migration
- **Detection**: Authentication success rate monitoring

### Low Risk - Performance Degradation
- **Risk**: API endpoints slower than direct Supabase client calls
- **Mitigation**: Performance testing during development, caching implementation
- **Detection**: Response time monitoring and user feedback

## Communication Plan

### Development Updates
- **Daily Progress**: Update PRD status and completion percentage
- **Issue Escalation**: Immediate notification for blocking issues
- **Completion Notification**: Comprehensive summary upon phase completion

### User Communication  
- **Maintenance Window**: Notify users of potential brief service interruptions
- **Feature Restoration**: Communicate when critical functionality is restored
- **Post-Migration**: Confirm successful migration and any improvements

This PRD provides the comprehensive roadmap for completing the Supabase to API endpoint migration, restoring critical application functionality while maintaining architectural consistency and code quality standards.