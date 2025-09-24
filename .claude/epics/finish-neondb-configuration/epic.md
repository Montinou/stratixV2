---
name: finish-neondb-configuration
status: backlog
updated: 2025-09-24T04:53:16Z
progress: 0%
prd: .claude/prds/finish-neondb-configuration.md
github: https://github.com/Montinou/stratixV2/issues/45
---

# Epic: finish-neondb-configuration

## Overview
Complete NeonDB migration by implementing Drizzle ORM for type-safe database operations and fully integrating Stack (NeonAuth) authentication with database-backed user profiles. This epic focuses on replacing raw PostgreSQL queries with a modern, type-safe ORM while ensuring seamless authentication integration.

## Architecture Decisions
- **Drizzle ORM**: Replace raw `pg` client with Drizzle for type-safe operations and better developer experience
- **Schema-First Approach**: Define database schema in TypeScript with auto-generated types
- **Repository Pattern**: Organize queries by entity in `lib/database/queries/` for maintainable code structure
- **Stack Integration**: Connect Stack authentication with database profiles for persistent user data
- **Connection Pooling**: Maintain optimized PostgreSQL connections for production performance

## Technical Approach
### Database Layer
- Implement complete Drizzle schema covering users, profiles, companies, objectives, initiatives, activities
- Replace all raw SQL in `lib/database/services.ts` with type-safe Drizzle queries
- Maintain existing API compatibility while upgrading underlying implementation
- Setup Drizzle Kit for migrations and type generation

### Authentication Integration
- Update `use-auth` hook to return actual database profiles instead of mock data
- Implement automatic profile creation/sync with Stack users
- Connect Stack's session management with database profile persistence
- Maintain existing authentication flow patterns

### Infrastructure
- Configure Drizzle client with optimized connection pooling
- Implement comprehensive error handling for all database operations
- Setup migration system with rollback capabilities
- Optimize for production deployment with proper environment configuration

## Implementation Strategy
- **Incremental Migration**: Replace database services one entity at a time to minimize risk
- **API Compatibility**: Maintain existing endpoint contracts during transition
- **Testing Strategy**: Comprehensive testing after each migration phase
- **Rollback Plan**: Ability to revert to current PostgreSQL implementation if needed

## Task Breakdown Preview
High-level task categories that will be created:
- [ ] **Drizzle Setup**: Install dependencies, configure client, define initial schema
- [ ] **Core Schema Migration**: Migrate profiles, objectives, initiatives to Drizzle queries  
- [ ] **Authentication Integration**: Connect Stack users with database profiles
- [ ] **API Layer Updates**: Update all API routes to use Drizzle queries
- [ ] **Production Optimization**: Error handling, logging, performance tuning

## Dependencies
- **External Dependencies**: `drizzle-orm`, `drizzle-kit`, `postgres` packages
- **Internal Dependencies**: Existing Stack authentication system integration
- **Database Dependencies**: NeonDB PostgreSQL 17.5 instance with proper connection configuration

## Success Criteria (Technical)
- **Type Safety**: 100% of database operations use type-safe Drizzle queries
- **Authentication**: Real user profiles returned from database instead of mock data
- **Compatibility**: All existing API endpoints maintain current functionality
- **Build Success**: Zero TypeScript errors and successful deployment pipeline
- **Performance**: Query response times equal or better than current implementation

## Tasks Created
- [ ] #46 - Drizzle ORM Setup and Schema Definition (parallel: true)
- [ ] #47 - Core Entity Query Migration (parallel: false, depends: 46)
- [ ] #48 - Stack Authentication Integration (parallel: false, depends: 47)
- [ ] #49 - API Layer Updates and Testing (parallel: false, depends: 47,48)
- [ ] #50 - Production Optimization and Deployment (parallel: false, depends: 49)

Total tasks: 5
Parallel tasks: 1
Sequential tasks: 4
Estimated total effort: 12-16 hours

## Estimated Effort
- **Overall Timeline**: 2-3 development days
- **Critical Path**: Database schema definition → Query migration → Authentication integration
- **Resource Requirements**: Database migration expertise, TypeScript proficiency
- **Risk Factor**: Medium (incremental approach minimizes breaking changes)