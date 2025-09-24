# Product Requirements Document: Complete NeonDB Configuration with Drizzle + Stack

## Document Information
**Created**: 2025-09-24T04:18:51Z  
**Epic**: finish-neondb-configuration  
**Status**: Draft  
**Priority**: Critical  

## Executive Summary

Complete the NeonDB migration by replacing the current PostgreSQL client with Drizzle ORM and fully integrating Stack (NeonAuth) authentication system. This will provide type-safe database operations, better developer experience, and seamless authentication integration.

## Problem Statement

### Current State Analysis
Based on code analysis, the current NeonDB implementation has several critical gaps:

1. **Authentication Disconnect**: `use-auth` hook returns mock profile data instead of connecting to actual database profiles
2. **Schema Misalignment**: Database services query `profiles.user_id` but schema defines `profiles.id`  
3. **Missing Company Management**: Services reference `company_id` but no companies table exists
4. **Raw SQL Complexity**: Current implementation uses raw PostgreSQL queries without type safety

### Target State
- **Drizzle ORM**: Type-safe database operations with schema-first approach
- **Stack Integration**: Seamless authentication with database-backed user profiles
- **Complete Migration**: Zero Supabase dependencies, full NeonDB + Stack ecosystem

## Goals & Success Criteria

### Primary Goals
1. **Replace PostgreSQL Client with Drizzle ORM**
   - Implement type-safe database schema
   - Replace all raw SQL queries with Drizzle queries
   - Maintain existing API compatibility

2. **Complete Stack Authentication Integration**
   - Connect user profiles to Stack user system
   - Implement database-backed profile management
   - Ensure proper session handling

3. **Production Readiness**
   - Optimize connection pooling for production
   - Implement proper error handling and logging
   - Complete all migration gaps identified

### Success Criteria
- ✅ All database operations use Drizzle ORM
- ✅ Authentication returns real user profiles from database
- ✅ Zero TypeScript errors related to database types
- ✅ All existing functionality works without regression
- ✅ Build and deployment succeed without errors

## Technical Requirements

### 1. Drizzle ORM Integration

#### Schema Definition
- **Location**: `lib/database/schema.ts`
- **Tables**: users, profiles, objectives, initiatives, activities, companies
- **Relationships**: Properly defined foreign keys and relations
- **Types**: Auto-generated TypeScript types

#### Database Client
- **Location**: `lib/database/client.ts`  
- **Driver**: `drizzle-orm/postgres-js` with connection pooling
- **Configuration**: Environment-based connection strings
- **Migrations**: Drizzle Kit for schema migrations

#### Query Layer
- **Location**: `lib/database/queries/` (organized by entity)
- **Pattern**: Repository pattern with Drizzle queries
- **Error Handling**: Consistent error patterns across all queries

### 2. Stack Authentication Integration

#### User Profile Management
- **Stack User → Database Profile**: Automatic profile creation on first login
- **Profile Updates**: Sync Stack user data with database profiles
- **Session Management**: Leverage Stack's session handling

#### Authentication Hook
- **File**: `lib/hooks/use-auth.tsx`
- **Functionality**: Return actual database profiles instead of mock data
- **Integration**: Use Stack's user context + database profile queries

### 3. Database Schema Requirements

```typescript
// Core entities needed
- users (Stack integration)
- profiles (user profile data)  
- companies (organization management)
- objectives (OKR objectives)
- initiatives (strategic initiatives)
- activities (task management)
- okr_relationships (objective hierarchies)
```

### 4. Migration Strategy

#### Phase 1: Drizzle Setup
1. Install Drizzle ORM and dependencies
2. Define complete schema with relations
3. Setup Drizzle client and connection
4. Create migration scripts

#### Phase 2: Query Migration  
1. Replace `lib/database/services.ts` with Drizzle queries
2. Update all API routes to use new query layer
3. Maintain API compatibility during transition

#### Phase 3: Stack Integration
1. Update authentication hook to query database
2. Implement profile sync with Stack users
3. Test complete authentication flow

#### Phase 4: Production Optimization
1. Optimize connection pooling settings
2. Implement proper error handling and logging
3. Performance testing and optimization

## Dependencies & Packages

### Required Dependencies
```json
{
  "drizzle-orm": "^0.29.0",
  "drizzle-kit": "^0.20.0", 
  "postgres": "^3.4.0",
  "@stackframe/stack": "^2.8.39" // (already installed)
}
```

### Development Dependencies
```json
{
  "@types/postgres": "^3.0.0"
}
```

## File Structure

```
lib/database/
├── schema.ts              # Drizzle schema definitions
├── client.ts              # Drizzle client configuration  
├── migrations/            # Drizzle Kit migrations
│   └── 0001_initial.sql
├── queries/               # Query layer organized by entity
│   ├── users.ts
│   ├── profiles.ts
│   ├── objectives.ts
│   ├── initiatives.ts
│   └── activities.ts
└── types.ts               # Exported database types
```

## Risk Assessment

### High Risk
- **Breaking Changes**: Replacing core database layer could break existing functionality
- **Authentication Flow**: Changes to auth hook could disrupt user sessions
- **Data Migration**: Existing data needs to be preserved during schema changes

### Medium Risk  
- **Performance**: Drizzle query performance vs current raw SQL
- **Type Safety**: Ensuring all existing queries are properly typed

### Mitigation Strategies
- **Incremental Migration**: Replace services one entity at a time
- **Comprehensive Testing**: Test all endpoints after each migration step
- **Database Backups**: Ensure data safety during schema migrations

## Timeline & Milestones

### Phase 1: Setup (Day 1)
- Install Drizzle dependencies
- Define initial schema
- Setup Drizzle client configuration

### Phase 2: Core Migration (Day 2)  
- Migrate profiles, objectives, initiatives queries
- Update main API endpoints
- Test core functionality

### Phase 3: Authentication (Day 3)
- Integrate Stack with database profiles
- Update authentication hook
- Test complete auth flow

### Phase 4: Polish (Day 4)
- Complete remaining queries
- Production optimization
- Final testing and deployment

## Success Metrics

### Technical Metrics
- **Type Safety**: 100% of database operations are type-safe
- **Performance**: Query response times ≤ current implementation  
- **Error Rate**: Zero database-related errors in production
- **Test Coverage**: All database queries have corresponding tests

### Business Metrics
- **User Experience**: No degradation in app functionality
- **Developer Experience**: Improved type safety and query building
- **Maintenance**: Reduced complexity in database operations

## Acceptance Criteria

### Must Have
- [ ] All database operations use Drizzle ORM
- [ ] Authentication returns real user profiles
- [ ] All existing API endpoints work without changes
- [ ] No TypeScript compilation errors
- [ ] Application builds and deploys successfully

### Should Have  
- [ ] Query performance equals or exceeds current implementation
- [ ] Comprehensive error handling for all database operations
- [ ] Database migrations are reversible
- [ ] All database queries have unit tests

### Nice to Have
- [ ] Database query optimization and indexing
- [ ] Connection pool monitoring and metrics
- [ ] Advanced Drizzle features (prepared statements, etc.)

## Implementation Notes

### Stack Integration Specifics
- Use Stack's `useUser()` hook for authentication state
- Create database profiles automatically on first user login
- Sync Stack user updates with database profile updates
- Maintain Stack's session management while adding database persistence

### Drizzle Best Practices
- Use relations for type-safe joins
- Implement prepared statements for frequently used queries
- Leverage Drizzle's transaction support for complex operations
- Use Drizzle Kit for schema migrations and type generation

This PRD provides a comprehensive roadmap for completing the NeonDB configuration with modern, type-safe tooling that will significantly improve the developer experience and application reliability.