# Database Schema Extensions Analysis (#62)

## Issue Overview
**Task**: Database Schema Extensions
**GitHub Issue**: [#62](https://github.com/Montinou/stratixV2/issues/62)
**Type**: Database Schema
**Status**: Open
**Parallel**: Yes (independent of AI client setup)
**Size**: S (8-16 hours)

## Parallel Work Streams Analysis

Based on the issue requirements and existing NeonDB architecture patterns, the Database Schema Extensions can be broken down into 4 parallel work streams:

### Stream A: AI Interactions Table Implementation
**Agent Type**: `database-architect`
**Duration**: 2-4 hours
**Priority**: High

**Scope**:
- Create `ai_interactions` table with proper schema
- Implement foreign key relationships to `users` and `organizations`
- Add strategic indexes for performance optimization
- Set up cost tracking fields for budget management

**Database Objects**:
```sql
-- Core table
ai_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  type VARCHAR(50), -- 'template', 'chat', 'insights'
  request_data JSONB,
  response_data JSONB,
  cost_cents INTEGER,
  status VARCHAR(20), -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Indexes
idx_ai_interactions_user_id (user_id)
idx_ai_interactions_org_id (organization_id)
idx_ai_interactions_type (type)
idx_ai_interactions_created (created_at)
```

**Dependencies**:
- Existing `users` table schema
- Existing `organizations` table schema (needs verification)
- Understanding current RLS policies

**Risk Assessment**: Medium
- Schema changes require careful coordination with existing auth structure
- Foreign key constraints need proper validation
- Performance impact on existing queries

### Stream B: AI Cache Table Implementation
**Agent Type**: `database-architect`
**Duration**: 2-3 hours
**Priority**: High

**Scope**:
- Create `ai_cache` table for intelligent response caching
- Implement TTL (Time To Live) management system
- Add cache performance tracking (hit_count)
- Design efficient cache key strategy

**Database Objects**:
```sql
-- Core table
ai_cache (
  id UUID PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE,
  response_data JSONB,
  cost_cents INTEGER,
  hit_count INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  last_accessed TIMESTAMP
)

-- Indexes
idx_ai_cache_key (cache_key) -- B-tree for exact lookups
idx_ai_cache_expires (expires_at) -- B-tree for cleanup queries
```

**Dependencies**:
- Independent of other tables (no foreign keys)
- Requires cleanup mechanism design

**Risk Assessment**: Low
- Self-contained table with no complex relationships
- Standard caching patterns
- Minimal impact on existing system

### Stream C: Migration Scripts & Procedures
**Agent Type**: `database-architect`
**Duration**: 3-4 hours
**Priority**: Critical

**Scope**:
- Create forward migration scripts following NeonDB patterns
- Implement rollback procedures for safety
- Follow existing migration numbering (006_add_ai_extensions_neondb.sql)
- Integration with existing migration infrastructure

**Migration Files**:
```bash
# Forward migration
@scripts/migrations/006_add_ai_extensions_neondb.sql

# Rollback script
@scripts/rollback/rollback_006_ai_extensions_neondb.sql

# Validation script
@scripts/validation/validate_ai_extensions.sql
```

**Dependencies**:
- Existing migration script infrastructure (`run_migration_neondb.sh`)
- Current database state validation
- Understanding of existing rollback patterns

**Risk Assessment**: Medium
- Critical path for deployment
- Must integrate with existing CI/CD
- Rollback safety is paramount

### Stream D: Database Services & Functions
**Agent Type**: `database-architect`
**Duration**: 2-3 hours
**Priority**: Medium

**Scope**:
- Create database query functions for AI operations
- Implement cache expiration and cleanup mechanisms
- Add proper permissions and security policies (RLS)
- Design connection handling patterns

**Database Functions**:
```sql
-- Cache management
CREATE FUNCTION cleanup_expired_ai_cache() RETURNS void
CREATE FUNCTION get_cache_hit_rate() RETURNS numeric

-- Cost tracking
CREATE FUNCTION calculate_ai_costs(user_id UUID, date_range) RETURNS numeric
CREATE FUNCTION get_organization_ai_usage(org_id UUID) RETURNS table

-- Maintenance
CREATE FUNCTION ai_cache_maintenance() RETURNS void
```

**Dependencies**:
- Completed Stream A & B (table creation)
- Understanding existing RLS patterns
- Integration with Stack Auth system

**Risk Assessment**: Low-Medium
- Builds on completed table structures
- Standard PostgreSQL function patterns
- Can be implemented incrementally

## Integration Analysis

### Compatibility with Existing NeonDB Setup

**Existing Schema Pattern** (from `lib/database/schema.ts`):
- Drizzle ORM with `pgTable` definitions
- Stack Auth integration via `stackUserId` fields
- Multi-tenancy support with `tenantId` fields
- Row Level Security (RLS) policies
- Standard enum types and relations

**AI Schema Integration Strategy**:
1. **Follow existing patterns**: Use same UUID, timestamp, and enum conventions
2. **Maintain Stack Auth compatibility**: Reference `users.id` that links to Stack Auth
3. **Preserve multi-tenancy**: Add `tenantId` to AI tables for organization isolation
4. **Extend RLS policies**: Apply similar security patterns to AI tables

### Required Schema Modifications

**Missing Organization Structure**:
- Issue references `organizations` table but current schema uses `companies`
- Need to clarify: Use existing `companies` table or create new `organizations`
- Recommendation: Use existing `companies.id` for consistency

**Updated AI Interactions Schema**:
```sql
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- Use existing companies
    tenant_id UUID NOT NULL, -- Multi-tenancy support
    type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    response_data JSONB,
    cost_cents INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete pattern
);
```

## PostgreSQL 17.5 Compatibility

**Verified Compatible Features**:
- ✅ UUID generation with `gen_random_uuid()`
- ✅ JSONB data type for flexible AI data storage
- ✅ Advanced indexing (B-tree, GIN for JSONB)
- ✅ Row Level Security (RLS) policies
- ✅ Timestamp with timezone support
- ✅ Custom function creation

**Optimization Opportunities**:
- Use GIN indexes for JSONB columns with search requirements
- Consider partitioning for large AI interaction datasets
- Implement proper VACUUM and ANALYZE strategies

## Security & Permissions Strategy

**Row Level Security Policies**:

```sql
-- AI Interactions RLS
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
  );

CREATE POLICY "Corporativo can view company AI interactions" ON ai_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND p.company_id = ai_interactions.company_id
      AND p.role_type = 'corporativo'
    )
  );
```

## Performance Considerations

**Index Strategy**:
- `ai_interactions`: Focus on user_id, company_id, type, created_at
- `ai_cache`: Optimize for cache_key lookups and expiration cleanup
- Consider composite indexes for common query patterns

**Data Retention**:
- Implement automatic cleanup for old AI interactions (90+ days)
- Cache entries should expire based on TTL
- Soft delete for audit trail maintenance

## Risk Assessment Summary

### High-Risk Areas:
- **Foreign key relationships**: Must align with existing auth structure
- **Migration rollback**: Critical for production safety
- **Performance impact**: AI tables could grow rapidly

### Medium-Risk Areas:
- **RLS policy complexity**: Advanced policies for multi-tenant access
- **Schema evolution**: Future AI feature requirements

### Low-Risk Areas:
- **Cache table implementation**: Standard caching patterns
- **Database functions**: Incremental additions
- **Index optimization**: Can be adjusted post-deployment

## Recommended Implementation Order

1. **Stream C** (Migration Scripts) - Establish framework
2. **Stream A** (AI Interactions) - Core functionality
3. **Stream B** (AI Cache) - Performance optimization
4. **Stream D** (Database Services) - Advanced features

## Success Criteria

- [ ] All tables created following existing NeonDB patterns
- [ ] Foreign key relationships properly established and tested
- [ ] RLS policies implemented and validated with different user roles
- [ ] Migration scripts tested with rollback capability
- [ ] Performance validated with sample data
- [ ] Integration with existing Stack Auth system confirmed
- [ ] Documentation updated to reflect schema changes

## Next Steps

1. **Verify organization/company table structure** - Clarify naming convention
2. **Create detailed migration scripts** - Following numbered sequence
3. **Implement parallel development** - 4 agents can work simultaneously
4. **Establish testing protocols** - Sample data and performance validation
5. **Plan deployment strategy** - Staging environment validation

This analysis confirms the issue can be effectively parallelized into 4 independent streams while maintaining compatibility with the existing NeonDB Stack Auth architecture.