---
issue: 47
title: Core Entity Query Migration
analyzed: 2025-09-24T05:22:23Z
estimated_hours: 8
parallelization_factor: 3.5
---

# Parallel Work Analysis: Issue #47

## Overview
Migrate existing raw SQL queries in lib/database/services.ts to Drizzle ORM with repository pattern implementation. This involves creating type-safe query repositories for each entity while maintaining full API compatibility.

## Parallel Streams

### Stream A: Profiles & Users Repository
**Scope**: Migrate all profile and user-related queries to Drizzle
**Files**:
- lib/database/queries/profiles.ts
- lib/database/queries/users.ts (if needed)
**Agent Type**: database-specialist (general-purpose)
**Can Start**: immediately (after #46 completion)
**Estimated Hours**: 2.5
**Dependencies**: Issue #46 (schema definition)

### Stream B: Objectives Repository
**Scope**: Migrate objectives queries with proper relations to initiatives and activities
**Files**:
- lib/database/queries/objectives.ts
**Agent Type**: database-specialist (general-purpose)
**Can Start**: immediately (after #46 completion)
**Estimated Hours**: 2.5
**Dependencies**: Issue #46 (schema definition)

### Stream C: Initiatives Repository  
**Scope**: Migrate initiatives queries with activity tracking and objective relationships
**Files**:
- lib/database/queries/initiatives.ts
**Agent Type**: database-specialist (general-purpose)
**Can Start**: immediately (after #46 completion)
**Estimated Hours**: 2.0
**Dependencies**: Issue #46 (schema definition)

### Stream D: Activities Repository & Services Integration
**Scope**: Migrate activities queries and integrate all repositories into services.ts
**Files**:
- lib/database/queries/activities.ts
- lib/database/services.ts (refactor)
- lib/database/index.ts (exports)
**Agent Type**: integration-specialist (general-purpose)
**Can Start**: after Streams A, B, C complete
**Estimated Hours**: 3.0
**Dependencies**: Streams A, B, C

## Coordination Points

### Shared Files
- `lib/database/index.ts` - Stream D (consolidates all exports)
- `lib/database/services.ts` - Stream D (integrates all repositories)

### Sequential Requirements
1. Schema definition (#46) must be complete before any stream starts
2. Individual repositories (A, B, C) before services integration (D)
3. Type definitions from schema before repository implementations
4. All repositories complete before API compatibility testing

## Conflict Risk Assessment
- **Low Risk**: Each stream works on separate repository files
- **Medium Risk**: Stream D touches shared integration files
- **Low Risk**: All streams use same schema but different table operations

## Parallelization Strategy

**Recommended Approach**: hybrid

Launch Streams A, B, C simultaneously after #46 completes. These can work independently on separate entity repositories. Start Stream D when A, B, C are all complete for final integration and API compatibility testing.

## Expected Timeline

With parallel execution:
- Wall time: 5.5 hours (2.5h for A/B/C + 3h for D)
- Total work: 10 hours
- Efficiency gain: 45%

Without parallel execution:
- Wall time: 10 hours (sequential completion)

## Notes
- Each repository stream should include comprehensive error handling
- Maintain exact API response formats during migration
- Focus on type safety improvements while preserving functionality
- Stream D is critical for API compatibility validation
- All streams must preserve existing performance characteristics
- Consider adding repository-level unit tests during implementation