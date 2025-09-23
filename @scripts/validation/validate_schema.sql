-- Schema Validation for StratixV2 Migration
-- Validates that all required tables, indexes, constraints, and functions exist
-- Created: 2025-09-23

-- =============================================================================
-- VALIDATION RESULTS TABLE
-- =============================================================================

-- Create temporary table to store validation results
CREATE TEMP TABLE validation_results (
    check_name TEXT,
    status TEXT,
    message TEXT,
    details TEXT
);

-- =============================================================================
-- ENUM VALIDATION
-- =============================================================================

-- Check if required enums exist
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'user_role_enum',
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) > 0 THEN 'user_role enum exists' ELSE 'user_role enum missing' END,
    'Expected values: corporativo, gerente, empleado'
FROM pg_type 
WHERE typname = 'user_role' AND typtype = 'e';

INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'okr_status_enum',
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) > 0 THEN 'okr_status enum exists' ELSE 'okr_status enum missing' END,
    'Expected values: no_iniciado, en_progreso, completado, pausado'
FROM pg_type 
WHERE typname = 'okr_status' AND typtype = 'e';

-- =============================================================================
-- TABLE VALIDATION
-- =============================================================================

-- Check if all required tables exist
WITH required_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'objectives', 'initiatives', 'activities', 
        'companies', 'import_logs', 'ai_suggestions'
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'table_' || rt.table_name,
    CASE WHEN et.table_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN et.table_name IS NOT NULL 
         THEN 'Table ' || rt.table_name || ' exists'
         ELSE 'Table ' || rt.table_name || ' missing' END,
    'Core application table'
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name;

-- =============================================================================
-- COLUMN VALIDATION
-- =============================================================================

-- Check critical columns exist
WITH required_columns AS (
    SELECT * FROM (VALUES
        ('profiles', 'company_id'),
        ('objectives', 'company_id'), 
        ('initiatives', 'company_id'),
        ('activities', 'company_id'),
        ('profiles', 'role'),
        ('objectives', 'status'),
        ('ai_suggestions', 'suggestion_type')
    ) AS t(table_name, column_name)
),
existing_columns AS (
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'column_' || rc.table_name || '_' || rc.column_name,
    CASE WHEN ec.column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN ec.column_name IS NOT NULL 
         THEN 'Column ' || rc.table_name || '.' || rc.column_name || ' exists'
         ELSE 'Column ' || rc.table_name || '.' || rc.column_name || ' missing' END,
    'Required for migration functionality'
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.table_name = ec.table_name AND rc.column_name = ec.column_name;

-- =============================================================================
-- FOREIGN KEY VALIDATION
-- =============================================================================

-- Check critical foreign key relationships
WITH required_fks AS (
    SELECT * FROM (VALUES
        ('profiles', 'manager_id', 'profiles', 'id'),
        ('profiles', 'company_id', 'companies', 'id'),
        ('objectives', 'owner_id', 'profiles', 'id'),
        ('objectives', 'company_id', 'companies', 'id'),
        ('initiatives', 'objective_id', 'objectives', 'id'),
        ('initiatives', 'owner_id', 'profiles', 'id'),
        ('activities', 'initiative_id', 'initiatives', 'id'),
        ('activities', 'owner_id', 'profiles', 'id'),
        ('import_logs', 'company_id', 'companies', 'id'),
        ('import_logs', 'user_id', 'profiles', 'id')
    ) AS t(table_name, column_name, ref_table, ref_column)
),
existing_fks AS (
    SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS ref_table,
        ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'fk_' || rf.table_name || '_' || rf.column_name,
    CASE WHEN ef.column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN ef.column_name IS NOT NULL 
         THEN 'FK ' || rf.table_name || '.' || rf.column_name || ' -> ' || rf.ref_table || '.' || rf.ref_column || ' exists'
         ELSE 'FK ' || rf.table_name || '.' || rf.column_name || ' -> ' || rf.ref_table || '.' || rf.ref_column || ' missing' END,
    'Required for data integrity'
FROM required_fks rf
LEFT JOIN existing_fks ef ON rf.table_name = ef.table_name 
    AND rf.column_name = ef.column_name 
    AND rf.ref_table = ef.ref_table 
    AND rf.ref_column = ef.ref_column;

-- =============================================================================
-- FUNCTION VALIDATION
-- =============================================================================

-- Check if required functions exist
WITH required_functions AS (
    SELECT unnest(ARRAY[
        'handle_new_user', 'update_updated_at_column', 'set_company_id'
    ]) AS function_name
),
existing_functions AS (
    SELECT routine_name AS function_name
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'function_' || rf.function_name,
    CASE WHEN ef.function_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN ef.function_name IS NOT NULL 
         THEN 'Function ' || rf.function_name || ' exists'
         ELSE 'Function ' || rf.function_name || ' missing' END,
    'Required for application functionality'
FROM required_functions rf
LEFT JOIN existing_functions ef ON rf.function_name = ef.function_name;

-- =============================================================================
-- TRIGGER VALIDATION
-- =============================================================================

-- Check if required triggers exist
WITH required_triggers AS (
    SELECT * FROM (VALUES
        ('on_auth_user_created', 'auth.users'),
        ('update_profiles_updated_at', 'profiles'),
        ('update_objectives_updated_at', 'objectives'),
        ('update_initiatives_updated_at', 'initiatives'),
        ('update_activities_updated_at', 'activities'),
        ('set_objectives_company_id', 'objectives'),
        ('set_initiatives_company_id', 'initiatives'),
        ('set_activities_company_id', 'activities')
    ) AS t(trigger_name, table_name)
),
existing_triggers AS (
    SELECT trigger_name, event_object_table AS table_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'trigger_' || rt.trigger_name,
    CASE WHEN et.trigger_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN et.trigger_name IS NOT NULL 
         THEN 'Trigger ' || rt.trigger_name || ' on ' || rt.table_name || ' exists'
         ELSE 'Trigger ' || rt.trigger_name || ' on ' || rt.table_name || ' missing' END,
    'Required for automatic data management'
FROM required_triggers rt
LEFT JOIN existing_triggers et ON rt.trigger_name = et.trigger_name AND rt.table_name = et.table_name;

-- =============================================================================
-- RLS VALIDATION
-- =============================================================================

-- Check if RLS is enabled on required tables
WITH required_rls_tables AS (
    SELECT unnest(ARRAY[
        'profiles', 'objectives', 'initiatives', 'activities', 
        'companies', 'import_logs', 'ai_suggestions'
    ]) AS table_name
),
rls_enabled AS (
    SELECT tablename AS table_name
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'rls_' || rt.table_name,
    CASE WHEN re.table_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN re.table_name IS NOT NULL 
         THEN 'RLS enabled on ' || rt.table_name
         ELSE 'RLS not enabled on ' || rt.table_name END,
    'Required for security'
FROM required_rls_tables rt
LEFT JOIN rls_enabled re ON rt.table_name = re.table_name;

-- =============================================================================
-- INDEX VALIDATION
-- =============================================================================

-- Check if performance indexes exist
WITH required_indexes AS (
    SELECT * FROM (VALUES
        ('idx_ai_suggestions_user_id', 'ai_suggestions'),
        ('idx_ai_suggestions_created_at', 'ai_suggestions'),
        ('idx_ai_suggestions_suggestion_type', 'ai_suggestions')
    ) AS t(index_name, table_name)
),
existing_indexes AS (
    SELECT indexname AS index_name, tablename AS table_name
    FROM pg_indexes
    WHERE schemaname = 'public'
)
INSERT INTO validation_results (check_name, status, message, details)
SELECT 
    'index_' || ri.index_name,
    CASE WHEN ei.index_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN ei.index_name IS NOT NULL 
         THEN 'Index ' || ri.index_name || ' exists'
         ELSE 'Index ' || ri.index_name || ' missing' END,
    'Required for performance'
FROM required_indexes ri
LEFT JOIN existing_indexes ei ON ri.index_name = ei.index_name AND ri.table_name = ei.table_name;

-- =============================================================================
-- RESULTS SUMMARY
-- =============================================================================

-- Display validation results
SELECT 
    '=== SCHEMA VALIDATION RESULTS ===' AS summary;

SELECT 
    check_name,
    status,
    message,
    details
FROM validation_results
ORDER BY 
    CASE status WHEN 'FAIL' THEN 1 ELSE 2 END,
    check_name;

-- Summary counts
SELECT 
    '=== VALIDATION SUMMARY ===' AS summary;

SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM validation_results
GROUP BY status
ORDER BY status;

-- Overall result
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM validation_results WHERE status = 'FAIL') 
        THEN 'MIGRATION VALIDATION FAILED - Review failed checks above'
        ELSE 'MIGRATION VALIDATION PASSED - Schema is ready'
    END AS overall_result;