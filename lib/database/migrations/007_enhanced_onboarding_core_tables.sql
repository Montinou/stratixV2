-- Enhanced Onboarding Core Tables Migration for StratixV2 OKR Management System (NeonDB Version)
-- This migration enhances the existing onboarding system with improved schema design
-- Migration: 007_enhanced_onboarding_core_tables
-- Created: 2025-09-28
-- Description: Enhanced core tables for improved onboarding with multi-tenant support

-- =============================================================================
-- MIGRATION START
-- =============================================================================

BEGIN;

-- Set proper search path
SET search_path = public;

-- =============================================================================
-- ENHANCED ENUMS
-- =============================================================================

-- Enhanced user role type with more granular permissions
DO $$ BEGIN
    CREATE TYPE enhanced_user_role AS ENUM (
        'super_admin',      -- Platform administrators
        'org_owner',        -- Organization owners
        'org_admin',        -- Organization administrators
        'manager',          -- Department/team managers
        'team_lead',        -- Team leaders
        'member',           -- Regular team members
        'viewer'            -- Read-only access
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced organization size with more specific categories
DO $$ BEGIN
    CREATE TYPE enhanced_organization_size AS ENUM (
        'startup',          -- 1-10 employees
        'small',            -- 11-50 employees
        'medium',           -- 51-200 employees
        'large',            -- 201-1000 employees
        'enterprise'        -- 1000+ employees
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- OKR maturity levels for better onboarding personalization
DO $$ BEGIN
    CREATE TYPE okr_maturity_level AS ENUM (
        'beginner',         -- New to OKRs
        'developing',       -- Some experience
        'proficient',       -- Regular OKR practice
        'advanced',         -- Sophisticated OKR implementation
        'expert'            -- OKR thought leaders
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced onboarding status with more states
DO $$ BEGIN
    CREATE TYPE enhanced_onboarding_status AS ENUM (
        'not_started',      -- User registered but haven't started
        'in_progress',      -- Actively onboarding
        'completed',        -- Onboarding finished successfully
        'abandoned',        -- User abandoned the process
        'expired',          -- Session expired
        'paused'           -- Temporarily paused
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Department types for organization structure
DO $$ BEGIN
    CREATE TYPE department_type AS ENUM (
        'engineering',      -- Engineering/Development
        'product',          -- Product Management
        'design',           -- Design/UX
        'marketing',        -- Marketing/Growth
        'sales',            -- Sales/Business Development
        'operations',       -- Operations/Admin
        'finance',          -- Finance/Accounting
        'hr',              -- Human Resources
        'legal',           -- Legal/Compliance
        'support',         -- Customer Support
        'other'            -- Other departments
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- ENHANCED ORGANIZATIONS TABLE
-- =============================================================================

-- Add columns to existing organizations table if they don't exist
DO $$
BEGIN
    -- Add slug column for URL-friendly identifiers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='slug') THEN
        ALTER TABLE organizations ADD COLUMN slug VARCHAR(100);

        -- Generate slugs for existing organizations
        UPDATE organizations SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'));

        -- Make slug unique and not null
        ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
        CREATE UNIQUE INDEX organizations_slug_idx ON organizations(slug);
    END IF;

    -- Add enhanced organization information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='logo_url') THEN
        ALTER TABLE organizations ADD COLUMN logo_url VARCHAR(500);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='timezone') THEN
        ALTER TABLE organizations ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;

    -- Add OKR configuration columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='okr_cycle_duration') THEN
        ALTER TABLE organizations ADD COLUMN okr_cycle_duration INTEGER DEFAULT 90 CHECK (okr_cycle_duration > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='okr_update_frequency') THEN
        ALTER TABLE organizations ADD COLUMN okr_update_frequency INTEGER DEFAULT 7 CHECK (okr_update_frequency > 0);
    END IF;

    -- Add subscription and limits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='subscription_tier') THEN
        ALTER TABLE organizations ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='user_limit') THEN
        ALTER TABLE organizations ADD COLUMN user_limit INTEGER DEFAULT 10 CHECK (user_limit > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='storage_limit_mb') THEN
        ALTER TABLE organizations ADD COLUMN storage_limit_mb INTEGER DEFAULT 1024 CHECK (storage_limit_mb > 0);
    END IF;

    -- Add state/province for better location tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='state_province') THEN
        ALTER TABLE organizations ADD COLUMN state_province VARCHAR(100);
    END IF;

    -- Add is_active flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='organizations' AND column_name='is_active') THEN
        ALTER TABLE organizations ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- =============================================================================
-- NEW DEPARTMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Department information
    name VARCHAR(255) NOT NULL,
    type department_type NOT NULL DEFAULT 'other',
    description TEXT,
    code VARCHAR(20), -- Short code for the department (e.g., 'ENG', 'SALES')

    -- Hierarchy support
    parent_department_id UUID REFERENCES departments(id),
    level INTEGER DEFAULT 0 CHECK (level >= 0), -- 0 = top level
    hierarchy_path TEXT, -- Materialized path for efficient hierarchy queries

    -- Leadership
    head_of_department_id UUID, -- Will be linked to users.id after creation

    -- Configuration
    okr_frequency INTEGER DEFAULT 7 CHECK (okr_frequency > 0), -- Update frequency in days
    budget_allocated DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',

    -- Audit and lifecycle
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, name),
    UNIQUE(organization_id, code)
);

-- =============================================================================
-- ENHANCED USERS TABLE
-- =============================================================================

-- Add enhanced columns to existing users table
DO $$
BEGIN
    -- Add display name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='display_name') THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(200);
        -- Generate display names for existing users
        UPDATE users SET display_name = COALESCE(name, email);
    END IF;

    -- Add email verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;

    -- Add user preferences
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='language') THEN
        ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'es';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='timezone') THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='date_format') THEN
        ALTER TABLE users ADD COLUMN date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='notification_preferences') THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{}';
    END IF;

    -- Add onboarding tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='onboarding_completed') THEN
        ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='onboarding_completed_at') THEN
        ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add login tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='first_login_at') THEN
        ALTER TABLE users ADD COLUMN first_login_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='login_count') THEN
        ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
    END IF;

    -- Add compliance tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='terms_accepted_at') THEN
        ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='privacy_policy_accepted_at') THEN
        ALTER TABLE users ADD COLUMN privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='marketing_consent') THEN
        ALTER TABLE users ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
    END IF;

    -- Add security fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='suspended_at') THEN
        ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='users' AND column_name='deleted_at') THEN
        ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =============================================================================
-- NEW USER_PROFILES TABLE (Enhanced)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role and permissions
    role enhanced_user_role NOT NULL DEFAULT 'member',

    -- Professional information
    job_title VARCHAR(200),
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id), -- Direct manager
    hire_date DATE,
    employment_type VARCHAR(50), -- full-time, part-time, contractor, etc.

    -- Contact information
    phone VARCHAR(50),
    mobile VARCHAR(50),
    emergency_contact JSONB, -- Emergency contact information

    -- Work preferences
    working_hours JSONB DEFAULT '{}', -- Start/end times, days of week
    work_location VARCHAR(100), -- Remote, office location, hybrid

    -- OKR preferences
    okr_experience okr_maturity_level NOT NULL DEFAULT 'beginner',
    preferred_update_frequency INTEGER DEFAULT 7, -- Days
    goals_visibility VARCHAR(20) DEFAULT 'team', -- public, team, private

    -- Performance tracking
    performance_review_cycle INTEGER DEFAULT 365, -- Days between reviews
    last_review_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,

    -- Audit and lifecycle
    joined_organization_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_organization_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, organization_id)
);

-- =============================================================================
-- ENHANCED ONBOARDING_SESSIONS TABLE
-- =============================================================================

-- Add enhanced columns to existing onboarding_sessions table
DO $$
BEGIN
    -- Update status enum if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='session_type') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN session_type VARCHAR(50) DEFAULT 'standard';
    END IF;

    -- Add user context tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='user_agent') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN user_agent TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='ip_address') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN ip_address INET;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='referrer_url') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN referrer_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='utm_params') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN utm_params JSONB DEFAULT '{}';
    END IF;

    -- Add timing fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='started_at') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='abandoned_at') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN abandoned_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='estimated_completion_time') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN estimated_completion_time INTEGER; -- Minutes
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='actual_completion_time') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN actual_completion_time INTEGER; -- Minutes
    END IF;

    -- Add error tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='error_count') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN error_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='last_error') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN last_error JSONB;
    END IF;

    -- Add validation results
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='onboarding_sessions' AND column_name='validation_results') THEN
        ALTER TABLE onboarding_sessions ADD COLUMN validation_results JSONB DEFAULT '{}';
    END IF;
END $$;

-- =============================================================================
-- NEW ONBOARDING_STEPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,

    -- Step information
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_title VARCHAR(255),
    step_description TEXT,

    -- Step data and validation
    step_data JSONB DEFAULT '{}',
    validation_results JSONB DEFAULT '{}',
    ai_feedback JSONB DEFAULT '{}',

    -- Completion tracking
    is_completed BOOLEAN DEFAULT false,
    is_skipped BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT true,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_spent_seconds INTEGER DEFAULT 0,

    -- Error tracking
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(session_id, step_number),
    CHECK(step_number > 0)
);

-- =============================================================================
-- KEY RESULTS TABLE (New)
-- =============================================================================

CREATE TABLE IF NOT EXISTS key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,

    -- Basic information
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Measurement
    metric_type VARCHAR(50) NOT NULL, -- number, percentage, boolean, currency
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) DEFAULT 0,
    unit VARCHAR(50), -- units, %, $, etc.

    -- Progress tracking
    progress_percentage FLOAT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status okr_status DEFAULT 'no_iniciado',

    -- Timing
    due_date DATE,

    -- Ownership and responsibility
    owner_id UUID REFERENCES users(id),

    -- AI and automation
    ai_generated BOOLEAN DEFAULT false,
    confidence_score FLOAT,

    -- Audit and lifecycle
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CONSTRAINTS AND RELATIONSHIPS
-- =============================================================================

-- Add foreign key for departments head_of_department_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'departments_head_fk') THEN
        ALTER TABLE departments
        ADD CONSTRAINT departments_head_fk
        FOREIGN KEY (head_of_department_id) REFERENCES users(id);
    END IF;
END $$;

-- Update organizations created_by foreign key
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'organizations_created_by_fk') THEN
        ALTER TABLE organizations
        ADD CONSTRAINT organizations_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
END $$;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_industry_idx ON organizations(industry_id);
CREATE INDEX IF NOT EXISTS organizations_created_by_idx ON organizations(created_by);
CREATE INDEX IF NOT EXISTS organizations_size_idx ON organizations(size);
CREATE INDEX IF NOT EXISTS organizations_active_idx ON organizations(is_active) WHERE is_active = true;

-- Departments indexes
CREATE INDEX IF NOT EXISTS departments_org_idx ON departments(organization_id);
CREATE INDEX IF NOT EXISTS departments_parent_idx ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS departments_head_idx ON departments(head_of_department_id);
CREATE INDEX IF NOT EXISTS departments_type_idx ON departments(type);
CREATE INDEX IF NOT EXISTS departments_active_idx ON departments(is_active) WHERE is_active = true;

-- User profiles indexes
CREATE INDEX IF NOT EXISTS user_profiles_user_idx ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_org_idx ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS user_profiles_dept_idx ON user_profiles(department_id);
CREATE INDEX IF NOT EXISTS user_profiles_manager_idx ON user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON user_profiles(role);
CREATE INDEX IF NOT EXISTS user_profiles_active_idx ON user_profiles(is_active) WHERE is_active = true;

-- Enhanced users indexes
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);
CREATE INDEX IF NOT EXISTS users_onboarding_completed_idx ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS users_active_idx ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS users_last_login_idx ON users(last_login_at);

-- Onboarding steps indexes
CREATE INDEX IF NOT EXISTS onboarding_steps_session_idx ON onboarding_steps(session_id);
CREATE INDEX IF NOT EXISTS onboarding_steps_number_idx ON onboarding_steps(step_number);
CREATE INDEX IF NOT EXISTS onboarding_steps_completed_idx ON onboarding_steps(is_completed);
CREATE INDEX IF NOT EXISTS onboarding_steps_timing_idx ON onboarding_steps(started_at, completed_at);

-- Key results indexes
CREATE INDEX IF NOT EXISTS key_results_objective_idx ON key_results(objective_id);
CREATE INDEX IF NOT EXISTS key_results_owner_idx ON key_results(owner_id);
CREATE INDEX IF NOT EXISTS key_results_status_idx ON key_results(status);
CREATE INDEX IF NOT EXISTS key_results_due_date_idx ON key_results(due_date);
CREATE INDEX IF NOT EXISTS key_results_active_idx ON key_results(is_active) WHERE is_active = true;

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Trigger for departments hierarchy path
CREATE OR REPLACE FUNCTION update_department_hierarchy_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_department_id IS NULL THEN
        NEW.hierarchy_path = NEW.id::text;
        NEW.level = 0;
    ELSE
        SELECT hierarchy_path || '.' || NEW.id::text, level + 1
        INTO NEW.hierarchy_path, NEW.level
        FROM departments
        WHERE id = NEW.parent_department_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_hierarchy
    BEFORE INSERT OR UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_department_hierarchy_path();

-- Function to auto-create profile when user joins organization
CREATE OR REPLACE FUNCTION create_user_profile_on_organization_join()
RETURNS TRIGGER AS $$
BEGIN
    -- This will be triggered from application logic when user joins organization
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION FUNCTIONS
-- =============================================================================

-- Function to validate organization structure
CREATE OR REPLACE FUNCTION validate_organization_structure()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate department hierarchy doesn't create cycles
    IF NEW.parent_department_id IS NOT NULL THEN
        IF EXISTS (
            WITH RECURSIVE dept_hierarchy AS (
                SELECT id, parent_department_id, 1 as level
                FROM departments
                WHERE id = NEW.parent_department_id

                UNION ALL

                SELECT d.id, d.parent_department_id, dh.level + 1
                FROM departments d
                JOIN dept_hierarchy dh ON d.id = dh.parent_department_id
                WHERE dh.level < 10 -- Prevent infinite recursion
            )
            SELECT 1 FROM dept_hierarchy WHERE id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Department hierarchy would create a cycle';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_department_structure
    BEFORE INSERT OR UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION validate_organization_structure();

-- =============================================================================
-- COMPLETION
-- =============================================================================

COMMIT;

-- Migration completed successfully
SELECT 'Enhanced onboarding core tables migration completed successfully' AS result;