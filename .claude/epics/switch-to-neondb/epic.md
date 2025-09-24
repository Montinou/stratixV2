---
name: switch-to-neondb
status: backlog
created: 2025-09-23T20:37:40Z
progress: 0%
prd: .claude/prds/switch-to-neondb.md
github: https://github.com/Montinou/stratixV2/issues/3
---

# Epic: Switch to NeonDB

## Overview

Complete migration from Supabase to NeonDB with total dependency removal. This implementation focuses on schema-only migration using NeonAuth for authentication, @scripts/ for automated migrations, and comprehensive codebase updates to replace all Supabase clients with NeonDB PostgreSQL connections. The approach prioritizes minimal disruption while achieving complete vendor migration.

## Architecture Decisions

- **Database**: NeonDB PostgreSQL with serverless scaling
- **Authentication**: NeonAuth following Next.js quick start guide (https://neon.com/docs/neon-auth/quick-start/nextjs)
- **Migration Strategy**: SQL DDL scripts in @scripts/ directory with CI/CD automation
- **Database Client**: Direct PostgreSQL client (pg) replacing Supabase client
- **Schema Management**: Version-controlled SQL scripts for reproducible deployments
- **Environment Strategy**: Environment variables for connection strings, no complex configuration
- **Rollback Strategy**: Git-based rollback with environment variable switching

## Technical Approach

### Frontend Components
- **Authentication Provider**: Replace Supabase AuthProvider with NeonAuth implementation
- **Database Hooks**: Update custom hooks (use-auth.tsx) to work with NeonAuth
- **API Calls**: No changes needed - API endpoints handle database abstraction
- **Environment Config**: Update environment variables for NeonDB connection

### Backend Services
- **Database Client**: Replace @supabase/supabase-js with node-postgres (pg)
- **API Routes**: Update all /app/api/ routes to use PostgreSQL client
- **Authentication Middleware**: Implement NeonAuth middleware following Next.js guide
- **Connection Pooling**: Use built-in PostgreSQL connection pooling
- **Schema Management**: SQL DDL scripts in @scripts/ for table creation and indexes

### Infrastructure
- **Database**: NeonDB instance with production/staging environments
- **Deployment**: Vercel with automatic schema migration in build process
- **Monitoring**: Database connection monitoring and query performance
- **Environment Variables**: NEON_DATABASE_URL, NEON_AUTH_SECRET
- **CI/CD Integration**: Run @scripts/ migrations automatically on deployment

## Implementation Strategy

### Development Phases
1. **Setup Phase**: NeonDB instance + environment configuration
2. **Authentication Phase**: NeonAuth implementation + testing
3. **Database Phase**: Client replacement + schema migration
4. **Integration Phase**: CI/CD integration + comprehensive testing
5. **Cleanup Phase**: Remove all Supabase dependencies

### Risk Mitigation
- **Staging Environment**: Full testing before production deployment
- **Rollback Plan**: Keep Supabase environment variables until validation complete
- **Schema Validation**: Automated tests to verify schema integrity
- **Connection Testing**: Health checks for database connectivity

### Testing Approach
- **Unit Tests**: Database client functions with mock connections
- **Integration Tests**: API endpoint testing with test database
- **E2E Tests**: Full application flow with NeonDB
- **Performance Tests**: Query performance benchmarking

## Task Breakdown Preview

High-level task categories that will be created:
- [ ] **NeonDB Setup**: Create instance, configure environments, get connection strings
- [ ] **Schema Migration**: Export Supabase schema, create @scripts/ migrations, test schema creation
- [ ] **NeonAuth Implementation**: Follow quick start guide, replace authentication system, update hooks
- [ ] **Database Client Migration**: Replace Supabase client, update all API routes, test connections
- [ ] **Package Dependencies**: Remove Supabase packages, add PostgreSQL packages, update imports
- [ ] **Environment Configuration**: Update all environment variables, configuration files
- [ ] **CI/CD Integration**: Add migration scripts to deployment pipeline, test automation
- [ ] **Testing & Validation**: Comprehensive testing, performance validation, security testing
- [ ] **Documentation & Cleanup**: Update docs, remove unused code, final verification

## Dependencies

### External Dependencies
- **NeonDB Service**: Database instance provisioning and availability
- **NeonAuth Service**: Authentication service integration
- **Vercel Platform**: Deployment platform for CI/CD integration

### Internal Dependencies
- **Current Supabase Schema**: Must export complete schema structure
- **Existing Authentication Flow**: Understanding current auth implementation
- **API Route Structure**: All database-dependent API routes must be identified
- **Environment Variables**: Current production/staging environment access

### Prerequisite Work
- **Schema Export**: Complete SQL DDL export from current Supabase instance
- **Dependency Audit**: Identify all files importing from Supabase
- **Environment Planning**: Plan environment variable migration strategy

## Success Criteria (Technical)

### Performance Benchmarks
- **Query Performance**: ≥20% improvement in average response time
- **Connection Latency**: <100ms database connection establishment
- **Build Time**: CI/CD migrations complete within existing build time limits

### Quality Gates
- **Zero Breaking Changes**: All existing API endpoints function identically
- **Complete Migration**: 100% Supabase dependency removal
- **Schema Integrity**: All foreign keys, indexes, and constraints preserved
- **Authentication Parity**: All auth features work without degradation

### Acceptance Criteria
- **Functional Testing**: All OKR management features work correctly
- **Performance Testing**: No degradation in application responsiveness
- **Security Testing**: Authentication and authorization work as expected
- **Rollback Testing**: Can revert to Supabase within 1 hour if needed

## Estimated Effort

### Overall Timeline: 1.5 weeks
- **Setup & Preparation**: 3 days
- **Implementation**: 1 week  
- **Validation & Cleanup**: 2 days

### Resource Requirements
- **Primary Developer**: 1 full-time developer for implementation
- **DevOps Support**: 2-3 hours for CI/CD pipeline integration
- **Testing Time**: 1 day comprehensive testing across all environments

### Critical Path Items
1. **NeonDB Instance Setup**: Required before any development can begin
2. **Schema Migration**: Must complete before authentication changes
3. **NeonAuth Implementation**: Required before database client migration
4. **Complete Dependency Replacement**: Must finish before production deployment
5. **CI/CD Integration**: Required for automated deployments

### Risk Factors
- **Authentication Complexity**: NeonAuth implementation may require additional time
- **Schema Differences**: Potential PostgreSQL/Supabase compatibility issues
- **Dependency Conflicts**: Package conflicts during migration phase
- **Testing Coverage**: Ensuring all edge cases are covered

## Tasks Created
- [ ] 001.md - Setup NeonDB Instance and Environment (parallel: false)
- [ ] 002.md - Export Schema and Create Migration Scripts (parallel: false)
- [ ] 003.md - Implement NeonAuth Authentication (parallel: true)
- [ ] 004.md - Replace Database Client Throughout Codebase (parallel: false)
- [ ] 005.md - Update Package Dependencies and Imports (parallel: true)
- [ ] 006.md - Update Environment Configuration (parallel: true)
- [ ] 007.md - Integrate CI/CD Migration Automation (parallel: true)
- [ ] 008.md - Comprehensive Testing and Validation (parallel: false)

Total tasks: 8
Parallel tasks: 4
Sequential tasks: 4
Estimated total effort: 49-67 hours (1.5-2 weeks)

This epic provides a complete technical roadmap for migrating StratixV2 from Supabase to NeonDB while maintaining application stability and achieving performance improvements.