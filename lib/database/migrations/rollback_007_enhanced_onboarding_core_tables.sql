-- Rollback Script for Enhanced Onboarding Core Tables Migration
-- This script safely rolls back the 007_enhanced_onboarding_core_tables migration
-- Rollback: rollback_007_enhanced_onboarding_core_tables
-- Created: 2025-09-28
-- Description: Safe rollback of enhanced onboarding core tables with data preservation

-- =============================================================================
-- ROLLBACK START
-- =============================================================================

BEGIN;

-- Set proper search path
SET search_path = public;

-- =============================================================================
-- BACKUP CRITICAL DATA BEFORE ROLLBACK
-- =============================================================================

-- Create backup tables for critical data
CREATE TABLE IF NOT EXISTS backup_user_profiles_007 AS
SELECT * FROM user_profiles;

CREATE TABLE IF NOT EXISTS backup_departments_007 AS
SELECT * FROM departments WHERE 1=0; -- Structure only initially

-- Only backup departments if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
        INSERT INTO backup_departments_007 SELECT * FROM departments;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS backup_onboarding_steps_007 AS
SELECT * FROM onboarding_steps WHERE 1=0; -- Structure only initially

-- Only backup onboarding steps if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_steps') THEN
        INSERT INTO backup_onboarding_steps_007 SELECT * FROM onboarding_steps;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS backup_key_results_007 AS
SELECT * FROM key_results WHERE 1=0; -- Structure only initially

-- Only backup key results if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'key_results') THEN
        INSERT INTO backup_key_results_007 SELECT * FROM key_results;
    END IF;
END $$;

-- =============================================================================
-- DROP TRIGGERS AND FUNCTIONS ADDED IN MIGRATION
-- =============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_department_hierarchy ON departments;
DROP TRIGGER IF EXISTS trigger_validate_department_structure ON departments;

-- Drop functions
DROP FUNCTION IF EXISTS update_department_hierarchy_path();
DROP FUNCTION IF EXISTS create_user_profile_on_organization_join();
DROP FUNCTION IF EXISTS validate_organization_structure();

-- =============================================================================
-- DROP NEW INDEXES CREATED IN MIGRATION
-- =============================================================================

-- Organizations indexes
DROP INDEX IF EXISTS organizations_slug_idx;
DROP INDEX IF EXISTS organizations_industry_idx;
DROP INDEX IF EXISTS organizations_created_by_idx;
DROP INDEX IF EXISTS organizations_size_idx;
DROP INDEX IF EXISTS organizations_active_idx;

-- Departments indexes
DROP INDEX IF EXISTS departments_org_idx;
DROP INDEX IF EXISTS departments_parent_idx;
DROP INDEX IF EXISTS departments_head_idx;
DROP INDEX IF EXISTS departments_type_idx;
DROP INDEX IF EXISTS departments_active_idx;

-- User profiles indexes
DROP INDEX IF EXISTS user_profiles_user_idx;
DROP INDEX IF EXISTS user_profiles_org_idx;
DROP INDEX IF EXISTS user_profiles_dept_idx;
DROP INDEX IF EXISTS user_profiles_manager_idx;
DROP INDEX IF EXISTS user_profiles_role_idx;
DROP INDEX IF EXISTS user_profiles_active_idx;

-- Enhanced users indexes
DROP INDEX IF EXISTS users_email_verified_idx;
DROP INDEX IF EXISTS users_onboarding_completed_idx;
DROP INDEX IF EXISTS users_active_idx;
DROP INDEX IF EXISTS users_last_login_idx;

-- Onboarding steps indexes
DROP INDEX IF EXISTS onboarding_steps_session_idx;
DROP INDEX IF EXISTS onboarding_steps_number_idx;
DROP INDEX IF EXISTS onboarding_steps_completed_idx;
DROP INDEX IF EXISTS onboarding_steps_timing_idx;

-- Key results indexes
DROP INDEX IF EXISTS key_results_objective_idx;
DROP INDEX IF EXISTS key_results_owner_idx;
DROP INDEX IF EXISTS key_results_status_idx;
DROP INDEX IF EXISTS key_results_due_date_idx;
DROP INDEX IF EXISTS key_results_active_idx;

-- =============================================================================
-- DROP NEW TABLES CREATED IN MIGRATION
-- =============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS onboarding_steps CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- =============================================================================
-- REMOVE CONSTRAINTS ADDED IN MIGRATION
-- =============================================================================

-- Remove foreign key constraints that were added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE constraint_name = 'organizations_created_by_fk') THEN
        ALTER TABLE organizations DROP CONSTRAINT organizations_created_by_fk;
    END IF;
END $$;

-- =============================================================================
-- REMOVE COLUMNS ADDED TO EXISTING TABLES
-- =============================================================================

-- Remove columns added to organizations table
DO $$
BEGIN
    -- Remove slug column
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='slug') THEN
        ALTER TABLE organizations DROP COLUMN slug;
    END IF;

    -- Remove other added columns
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='logo_url') THEN
        ALTER TABLE organizations DROP COLUMN logo_url;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='timezone') THEN
        ALTER TABLE organizations DROP COLUMN timezone;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='okr_cycle_duration') THEN
        ALTER TABLE organizations DROP COLUMN okr_cycle_duration;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='okr_update_frequency') THEN
        ALTER TABLE organizations DROP COLUMN okr_update_frequency;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='subscription_tier') THEN
        ALTER TABLE organizations DROP COLUMN subscription_tier;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='user_limit') THEN
        ALTER TABLE organizations DROP COLUMN user_limit;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='storage_limit_mb') THEN
        ALTER TABLE organizations DROP COLUMN storage_limit_mb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='state_province') THEN
        ALTER TABLE organizations DROP COLUMN state_province;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='organizations' AND column_name='is_active') THEN
        ALTER TABLE organizations DROP COLUMN is_active;
    END IF;
END $$;

-- Remove columns added to users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='display_name') THEN
        ALTER TABLE users DROP COLUMN display_name;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='email_verified') THEN
        ALTER TABLE users DROP COLUMN email_verified;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='language') THEN
        ALTER TABLE users DROP COLUMN language;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='timezone') THEN
        ALTER TABLE users DROP COLUMN timezone;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='date_format') THEN
        ALTER TABLE users DROP COLUMN date_format;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='notification_preferences') THEN
        ALTER TABLE users DROP COLUMN notification_preferences;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='onboarding_completed') THEN
        ALTER TABLE users DROP COLUMN onboarding_completed;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='onboarding_completed_at') THEN
        ALTER TABLE users DROP COLUMN onboarding_completed_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='first_login_at') THEN
        ALTER TABLE users DROP COLUMN first_login_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='last_login_at') THEN
        ALTER TABLE users DROP COLUMN last_login_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='login_count') THEN
        ALTER TABLE users DROP COLUMN login_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='terms_accepted_at') THEN
        ALTER TABLE users DROP COLUMN terms_accepted_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='privacy_policy_accepted_at') THEN
        ALTER TABLE users DROP COLUMN privacy_policy_accepted_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='marketing_consent') THEN
        ALTER TABLE users DROP COLUMN marketing_consent;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users DROP COLUMN is_active;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='suspended_at') THEN
        ALTER TABLE users DROP COLUMN suspended_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='users' AND column_name='deleted_at') THEN
        ALTER TABLE users DROP COLUMN deleted_at;
    END IF;
END $$;

-- Remove columns added to onboarding_sessions table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='session_type') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN session_type;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='user_agent') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN user_agent;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='ip_address') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN ip_address;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='referrer_url') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN referrer_url;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='utm_params') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN utm_params;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='started_at') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN started_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='abandoned_at') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN abandoned_at;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='estimated_completion_time') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN estimated_completion_time;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='actual_completion_time') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN actual_completion_time;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='error_count') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN error_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='last_error') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN last_error;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='onboarding_sessions' AND column_name='validation_results') THEN
        ALTER TABLE onboarding_sessions DROP COLUMN validation_results;
    END IF;
END $$;

-- =============================================================================
-- DROP ENHANCED ENUMS
-- =============================================================================

-- Drop enhanced enums (in reverse dependency order)
DROP TYPE IF EXISTS enhanced_onboarding_status CASCADE;
DROP TYPE IF EXISTS okr_maturity_level CASCADE;
DROP TYPE IF EXISTS enhanced_organization_size CASCADE;
DROP TYPE IF EXISTS enhanced_user_role CASCADE;
DROP TYPE IF EXISTS department_type CASCADE;

-- =============================================================================
-- RESTORE ORIGINAL STATE NOTIFICATION
-- =============================================================================

-- Function to verify rollback success
CREATE OR REPLACE FUNCTION verify_rollback_007()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    issues TEXT := '';
    table_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Check if new tables still exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name IN ('departments', 'user_profiles', 'onboarding_steps', 'key_results')
    AND table_schema = 'public';

    IF table_count > 0 THEN
        issues := issues || 'Some new tables still exist. ';
    END IF;

    -- Check if new columns still exist in organizations
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name IN ('slug', 'logo_url', 'timezone', 'okr_cycle_duration', 'subscription_tier');

    IF column_count > 0 THEN
        issues := issues || 'Some new columns still exist in organizations table. ';
    END IF;

    -- Check if new columns still exist in users
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name IN ('display_name', 'email_verified', 'language', 'onboarding_completed');

    IF column_count > 0 THEN
        issues := issues || 'Some new columns still exist in users table. ';
    END IF;

    IF issues = '' THEN
        RETURN 'Rollback verification successful: All migration 007 changes have been reverted.';
    ELSE
        RETURN 'Rollback verification found issues: ' || issues;
    END IF;
END;
$$;

-- =============================================================================
-- COMPLETION
-- =============================================================================

COMMIT;

-- Verify rollback
SELECT verify_rollback_007();

-- Show backup table information
DO $$
DECLARE
    backup_info TEXT := '';
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM backup_user_profiles_007;
    backup_info := backup_info || 'backup_user_profiles_007: ' || row_count || ' rows' || E'\n';

    SELECT COUNT(*) INTO row_count FROM backup_departments_007;
    backup_info := backup_info || 'backup_departments_007: ' || row_count || ' rows' || E'\n';

    SELECT COUNT(*) INTO row_count FROM backup_onboarding_steps_007;
    backup_info := backup_info || 'backup_onboarding_steps_007: ' || row_count || ' rows' || E'\n';

    SELECT COUNT(*) INTO row_count FROM backup_key_results_007;
    backup_info := backup_info || 'backup_key_results_007: ' || row_count || ' rows' || E'\n';

    RAISE NOTICE 'Backup tables created with data:%', backup_info;
END $$;

-- Clean up verification function
DROP FUNCTION IF EXISTS verify_rollback_007();

-- Migration rollback completed successfully
SELECT 'Enhanced onboarding core tables migration rollback completed successfully. Check backup tables for preserved data.' AS result;