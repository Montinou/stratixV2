---
name: stub-to-api-migration
description: Replace temporary stub implementations with proper API calls to complete NeonDB migration
status: backlog
created: 2025-09-24T19:30:04Z
---

# PRD: Stub-to-API Migration

## Executive Summary

Complete the NeonDB migration by replacing temporary stub implementations with proper API calls, ensuring all client-side code uses server-side API endpoints instead of direct database connections or fallback stubs. This migration will improve security, performance, and maintainability while completing the transition from Supabase to NeonDB.

## Problem Statement

### Current State
During the NeonDB migration and build fixes, temporary stub implementations were created to resolve runtime errors:
- `SessionManager` stub providing no-op session management
- `StackProfileBridge` stub creating fallback profiles from Stack user data  
- Several pages still using Supabase client stubs instead of API endpoints
- Mixed client-side/server-side data access patterns

### Problems Being Solved
1. **Security Risk**: Client-side stubs expose authentication logic and provide no real session management
2. **Data Inconsistency**: Stub implementations return mock data instead of real database information
3. **Performance Issues**: No caching, session persistence, or optimized data fetching
4. **Technical Debt**: Temporary solutions blocking proper authentication integration
5. **User Experience**: Users see placeholder data instead of real profiles and company information

### Why Now?
- NeonDB infrastructure is complete and production-ready
- Build and deployment pipelines are working
- API endpoints are implemented and tested
- Stub implementations were always intended as temporary measures

## User Stories

### Primary Personas
- **End Users**: Employees, managers, and corporate users of the OKR system
- **Developers**: Team members working on the application
- **System Administrators**: Managing authentication and user data

### User Journeys

#### Authenticated User Experience
**As an authenticated user, I want:**
- My real profile information displayed consistently across the application
- My company information and role permissions to work correctly  
- Session persistence across browser refreshes and tab switches
- Fast loading of my personalized dashboard and data

**Acceptance Criteria:**
- Profile data loads from database via API endpoints
- Company information displays correctly based on user's actual company
- Role-based permissions work as intended (empleado, gerente, corporativo)
- Session remains valid across browser refreshes
- User preferences and settings persist correctly

#### New User Onboarding
**As a new user signing up, I want:**
- Automatic profile creation when I first authenticate
- Default company assignment or company selection flow
- Proper role assignment based on invitation or company policies
- Immediate access to features appropriate to my role

**Acceptance Criteria:**
- New user profile created automatically on first login
- Company assignment works via invitation or selection
- Role permissions applied immediately after profile creation
- Welcome flow guides user through initial setup

#### Developer Experience  
**As a developer, I want:**
- Consistent patterns for data fetching across components
- Type-safe API calls with proper error handling
- Clear separation between client and server-side code
- Maintainable authentication state management

**Acceptance Criteria:**
- All components use API endpoints consistently
- Type definitions match API responses
- Error handling follows established patterns
- Authentication state updates properly across components

## Requirements

### Functional Requirements

#### Authentication Integration
- Replace SessionManager stub with real session management
- Integrate Stack authentication with database profile operations
- Implement automatic profile creation/sync for new users
- Support profile updates and company assignment
- Handle authentication state changes properly

#### API Migration  
- Replace Supabase client calls in all remaining components
- Migrate companies page to use `/api/companies` endpoint
- Migrate initiatives page to use `/api/initiatives` endpoint  
- Migrate insights page to use appropriate analytics endpoints
- Update profile page to use `/api/profiles` endpoint
- Convert team page to use user management endpoints

#### Session Management
- Implement proper session caching and persistence
- Handle session refresh scenarios
- Manage authentication state across browser tabs
- Clear session data on logout
- Store user preferences and application state

#### Data Consistency
- Ensure all user data comes from database via APIs
- Synchronize Stack user data with database profiles
- Handle data updates consistently across components
- Maintain referential integrity for company/user relationships

### Non-Functional Requirements

#### Performance
- Session data cached for optimal loading performance
- API calls debounced and cached appropriately
- Profile data loaded once per session with refresh capabilities
- Lazy loading for non-critical user data

#### Security
- No sensitive data exposed in client-side code
- All database operations go through authenticated API endpoints
- Session tokens handled securely with proper expiration
- Role-based access control enforced server-side

#### Reliability
- Graceful degradation when API endpoints are unavailable
- Retry logic for failed API calls
- Error boundaries to prevent authentication failures from breaking UI
- Fallback to Stack user data only when database is unavailable

#### Maintainability
- Consistent patterns for API calls across components
- Clear separation between authentication and business logic  
- Proper TypeScript interfaces for all API responses
- Comprehensive error handling and logging

## Success Criteria

### Primary Metrics
- **Zero Stub Usage**: No remaining stub implementations in production code
- **API Coverage**: 100% of user data comes from API endpoints
- **Authentication Success**: All authentication flows work end-to-end
- **Data Accuracy**: Real user/company data displayed throughout application

### Performance Metrics
- Session data loads within 200ms of authentication
- Profile information cached for 5-minute sessions
- API response times under 100ms for cached data
- Zero authentication-related client-side errors

### User Experience Metrics
- Smooth authentication flow with no visible delays
- Consistent user information across all pages
- Proper role-based feature access
- Session persistence across browser actions

### Technical Metrics
- Build success rate remains 100%
- Zero client-side database connection attempts
- All API endpoints respond with proper status codes
- Type safety maintained across authentication boundaries

## Constraints & Assumptions

### Technical Constraints
- Must maintain backward compatibility during migration
- Cannot break existing authentication flows during transition
- NeonDB API endpoints must handle expected load
- Stack Auth integration must remain functional

### Timeline Constraints
- Should not block ongoing development work
- Migration can be done incrementally
- Must complete before removing stub implementations
- Should align with any planned authentication updates

### Resource Constraints
- Existing API endpoints should be leveraged where possible
- Minimal new infrastructure requirements
- Should not require database schema changes
- Must work within current deployment pipeline

### Assumptions
- NeonDB infrastructure will remain stable during migration
- API endpoints will maintain current response formats
- Stack Auth integration will continue working as expected
- No major changes to user roles or permissions during migration

## Out of Scope

### Explicitly Not Included
- New authentication methods or providers
- Changes to user role definitions or permissions
- Database schema modifications or migrations
- New user management features or admin panels
- Performance optimization beyond basic caching
- Advanced session management features (remember me, etc.)

### Future Considerations
- Enhanced session analytics and monitoring
- Advanced user preference management
- Company-specific authentication policies
- Integration with external identity providers

## Dependencies

### External Dependencies
- Stack Auth service availability and API stability
- NeonDB database performance and reliability  
- Existing API endpoint functionality

### Internal Dependencies
- Completion of NeonDB migration (✅ Complete)
- API endpoints for all required operations (✅ Available)
- TypeScript interfaces for API responses (✅ Defined)
- Error handling patterns established (✅ In place)

### Team Dependencies
- Frontend team for component migration
- Backend team for any API endpoint adjustments
- QA team for testing authentication flows
- DevOps team for monitoring deployment impact

## Implementation Strategy

### Phase 1: Authentication Core (Priority: High)
- Replace SessionManager with real API-based session management
- Replace StackProfileBridge with actual profile API calls
- Implement proper profile creation and sync flows
- Test authentication state management thoroughly

### Phase 2: Component Migration (Priority: Medium)  
- Migrate companies page to API endpoints
- Convert initiatives and insights pages
- Update profile and team management pages
- Remove all Supabase client stub usage

### Phase 3: Optimization & Polish (Priority: Low)
- Implement caching strategies for better performance
- Add loading states and error handling improvements
- Optimize API call patterns and reduce redundant requests
- Add comprehensive logging for debugging

### Rollback Strategy
- Maintain stub implementations until API versions are fully tested
- Feature flags to control which components use API vs stubs
- Database rollback plan if data inconsistencies occur
- Monitoring and alerts for authentication failure rates

## Risk Mitigation

### High-Risk Areas
- **Authentication State Loss**: Comprehensive testing of session management
- **Data Inconsistency**: Validation of API responses vs stub data
- **Performance Degradation**: Load testing of API endpoints
- **User Session Disruption**: Gradual migration with careful monitoring

### Mitigation Strategies
- Comprehensive testing environment matching production
- Feature flags for gradual rollout
- Real-time monitoring of authentication success rates
- Quick rollback procedures if issues occur
- Backup session management using local storage if needed

## Success Validation

### Acceptance Testing
- All authentication flows work end-to-end
- User profiles display real data from database
- Company information and role permissions function correctly
- Session persistence works across browser refreshes
- No console errors related to undefined managers or missing data

### Performance Testing
- Session data loads within performance targets
- API endpoints handle expected concurrent users
- No degradation in page load times
- Memory usage remains stable without stub implementations

### Security Testing
- No sensitive data exposed in client-side code
- All API calls properly authenticated
- Session tokens handled securely
- Role-based access control enforced correctly