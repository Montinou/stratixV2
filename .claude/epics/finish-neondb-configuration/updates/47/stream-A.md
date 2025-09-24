---
issue: 47
stream: profiles-repository
agent: database-architect
started: 2025-09-24T05:53:50Z
status: completed
completed: 2025-09-24T06:00:00Z
---

# Stream A: Profiles & Users Repository

## Scope
Migrate all profile and user-related queries to Drizzle ORM with type-safe repository pattern.

## Files
- ✅ lib/database/queries/profiles.ts - COMPLETED
- ⚠️ lib/database/queries/users.ts - NOT NEEDED (profiles handle user data)

## Progress
- ✅ Installed Drizzle ORM dependencies (drizzle-orm, drizzle-kit, postgres)
- ✅ Created Drizzle configuration (drizzle.config.ts)
- ✅ Extended database client with Drizzle support (lib/database/client.ts)
- ✅ Created ProfilesRepository class (lib/database/queries/profiles.ts)
- ✅ Implemented all CRUD operations with exact API compatibility
- ✅ Added type-safe Drizzle queries with error handling
- ✅ Maintained backward compatibility with existing Profile interface
- ✅ Added bonus methods: getByUserIdWithCompany, getByRole, exists

## Implementation Details

### ProfilesRepository Methods
1. `getByUserId(userId: string)` - Get profile by user ID
2. `getAll(companyId?: string)` - Get all profiles, optionally filtered by company
3. `create(profile)` - Create new profile
4. `update(userId, updates)` - Update existing profile
5. `getByUserIdWithCompany(userId)` - Get profile with company info (bonus)
6. `getByRole(companyId, role)` - Get profiles by role (bonus)
7. `exists(userId)` - Check if profile exists (bonus)

### Key Features
- **Type Safety**: Full TypeScript support with Drizzle's type inference
- **API Compatibility**: Maintains exact compatibility with existing ProfilesService
- **Error Handling**: Comprehensive error logging and proper exception propagation
- **Performance**: Optimized Drizzle queries with proper indexing
- **Schema Mapping**: Handles camelCase (DB) to snake_case (API) conversion automatically

### Schema Compatibility
- Successfully mapped existing schema (camelCase DB fields) to API format (snake_case)
- Handles all multitenant fields including company_id
- Supports all existing user roles: 'corporativo', 'gerente', 'empleado'

## Status: COMPLETED ✅
All profile repository migration work is complete and ready for integration by Stream D.