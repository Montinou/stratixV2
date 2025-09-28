-- Row Level Security (RLS) Policies for Enhanced Onboarding System
-- This file contains comprehensive RLS policies for multi-tenant data isolation
-- and role-based access control for the OKR Management System
--
-- Version: 1.0
-- Created: 2025-09-28
-- Database: NeonDB with Stack Auth Integration
--
-- =============================================================================
-- OVERVIEW
-- =============================================================================
--
-- This RLS policy design implements:
-- 1. Multi-tenant data isolation at the organization level
-- 2. Role-based access control with granular permissions
-- 3. Department-level access control for hierarchical organizations
-- 4. Secure onboarding flow with proper data isolation
-- 5. Performance-optimized policies using proper indexing
-- 6. Audit trail preservation with appropriate access controls
--
-- =============================================================================
-- SECURITY PRINCIPLES
-- =============================================================================
--
-- 1. Deny by Default: All tables have RLS enabled with no implicit access
-- 2. Principle of Least Privilege: Users only access data they need
-- 3. Organization Isolation: Users can only access their organization's data
-- 4. Role-Based Hierarchy: Higher roles inherit lower role permissions
-- 5. Department Boundaries: Respect departmental access controls
-- 6. Audit Transparency: All policy checks are logged and traceable
--
-- =============================================================================
-- HELPER FUNCTIONS FOR RLS
-- =============================================================================

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_org_id UUID;
BEGIN
    -- Get organization ID for the current user
    SELECT up.organization_id INTO user_org_id
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE u.stack_user_id = auth.user_id()
    AND up.is_active = true
    LIMIT 1;

    RETURN user_org_id;
END;
$$;

-- Function to get current user's role in their organization
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS enhanced_user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role_val enhanced_user_role;
BEGIN
    -- Get user's role in their organization
    SELECT up.role INTO user_role_val
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE u.stack_user_id = auth.user_id()
    AND up.is_active = true
    LIMIT 1;

    RETURN user_role_val;
END;
$$;

-- Function to get current user's department ID
CREATE OR REPLACE FUNCTION get_user_department_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_dept_id UUID;
BEGIN
    -- Get user's department ID
    SELECT up.department_id INTO user_dept_id
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE u.stack_user_id = auth.user_id()
    AND up.is_active = true
    LIMIT 1;

    RETURN user_dept_id;
END;
$$;

-- Function to check if user has access to a specific department
CREATE OR REPLACE FUNCTION user_has_department_access(target_dept_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role_val enhanced_user_role;
    user_dept_id UUID;
    user_org_id UUID;
BEGIN
    -- Get current user's role, department, and organization
    SELECT up.role, up.department_id, up.organization_id
    INTO user_role_val, user_dept_id, user_org_id
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE u.stack_user_id = auth.user_id()
    AND up.is_active = true
    LIMIT 1;

    -- Super admins and org owners can access all departments in their org
    IF user_role_val IN ('super_admin', 'org_owner', 'org_admin') THEN
        RETURN EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = target_dept_id
            AND d.organization_id = user_org_id
        );
    END IF;

    -- Managers can access their department and sub-departments
    IF user_role_val = 'manager' THEN
        RETURN EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = target_dept_id
            AND d.organization_id = user_org_id
            AND (
                d.id = user_dept_id
                OR d.hierarchy_path LIKE (
                    SELECT hierarchy_path || '.%'
                    FROM departments
                    WHERE id = user_dept_id
                )
            )
        );
    END IF;

    -- Team leads and members can only access their own department
    RETURN target_dept_id = user_dept_id;
END;
$$;

-- Function to check if user is manager of another user
CREATE OR REPLACE FUNCTION is_user_manager(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user's ID
    SELECT u.id INTO current_user_id
    FROM users u
    WHERE u.stack_user_id = auth.user_id();

    -- Check if current user is the manager of target user
    RETURN EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = target_user_id
        AND up.manager_id = current_user_id
        AND up.is_active = true
    );
END;
$$;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

-- Core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Onboarding tables
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- OKR tables
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

-- Industry table (public read)
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ORGANIZATIONS TABLE RLS POLICIES
-- =============================================================================

-- Organizations: Users can only see organizations they belong to
CREATE POLICY "users_can_view_their_organization" ON organizations
FOR SELECT
TO authenticated
USING (
    id = get_user_organization_id()
);

-- Organizations: Only org owners and admins can modify organization details
CREATE POLICY "org_admins_can_modify_organization" ON organizations
FOR UPDATE
TO authenticated
USING (
    id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
);

-- Organizations: Super admins can create organizations
CREATE POLICY "super_admins_can_create_organizations" ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_role() = 'super_admin'
    OR auth.user_id() IN (
        SELECT stack_user_id FROM users WHERE id = created_by
    )
);

-- Organizations: Org owners can soft delete organizations
CREATE POLICY "org_owners_can_delete_organizations" ON organizations
FOR UPDATE
TO authenticated
USING (
    id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner')
    AND deleted_at IS NULL
);

-- =============================================================================
-- DEPARTMENTS TABLE RLS POLICIES
-- =============================================================================

-- Departments: Users can view departments in their organization they have access to
CREATE POLICY "users_can_view_accessible_departments" ON departments
FOR SELECT
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        OR user_has_department_access(id)
    )
);

-- Departments: Org admins and managers can create departments
CREATE POLICY "org_admins_can_create_departments" ON departments
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager')
);

-- Departments: Org admins can modify departments
CREATE POLICY "org_admins_can_modify_departments" ON departments
FOR UPDATE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
);

-- Departments: Org admins can delete departments
CREATE POLICY "org_admins_can_delete_departments" ON departments
FOR DELETE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
);

-- =============================================================================
-- USERS TABLE RLS POLICIES
-- =============================================================================

-- Users: Users can view their own record
CREATE POLICY "users_can_view_own_record" ON users
FOR SELECT
TO authenticated
USING (
    stack_user_id = auth.user_id()
);

-- Users: Users can view other users in their organization (limited fields)
CREATE POLICY "users_can_view_org_users" ON users
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT up.user_id
        FROM user_profiles up
        WHERE up.organization_id = get_user_organization_id()
        AND up.is_active = true
    )
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager', 'team_lead')
);

-- Users: Users can update their own record
CREATE POLICY "users_can_update_own_record" ON users
FOR UPDATE
TO authenticated
USING (
    stack_user_id = auth.user_id()
);

-- Users: Org admins can update user records in their organization
CREATE POLICY "org_admins_can_update_user_records" ON users
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT up.user_id
        FROM user_profiles up
        WHERE up.organization_id = get_user_organization_id()
    )
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
);

-- =============================================================================
-- USER_PROFILES TABLE RLS POLICIES
-- =============================================================================

-- User profiles: Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON user_profiles
FOR SELECT
TO authenticated
USING (
    user_id = (
        SELECT id FROM users WHERE stack_user_id = auth.user_id()
    )
);

-- User profiles: Users can view profiles in their organization based on role
CREATE POLICY "users_can_view_org_profiles" ON user_profiles
FOR SELECT
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        OR (
            get_user_role() = 'manager'
            AND user_has_department_access(department_id)
        )
        OR (
            get_user_role() IN ('team_lead', 'member')
            AND department_id = get_user_department_id()
        )
    )
);

-- User profiles: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON user_profiles
FOR UPDATE
TO authenticated
USING (
    user_id = (
        SELECT id FROM users WHERE stack_user_id = auth.user_id()
    )
);

-- User profiles: Org admins and managers can update subordinate profiles
CREATE POLICY "managers_can_update_subordinate_profiles" ON user_profiles
FOR UPDATE
TO authenticated
USING (
    organization_id = get_user_organization_id()
    AND (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        OR (
            get_user_role() = 'manager'
            AND is_user_manager(user_id)
        )
    )
);

-- User profiles: Org admins can create new profiles
CREATE POLICY "org_admins_can_create_profiles" ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
);

-- =============================================================================
-- ONBOARDING_SESSIONS TABLE RLS POLICIES
-- =============================================================================

-- Onboarding sessions: Users can only access their own sessions
CREATE POLICY "users_can_access_own_onboarding_sessions" ON onboarding_sessions
FOR ALL
TO authenticated
USING (
    user_id = (
        SELECT id FROM users WHERE stack_user_id = auth.user_id()
    )
);

-- Onboarding sessions: Org admins can view sessions in their organization
CREATE POLICY "org_admins_can_view_onboarding_sessions" ON onboarding_sessions
FOR SELECT
TO authenticated
USING (
    get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
    AND user_id IN (
        SELECT up.user_id
        FROM user_profiles up
        WHERE up.organization_id = get_user_organization_id()
    )
);

-- =============================================================================
-- ONBOARDING_STEPS TABLE RLS POLICIES
-- =============================================================================

-- Onboarding steps: Users can access steps for their own sessions
CREATE POLICY "users_can_access_own_onboarding_steps" ON onboarding_steps
FOR ALL
TO authenticated
USING (
    session_id IN (
        SELECT os.id
        FROM onboarding_sessions os
        WHERE os.user_id = (
            SELECT id FROM users WHERE stack_user_id = auth.user_id()
        )
    )
);

-- Onboarding steps: Org admins can view steps for sessions in their organization
CREATE POLICY "org_admins_can_view_onboarding_steps" ON onboarding_steps
FOR SELECT
TO authenticated
USING (
    get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
    AND session_id IN (
        SELECT os.id
        FROM onboarding_sessions os
        JOIN user_profiles up ON up.user_id = os.user_id
        WHERE up.organization_id = get_user_organization_id()
    )
);

-- =============================================================================
-- OBJECTIVES TABLE RLS POLICIES
-- =============================================================================

-- Objectives: Users can view objectives based on their role and department
CREATE POLICY "users_can_view_accessible_objectives" ON objectives
FOR SELECT
TO authenticated
USING (
    (
        -- Users can see their own objectives
        owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
    OR (
        -- Organization-level visibility for admins
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND up.organization_id = get_user_organization_id()
        )
    )
    OR (
        -- Department-level visibility for managers
        get_user_role() = 'manager'
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND user_has_department_access(up.department_id)
        )
    )
    OR (
        -- Team visibility for team leads and members
        get_user_role() IN ('team_lead', 'member')
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND up.department_id = get_user_department_id()
        )
    )
);

-- Objectives: Users can create objectives
CREATE POLICY "users_can_create_objectives" ON objectives
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager')
);

-- Objectives: Users can update their own objectives or those they manage
CREATE POLICY "users_can_update_accessible_objectives" ON objectives
FOR UPDATE
TO authenticated
USING (
    (
        -- Users can update their own objectives
        owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
    OR (
        -- Admins can update any objective in their organization
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND up.organization_id = get_user_organization_id()
        )
    )
    OR (
        -- Managers can update objectives in their department
        get_user_role() = 'manager'
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND user_has_department_access(up.department_id)
        )
    )
);

-- Objectives: Delete follows same rules as update
CREATE POLICY "users_can_delete_accessible_objectives" ON objectives
FOR DELETE
TO authenticated
USING (
    (
        owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
    OR (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        AND EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.user_id = owner_id
            AND up.organization_id = get_user_organization_id()
        )
    )
);

-- =============================================================================
-- INITIATIVES TABLE RLS POLICIES
-- =============================================================================

-- Initiatives: Inherit access from parent objective
CREATE POLICY "users_can_view_accessible_initiatives" ON initiatives
FOR SELECT
TO authenticated
USING (
    (
        owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
    OR EXISTS (
        SELECT 1 FROM objectives o
        WHERE o.id = objective_id
        AND (
            o.owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR (
                get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
                AND EXISTS (
                    SELECT 1 FROM user_profiles up
                    WHERE up.user_id = o.owner_id
                    AND up.organization_id = get_user_organization_id()
                )
            )
            OR (
                get_user_role() = 'manager'
                AND EXISTS (
                    SELECT 1 FROM user_profiles up
                    WHERE up.user_id = o.owner_id
                    AND user_has_department_access(up.department_id)
                )
            )
        )
    )
);

-- Similar policies for initiatives CREATE, UPDATE, DELETE
CREATE POLICY "users_can_create_initiatives" ON initiatives
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager')
);

CREATE POLICY "users_can_update_accessible_initiatives" ON initiatives
FOR UPDATE
TO authenticated
USING (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
        AND EXISTS (
            SELECT 1 FROM objectives o, user_profiles up
            WHERE o.id = objective_id
            AND up.user_id = o.owner_id
            AND up.organization_id = get_user_organization_id()
        )
    )
);

-- =============================================================================
-- ACTIVITIES TABLE RLS POLICIES
-- =============================================================================

-- Activities: Users can view activities assigned to them or in their scope
CREATE POLICY "users_can_view_accessible_activities" ON activities
FOR SELECT
TO authenticated
USING (
    (
        assigned_to = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
    OR EXISTS (
        SELECT 1 FROM initiatives i, objectives o
        WHERE i.id = initiative_id
        AND o.id = i.objective_id
        AND (
            i.owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR o.owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR (
                get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
                AND EXISTS (
                    SELECT 1 FROM user_profiles up
                    WHERE up.user_id IN (i.owner_id, o.owner_id)
                    AND up.organization_id = get_user_organization_id()
                )
            )
        )
    )
);

-- Similar policies for activities CREATE, UPDATE, DELETE
CREATE POLICY "users_can_create_activities" ON activities
FOR INSERT
TO authenticated
WITH CHECK (
    assigned_to = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager', 'team_lead')
);

CREATE POLICY "users_can_update_accessible_activities" ON activities
FOR UPDATE
TO authenticated
USING (
    assigned_to = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR (
        get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager', 'team_lead')
        AND EXISTS (
            SELECT 1 FROM initiatives i, objectives o, user_profiles up
            WHERE i.id = initiative_id
            AND o.id = i.objective_id
            AND up.user_id IN (assigned_to, i.owner_id, o.owner_id)
            AND up.organization_id = get_user_organization_id()
        )
    )
);

-- =============================================================================
-- KEY_RESULTS TABLE RLS POLICIES
-- =============================================================================

-- Key results: Inherit access from parent objective
CREATE POLICY "users_can_view_accessible_key_results" ON key_results
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM objectives o
        WHERE o.id = objective_id
        AND (
            o.owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR (
                get_user_role() IN ('super_admin', 'org_owner', 'org_admin')
                AND EXISTS (
                    SELECT 1 FROM user_profiles up
                    WHERE up.user_id = o.owner_id
                    AND up.organization_id = get_user_organization_id()
                )
            )
        )
    )
);

-- Key results: Users can create key results for objectives they own or manage
CREATE POLICY "users_can_create_key_results" ON key_results
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM objectives o
        WHERE o.id = objective_id
        AND (
            o.owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
            OR get_user_role() IN ('super_admin', 'org_owner', 'org_admin', 'manager')
        )
    )
);

-- =============================================================================
-- INDUSTRIES TABLE RLS POLICIES (Public Read)
-- =============================================================================

-- Industries: Public read access for all authenticated users
CREATE POLICY "authenticated_users_can_read_industries" ON industries
FOR SELECT
TO authenticated
USING (is_active = true);

-- Industries: Only super admins can modify industries
CREATE POLICY "super_admins_can_modify_industries" ON industries
FOR ALL
TO authenticated
USING (get_user_role() = 'super_admin');

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Create indexes for RLS function performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_stack_user_org_active
ON user_profiles (organization_id, role, department_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_stack_user_id_active
ON users (stack_user_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_departments_org_hierarchy
ON departments (organization_id, hierarchy_path, is_active)
WHERE is_active = true;

-- =============================================================================
-- AUDIT AND MONITORING
-- =============================================================================

-- Create audit log table for RLS policy violations
CREATE TABLE IF NOT EXISTS rls_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    policy_name VARCHAR(200) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    user_id VARCHAR(255),
    attempted_access JSONB,
    violation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log RLS violations (for monitoring)
CREATE OR REPLACE FUNCTION log_rls_violation(
    p_table_name VARCHAR(100),
    p_policy_name VARCHAR(200),
    p_operation VARCHAR(20),
    p_attempted_access JSONB,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO rls_audit_log (
        table_name,
        policy_name,
        operation,
        user_id,
        attempted_access,
        violation_reason
    ) VALUES (
        p_table_name,
        p_policy_name,
        p_operation,
        auth.user_id(),
        p_attempted_access,
        p_reason
    );
END;
$$;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON industries TO authenticated;

-- Refresh materialized views if any exist
-- (This would be for future materialized views)

SELECT 'RLS policies implementation completed successfully' AS result;