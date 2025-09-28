-- Database Performance Optimization with Indexes and Benchmarks
-- This file contains comprehensive index strategies and performance optimizations
-- for the enhanced onboarding system and OKR management platform
--
-- Version: 1.0
-- Created: 2025-09-28
-- Database: NeonDB with Stack Auth Integration
--
-- =============================================================================
-- OVERVIEW
-- =============================================================================
--
-- This performance optimization strategy includes:
-- 1. Strategic indexes for common query patterns
-- 2. Composite indexes for multi-column queries
-- 3. Partial indexes for filtered queries
-- 4. Covering indexes for read-heavy operations
-- 5. Performance monitoring and benchmarking
-- 6. Query optimization for RLS-enabled tables
-- 7. Materialized views for complex aggregations
--
-- =============================================================================
-- PERFORMANCE PRINCIPLES
-- =============================================================================
--
-- 1. Index Common Patterns: Focus on actual usage patterns
-- 2. Balance Read vs Write: Consider insert/update costs
-- 3. Multi-tenant Optimization: Organization-scoped indexes
-- 4. RLS Performance: Indexes to support policy checks
-- 5. Covering Indexes: Reduce table lookups
-- 6. Partial Indexes: Save space with filtered indexes
-- 7. Monitoring: Track performance metrics and slow queries
--
-- =============================================================================
-- FUNCTION TO DROP EXISTING INDEXES SAFELY
-- =============================================================================

CREATE OR REPLACE FUNCTION drop_index_if_exists(index_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
    RAISE NOTICE 'Dropped index % if it existed', index_name;
END;
$$;

-- =============================================================================
-- CORE PERFORMANCE INDEXES
-- =============================================================================

-- Organizations Table Indexes
SELECT drop_index_if_exists('idx_organizations_perf_lookup');
CREATE INDEX idx_organizations_perf_lookup
ON organizations (id, slug, is_active)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_organizations_industry_size');
CREATE INDEX idx_organizations_industry_size
ON organizations (industry_id, size, is_active)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_organizations_created_by_active');
CREATE INDEX idx_organizations_created_by_active
ON organizations (created_by, is_active, created_at)
WHERE is_active = true;

-- Covering index for organization summary queries
SELECT drop_index_if_exists('idx_organizations_summary_covering');
CREATE INDEX idx_organizations_summary_covering
ON organizations (id, name, slug, size, industry_id, created_at)
WHERE is_active = true;

-- Departments Table Indexes
SELECT drop_index_if_exists('idx_departments_hierarchy_performance');
CREATE INDEX idx_departments_hierarchy_performance
ON departments (organization_id, parent_department_id, level, hierarchy_path)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_departments_org_type_active');
CREATE INDEX idx_departments_org_type_active
ON departments (organization_id, type, is_active)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_departments_head_lookup');
CREATE INDEX idx_departments_head_lookup
ON departments (head_of_department_id, organization_id)
WHERE is_active = true AND head_of_department_id IS NOT NULL;

-- GIN index for hierarchy path searches
SELECT drop_index_if_exists('idx_departments_hierarchy_path_gin');
CREATE INDEX idx_departments_hierarchy_path_gin
ON departments USING gin(hierarchy_path gin_trgm_ops)
WHERE is_active = true;

-- Users Table Indexes
SELECT drop_index_if_exists('idx_users_auth_performance');
CREATE INDEX idx_users_auth_performance
ON users (stack_user_id, is_active, onboarding_completed)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_users_login_tracking');
CREATE INDEX idx_users_login_tracking
ON users (last_login_at DESC, login_count)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_users_onboarding_status');
CREATE INDEX idx_users_onboarding_status
ON users (onboarding_completed, onboarding_completed_at)
WHERE is_active = true;

-- Partial index for recently active users
SELECT drop_index_if_exists('idx_users_recently_active');
CREATE INDEX idx_users_recently_active
ON users (last_login_at DESC, id)
WHERE is_active = true
AND last_login_at > (NOW() - INTERVAL '30 days');

-- User Profiles Table Indexes
SELECT drop_index_if_exists('idx_user_profiles_org_role_dept');
CREATE INDEX idx_user_profiles_org_role_dept
ON user_profiles (organization_id, role, department_id, is_active)
WHERE is_active = true;

SELECT drop_index_if_exists('idx_user_profiles_manager_hierarchy');
CREATE INDEX idx_user_profiles_manager_hierarchy
ON user_profiles (manager_id, organization_id, department_id)
WHERE is_active = true AND manager_id IS NOT NULL;

SELECT drop_index_if_exists('idx_user_profiles_department_members');
CREATE INDEX idx_user_profiles_department_members
ON user_profiles (department_id, role, is_active)
WHERE is_active = true;

-- Covering index for profile summary queries
SELECT drop_index_if_exists('idx_user_profiles_summary_covering');
CREATE INDEX idx_user_profiles_summary_covering
ON user_profiles (user_id, organization_id, role, department_id, job_title, manager_id)
WHERE is_active = true;

-- =============================================================================
-- ONBOARDING PERFORMANCE INDEXES
-- =============================================================================

-- Onboarding Sessions Table Indexes
SELECT drop_index_if_exists('idx_onboarding_sessions_user_status');
CREATE INDEX idx_onboarding_sessions_user_status
ON onboarding_sessions (user_id, status, created_at DESC);

SELECT drop_index_if_exists('idx_onboarding_sessions_status_expiry');
CREATE INDEX idx_onboarding_sessions_status_expiry
ON onboarding_sessions (status, expires_at)
WHERE status IN ('in_progress', 'paused');

SELECT drop_index_if_exists('idx_onboarding_sessions_completion_tracking');
CREATE INDEX idx_onboarding_sessions_completion_tracking
ON onboarding_sessions (status, completion_percentage, updated_at)
WHERE status = 'in_progress';

-- Partial index for active sessions
SELECT drop_index_if_exists('idx_onboarding_sessions_active');
CREATE INDEX idx_onboarding_sessions_active
ON onboarding_sessions (user_id, current_step, total_steps, updated_at)
WHERE status = 'in_progress' AND expires_at > NOW();

-- GIN index for AI analysis and form data searches
SELECT drop_index_if_exists('idx_onboarding_sessions_ai_analysis_gin');
CREATE INDEX idx_onboarding_sessions_ai_analysis_gin
ON onboarding_sessions USING gin(ai_analysis);

SELECT drop_index_if_exists('idx_onboarding_sessions_form_data_gin');
CREATE INDEX idx_onboarding_sessions_form_data_gin
ON onboarding_sessions USING gin(form_data);

-- Onboarding Steps Table Indexes
SELECT drop_index_if_exists('idx_onboarding_steps_session_step');
CREATE INDEX idx_onboarding_steps_session_step
ON onboarding_steps (session_id, step_number, is_completed);

SELECT drop_index_if_exists('idx_onboarding_steps_completion_tracking');
CREATE INDEX idx_onboarding_steps_completion_tracking
ON onboarding_steps (session_id, is_completed, completed_at)
WHERE is_completed = true;

SELECT drop_index_if_exists('idx_onboarding_steps_timing_analysis');
CREATE INDEX idx_onboarding_steps_timing_analysis
ON onboarding_steps (step_name, time_spent_seconds, completed_at)
WHERE is_completed = true AND time_spent_seconds > 0;

-- GIN index for step data analysis
SELECT drop_index_if_exists('idx_onboarding_steps_data_gin');
CREATE INDEX idx_onboarding_steps_data_gin
ON onboarding_steps USING gin(step_data);

-- =============================================================================
-- OKR PERFORMANCE INDEXES
-- =============================================================================

-- Objectives Table Indexes
SELECT drop_index_if_exists('idx_objectives_owner_status_dates');
CREATE INDEX idx_objectives_owner_status_dates
ON objectives (owner_id, status, start_date, end_date)
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_objectives_department_active');
CREATE INDEX idx_objectives_department_active
ON objectives (department_id, status, priority)
WHERE deleted_at IS NULL AND status IN ('active', 'draft');

SELECT drop_index_if_exists('idx_objectives_date_range_active');
CREATE INDEX idx_objectives_date_range_active
ON objectives (start_date, end_date, status)
WHERE deleted_at IS NULL;

-- Covering index for objective listing queries
SELECT drop_index_if_exists('idx_objectives_listing_covering');
CREATE INDEX idx_objectives_listing_covering
ON objectives (id, title, status, priority, progress_percentage, owner_id, department_id, start_date, end_date)
WHERE deleted_at IS NULL;

-- Partial index for current/active objectives
SELECT drop_index_if_exists('idx_objectives_current_active');
CREATE INDEX idx_objectives_current_active
ON objectives (owner_id, priority, progress_percentage)
WHERE deleted_at IS NULL
AND status = 'active'
AND start_date <= CURRENT_DATE
AND end_date >= CURRENT_DATE;

-- Initiatives Table Indexes
SELECT drop_index_if_exists('idx_initiatives_objective_owner_status');
CREATE INDEX idx_initiatives_objective_owner_status
ON initiatives (objective_id, owner_id, status)
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_initiatives_date_range_status');
CREATE INDEX idx_initiatives_date_range_status
ON initiatives (start_date, end_date, status)
WHERE deleted_at IS NULL;

-- Covering index for initiative queries
SELECT drop_index_if_exists('idx_initiatives_covering');
CREATE INDEX idx_initiatives_covering
ON initiatives (id, objective_id, title, status, priority, progress, owner_id)
WHERE deleted_at IS NULL;

-- Activities Table Indexes
SELECT drop_index_if_exists('idx_activities_initiative_assignee_status');
CREATE INDEX idx_activities_initiative_assignee_status
ON activities (initiative_id, assigned_to, status)
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_activities_due_date_status');
CREATE INDEX idx_activities_due_date_status
ON activities (due_date, status, priority)
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_activities_assignee_due_date');
CREATE INDEX idx_activities_assignee_due_date
ON activities (assigned_to, due_date, status)
WHERE deleted_at IS NULL;

-- Partial index for overdue activities
SELECT drop_index_if_exists('idx_activities_overdue');
CREATE INDEX idx_activities_overdue
ON activities (assigned_to, due_date, priority)
WHERE deleted_at IS NULL
AND status NOT IN ('completed', 'cancelled')
AND due_date < CURRENT_DATE;

-- Key Results Table Indexes
SELECT drop_index_if_exists('idx_key_results_objective_owner');
CREATE INDEX idx_key_results_objective_owner
ON key_results (objective_id, owner_id, status)
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_key_results_progress_tracking');
CREATE INDEX idx_key_results_progress_tracking
ON key_results (objective_id, progress_percentage, status)
WHERE deleted_at IS NULL;

-- Covering index for key results summary
SELECT drop_index_if_exists('idx_key_results_summary_covering');
CREATE INDEX idx_key_results_summary_covering
ON key_results (id, objective_id, title, target_value, current_value, progress_percentage, status)
WHERE deleted_at IS NULL;

-- =============================================================================
-- SPECIALIZED PERFORMANCE INDEXES
-- =============================================================================

-- Multi-tenant queries optimization
SELECT drop_index_if_exists('idx_multi_tenant_objectives');
CREATE INDEX idx_multi_tenant_objectives
ON objectives (department_id, status, start_date, end_date, owner_id)
WHERE deleted_at IS NULL;

-- RLS policy performance optimization
SELECT drop_index_if_exists('idx_rls_user_org_lookup');
CREATE INDEX idx_rls_user_org_lookup
ON user_profiles (user_id, organization_id, role, is_active)
WHERE is_active = true;

-- Audit trail optimization
SELECT drop_index_if_exists('idx_audit_created_updated');
CREATE INDEX idx_audit_created_updated
ON objectives (created_at DESC, updated_at DESC)
WHERE deleted_at IS NULL;

-- Search optimization indexes (using GIN for text search)
SELECT drop_index_if_exists('idx_objectives_text_search');
CREATE INDEX idx_objectives_text_search
ON objectives USING gin(to_tsvector('spanish', title || ' ' || COALESCE(description, '')))
WHERE deleted_at IS NULL;

SELECT drop_index_if_exists('idx_initiatives_text_search');
CREATE INDEX idx_initiatives_text_search
ON initiatives USING gin(to_tsvector('spanish', title || ' ' || COALESCE(description, '')))
WHERE deleted_at IS NULL;

-- =============================================================================
-- MATERIALIZED VIEWS FOR COMPLEX AGGREGATIONS
-- =============================================================================

-- Organization performance summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_organization_performance AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT up.user_id) as total_users,
    COUNT(DISTINCT d.id) as total_departments,
    COUNT(DISTINCT obj.id) as total_objectives,
    COUNT(DISTINCT CASE WHEN obj.status = 'active' THEN obj.id END) as active_objectives,
    AVG(obj.progress_percentage) as avg_objective_progress,
    COUNT(DISTINCT i.id) as total_initiatives,
    COUNT(DISTINCT a.id) as total_activities,
    NOW() as last_updated
FROM organizations o
LEFT JOIN user_profiles up ON o.id = up.organization_id AND up.is_active = true
LEFT JOIN departments d ON o.id = d.organization_id AND d.is_active = true
LEFT JOIN objectives obj ON o.id = (
    SELECT up2.organization_id
    FROM user_profiles up2
    WHERE up2.user_id = obj.owner_id
) AND obj.deleted_at IS NULL
LEFT JOIN initiatives i ON obj.id = i.objective_id AND i.deleted_at IS NULL
LEFT JOIN activities a ON i.id = a.initiative_id AND a.deleted_at IS NULL
WHERE o.is_active = true
GROUP BY o.id, o.name;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_mv_organization_performance_org_id
ON mv_organization_performance (organization_id);

-- Department performance summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_department_performance AS
SELECT
    d.id as department_id,
    d.organization_id,
    d.name as department_name,
    d.type as department_type,
    COUNT(DISTINCT up.user_id) as total_members,
    COUNT(DISTINCT obj.id) as total_objectives,
    AVG(obj.progress_percentage) as avg_objective_progress,
    COUNT(DISTINCT CASE WHEN obj.status = 'active' THEN obj.id END) as active_objectives,
    COUNT(DISTINCT i.id) as total_initiatives,
    COUNT(DISTINCT a.id) as total_activities,
    NOW() as last_updated
FROM departments d
LEFT JOIN user_profiles up ON d.id = up.department_id AND up.is_active = true
LEFT JOIN objectives obj ON d.id = obj.department_id AND obj.deleted_at IS NULL
LEFT JOIN initiatives i ON obj.id = i.objective_id AND i.deleted_at IS NULL
LEFT JOIN activities a ON i.id = a.initiative_id AND a.deleted_at IS NULL
WHERE d.is_active = true
GROUP BY d.id, d.organization_id, d.name, d.type;

-- Create unique index on department performance view
CREATE UNIQUE INDEX idx_mv_department_performance_dept_id
ON mv_department_performance (department_id);

-- Onboarding analytics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_onboarding_analytics AS
SELECT
    DATE_TRUNC('day', os.created_at) as date,
    COUNT(*) as sessions_started,
    COUNT(CASE WHEN os.status = 'completed' THEN 1 END) as sessions_completed,
    COUNT(CASE WHEN os.status = 'abandoned' THEN 1 END) as sessions_abandoned,
    AVG(os.completion_percentage) as avg_completion_percentage,
    AVG(CASE WHEN os.status = 'completed' THEN os.actual_completion_time END) as avg_completion_time_minutes,
    COUNT(DISTINCT os.user_id) as unique_users
FROM onboarding_sessions os
WHERE os.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', os.created_at)
ORDER BY date DESC;

-- Create unique index on onboarding analytics view
CREATE UNIQUE INDEX idx_mv_onboarding_analytics_date
ON mv_onboarding_analytics (date);

-- =============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    result_message TEXT;
BEGIN
    start_time := NOW();

    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_department_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_onboarding_analytics;

    result_message := 'All materialized views refreshed successfully in ' ||
                     EXTRACT(EPOCH FROM (NOW() - start_time)) || ' seconds';

    RETURN result_message;
END;
$$;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_performance_tables()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    tables_analyzed TEXT[];
BEGIN
    start_time := NOW();

    -- Analyze core tables
    ANALYZE organizations;
    ANALYZE departments;
    ANALYZE users;
    ANALYZE user_profiles;
    ANALYZE onboarding_sessions;
    ANALYZE onboarding_steps;
    ANALYZE objectives;
    ANALYZE initiatives;
    ANALYZE activities;
    ANALYZE key_results;

    tables_analyzed := ARRAY[
        'organizations', 'departments', 'users', 'user_profiles',
        'onboarding_sessions', 'onboarding_steps', 'objectives',
        'initiatives', 'activities', 'key_results'
    ];

    RETURN 'Analyzed ' || array_length(tables_analyzed, 1) || ' tables in ' ||
           EXTRACT(EPOCH FROM (NOW() - start_time)) || ' seconds';
END;
$$;

-- Function to get slow query analysis
CREATE OR REPLACE FUNCTION get_performance_summary()
RETURNS TABLE (
    table_name TEXT,
    total_rows BIGINT,
    index_count INTEGER,
    last_analyze TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        schemaname || '.' || tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as total_rows,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = pgst.relname) as index_count,
        last_analyze
    FROM pg_stat_user_tables pgst
    WHERE schemaname = 'public'
    AND tablename IN (
        'organizations', 'departments', 'users', 'user_profiles',
        'onboarding_sessions', 'onboarding_steps', 'objectives',
        'initiatives', 'activities', 'key_results'
    )
    ORDER BY total_rows DESC;
END;
$$;

-- =============================================================================
-- BENCHMARK QUERIES
-- =============================================================================

-- Benchmark: User organization lookup (most common query)
CREATE OR REPLACE FUNCTION benchmark_user_org_lookup(iterations INTEGER DEFAULT 1000)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    sample_user_id UUID;
    i INTEGER;
    result_count INTEGER;
BEGIN
    -- Get a sample user ID
    SELECT id INTO sample_user_id FROM users WHERE is_active = true LIMIT 1;

    IF sample_user_id IS NULL THEN
        RETURN 'No active users found for benchmarking';
    END IF;

    start_time := clock_timestamp();

    FOR i IN 1..iterations LOOP
        SELECT COUNT(*) INTO result_count
        FROM user_profiles up
        JOIN users u ON u.id = up.user_id
        WHERE u.id = sample_user_id
        AND up.is_active = true;
    END LOOP;

    end_time := clock_timestamp();

    RETURN 'User org lookup benchmark: ' || iterations || ' iterations in ' ||
           EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 || ' ms (avg: ' ||
           (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 / iterations) || ' ms/query)';
END;
$$;

-- Benchmark: Objectives listing for user (common dashboard query)
CREATE OR REPLACE FUNCTION benchmark_objectives_listing(iterations INTEGER DEFAULT 100)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    sample_user_id UUID;
    i INTEGER;
    result_count INTEGER;
BEGIN
    -- Get a sample user ID
    SELECT id INTO sample_user_id FROM users WHERE is_active = true LIMIT 1;

    IF sample_user_id IS NULL THEN
        RETURN 'No active users found for benchmarking';
    END IF;

    start_time := clock_timestamp();

    FOR i IN 1..iterations LOOP
        SELECT COUNT(*) INTO result_count
        FROM objectives obj
        WHERE obj.owner_id = sample_user_id
        AND obj.deleted_at IS NULL
        AND obj.status IN ('active', 'draft')
        ORDER BY obj.priority DESC, obj.created_at DESC;
    END LOOP;

    end_time := clock_timestamp();

    RETURN 'Objectives listing benchmark: ' || iterations || ' iterations in ' ||
           EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 || ' ms (avg: ' ||
           (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000 / iterations) || ' ms/query)';
END;
$$;

-- =============================================================================
-- AUTOMATED MAINTENANCE
-- =============================================================================

-- Function for automated index maintenance
CREATE OR REPLACE FUNCTION automated_maintenance()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    maintenance_log TEXT := '';
    start_time TIMESTAMP;
BEGIN
    start_time := NOW();
    maintenance_log := 'Starting automated maintenance at ' || start_time || E'\n';

    -- Refresh materialized views
    BEGIN
        PERFORM refresh_performance_views();
        maintenance_log := maintenance_log || 'Materialized views refreshed' || E'\n';
    EXCEPTION WHEN OTHERS THEN
        maintenance_log := maintenance_log || 'Error refreshing views: ' || SQLERRM || E'\n';
    END;

    -- Analyze tables
    BEGIN
        PERFORM analyze_performance_tables();
        maintenance_log := maintenance_log || 'Tables analyzed' || E'\n';
    EXCEPTION WHEN OTHERS THEN
        maintenance_log := maintenance_log || 'Error analyzing tables: ' || SQLERRM || E'\n';
    END;

    -- Clean up old audit logs (keep last 90 days)
    BEGIN
        DELETE FROM rls_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
        GET DIAGNOSTICS maintenance_log = ROW_COUNT;
        maintenance_log := maintenance_log || 'Cleaned up ' || maintenance_log || ' old audit records' || E'\n';
    EXCEPTION WHEN OTHERS THEN
        maintenance_log := maintenance_log || 'Error cleaning audit logs: ' || SQLERRM || E'\n';
    END;

    maintenance_log := maintenance_log || 'Maintenance completed in ' ||
                      EXTRACT(EPOCH FROM (NOW() - start_time)) || ' seconds';

    RETURN maintenance_log;
END;
$$;

-- =============================================================================
-- COMPLETION AND CLEANUP
-- =============================================================================

-- Drop the temporary function
DROP FUNCTION IF EXISTS drop_index_if_exists(TEXT);

-- Create a summary of all performance optimizations
CREATE OR REPLACE VIEW performance_optimization_summary AS
SELECT
    'Index Count' as metric,
    COUNT(*)::TEXT as value
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Materialized Views' as metric,
    COUNT(*)::TEXT as value
FROM pg_matviews
WHERE schemaname = 'public'

UNION ALL

SELECT
    'Performance Functions' as metric,
    COUNT(*)::TEXT as value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%performance%' OR p.proname LIKE '%benchmark%';

-- Grant necessary permissions
GRANT SELECT ON performance_optimization_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_performance_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary() TO authenticated;

-- =============================================================================
-- FINAL PERFORMANCE VALIDATION
-- =============================================================================

-- Run initial analysis
SELECT analyze_performance_tables();

-- Run initial view refresh
SELECT refresh_performance_views();

-- Generate performance summary
SELECT * FROM performance_optimization_summary;

SELECT 'Database performance optimization completed successfully' AS result;