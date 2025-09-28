-- Enhanced Database Schema for Onboarding Backend Integration
-- This file provides the complete SQL schema design for the OKR Management System
-- with enhanced onboarding capabilities, multi-tenant support, and performance optimization
--
-- Version: 1.0
-- Created: 2025-09-28
-- Database: NeonDB with Stack Auth Integration
--
-- =============================================================================
-- OVERVIEW
-- =============================================================================
--
-- This schema design enhances the existing OKR management system with:
-- 1. Enhanced user profiles with onboarding-specific fields
-- 2. Organizations and departments hierarchy for multi-tenant architecture
-- 3. Comprehensive role-based access control (RBAC)
-- 4. Advanced onboarding session management
-- 5. AI-powered industry analysis and recommendations
-- 6. Performance-optimized indexes and constraints
-- 7. Comprehensive RLS policies for data isolation
--
-- =============================================================================
-- DESIGN PRINCIPLES
-- =============================================================================
--
-- 1. Multi-tenancy: All data is scoped to organizations with strict isolation
-- 2. Security First: RLS policies ensure users only access their data
-- 3. Performance Optimized: Strategic indexes for common query patterns
-- 4. Scalable: Designed to handle growth in users and organizations
-- 5. AI-Ready: Structured data for AI analysis and recommendations
-- 6. Audit Trail: Comprehensive tracking of changes and activities
-- 7. Soft Deletes: Preserve data integrity with recoverable deletions
--
-- =============================================================================
-- ENUMS
-- =============================================================================

-- User role types for RBAC
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
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

-- Organization size categories
DO $$ BEGIN
    CREATE TYPE organization_size_type AS ENUM (
        'startup',          -- 1-10 employees
        'small',            -- 11-50 employees
        'medium',           -- 51-200 employees
        'large',            -- 201-1000 employees
        'enterprise'        -- 1000+ employees
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- OKR maturity levels
DO $$ BEGIN
    CREATE TYPE okr_maturity_type AS ENUM (
        'beginner',         -- New to OKRs
        'developing',       -- Some experience
        'proficient',       -- Regular OKR practice
        'advanced',         -- Sophisticated OKR implementation
        'expert'            -- OKR thought leaders
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Onboarding session status
DO $$ BEGIN
    CREATE TYPE onboarding_status_type AS ENUM (
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

-- Content status for objectives, initiatives, activities
DO $$ BEGIN
    CREATE TYPE content_status_type AS ENUM (
        'draft',           -- Being created/edited
        'active',          -- Currently active
        'completed',       -- Successfully completed
        'cancelled',       -- Cancelled/abandoned
        'on_hold',         -- Temporarily paused
        'archived'         -- Archived for historical reference
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Priority levels
DO $$ BEGIN
    CREATE TYPE priority_type AS ENUM (
        'critical',        -- Must be done immediately
        'high',           -- Important and urgent
        'medium',         -- Normal priority
        'low',            -- Nice to have
        'planning'        -- Future planning
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Organizations table - Multi-tenant root entity
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic organization information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    description TEXT,
    website VARCHAR(500),
    logo_url VARCHAR(500),

    -- Business information
    industry_id INTEGER REFERENCES industries(id),
    size organization_size_type NOT NULL DEFAULT 'startup',
    employee_count INTEGER CHECK (employee_count >= 0),
    founded_year INTEGER CHECK (founded_year >= 1800 AND founded_year <= EXTRACT(year FROM CURRENT_DATE)),

    -- Location
    country VARCHAR(100),
    state_province VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- OKR configuration
    okr_maturity okr_maturity_type NOT NULL DEFAULT 'beginner',
    okr_cycle_duration INTEGER DEFAULT 90 CHECK (okr_cycle_duration > 0), -- days
    okr_update_frequency INTEGER DEFAULT 7 CHECK (okr_update_frequency > 0), -- days

    -- Business context for AI
    business_goals JSONB DEFAULT '[]',
    current_challenges JSONB DEFAULT '[]',
    success_metrics JSONB DEFAULT '[]',
    ai_insights JSONB DEFAULT '{}',

    -- Subscription and limits
    subscription_tier VARCHAR(50) DEFAULT 'free',
    user_limit INTEGER DEFAULT 10 CHECK (user_limit > 0),
    storage_limit_mb INTEGER DEFAULT 1024 CHECK (storage_limit_mb > 0),

    -- Audit and lifecycle
    created_by UUID NOT NULL, -- Will be linked to users.id after user table creation
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table - Organization structure
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Department information
    name VARCHAR(255) NOT NULL,
    type department_type NOT NULL DEFAULT 'other',
    description TEXT,
    code VARCHAR(20), -- Short code for the department (e.g., 'ENG', 'SALES')

    -- Hierarchy
    parent_department_id UUID REFERENCES departments(id),
    level INTEGER DEFAULT 0 CHECK (level >= 0), -- 0 = top level
    path LTREE, -- Materialized path for efficient hierarchy queries

    -- Leadership
    head_of_department_id UUID, -- Will be linked to users.id

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

-- Industries table - AI-powered industry categorization
CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,

    -- Industry information
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,

    -- AI context for recommendations
    ai_context JSONB DEFAULT '{}', -- Keywords, metrics, etc.
    okr_examples JSONB DEFAULT '[]', -- Example OKRs for this industry

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Users table - Authentication and basic user info
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Stack Auth integration
    stack_user_id VARCHAR(255) UNIQUE NOT NULL, -- Link to Stack Auth

    -- Basic user information
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT false,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200), -- Computed or custom display name
    avatar_url VARCHAR(500),

    -- User preferences
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50),
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    notification_preferences JSONB DEFAULT '{}',

    -- Onboarding tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    first_login_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,

    -- Security and compliance
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE,
    marketing_consent BOOLEAN DEFAULT false,

    -- Audit and lifecycle
    is_active BOOLEAN DEFAULT true,
    suspended_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table - Extended user information and organization membership
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role and permissions
    role user_role_type NOT NULL DEFAULT 'member',

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
    okr_experience okr_maturity_type NOT NULL DEFAULT 'beginner',
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

-- Onboarding sessions table - Enhanced session management
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session management
    status onboarding_status_type DEFAULT 'not_started',
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 5,
    completion_percentage FLOAT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

    -- Session data
    form_data JSONB NOT NULL DEFAULT '{}', -- All form data collected
    ai_suggestions JSONB DEFAULT '{}', -- AI-generated suggestions
    ai_analysis JSONB DEFAULT '{}', -- AI analysis results
    validation_results JSONB DEFAULT '{}', -- Validation outcomes

    -- User context
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    utm_params JSONB DEFAULT '{}', -- Marketing attribution

    -- Timing and lifecycle
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    abandoned_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    estimated_completion_time INTEGER, -- Minutes
    actual_completion_time INTEGER, -- Minutes

    -- Error tracking
    error_count INTEGER DEFAULT 0,
    last_error JSONB,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding steps table - Individual step tracking
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
-- OKR TABLES (Enhanced)
-- =============================================================================

-- Objectives table - Enhanced with better organization support
CREATE TABLE IF NOT EXISTS objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic information
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Organization and ownership
    department_id UUID REFERENCES departments(id),
    owner_id UUID NOT NULL REFERENCES users(id),

    -- Status and progress
    status content_status_type DEFAULT 'draft',
    priority priority_type DEFAULT 'medium',
    progress_percentage FLOAT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Timing
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Categorization
    objective_type VARCHAR(50) DEFAULT 'business', -- business, learning, innovation
    tags JSONB DEFAULT '[]',

    -- Metrics and tracking
    success_criteria JSONB DEFAULT '[]',
    key_results_count INTEGER DEFAULT 0,

    -- Collaboration
    stakeholders JSONB DEFAULT '[]', -- Involved team members
    visibility VARCHAR(20) DEFAULT 'organization', -- organization, department, team, private

    -- AI and automation
    ai_generated BOOLEAN DEFAULT false,
    ai_confidence_score FLOAT,
    ai_suggestions JSONB DEFAULT '{}',

    -- Audit and lifecycle
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK(end_date >= start_date),
    CHECK(actual_end_date IS NULL OR actual_start_date IS NOT NULL),
    CHECK(actual_end_date IS NULL OR actual_end_date >= actual_start_date)
);

-- Key Results table - Measurable outcomes for objectives
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
    status content_status_type DEFAULT 'active',

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
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 'Enhanced schema design document created successfully' AS result;