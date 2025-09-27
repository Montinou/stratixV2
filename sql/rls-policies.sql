-- Row Level Security (RLS) Policies for Stack Auth + Neon Integration
-- Execute this after deploying the Drizzle migrations and configuring Stack Auth in Neon

-- =============================================================================
-- 🔒 ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 🧑‍💼 USER TABLE POLICIES
-- =============================================================================

-- Users can only see and manage their own user record
CREATE POLICY "users_own_data"
ON users FOR ALL
TO authenticated
USING (auth.user_id() = stack_user_id)
WITH CHECK (auth.user_id() = stack_user_id);

-- Allow users to view other users in the same tenant for assignments
CREATE POLICY "users_tenant_read"
ON users FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- =============================================================================
-- 🏢 COMPANY TABLE POLICIES  
-- =============================================================================

-- Users can view companies they belong to
CREATE POLICY "companies_tenant_access"
ON companies FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT p.company_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Only corporativo role can modify company data
CREATE POLICY "companies_admin_modify"
ON companies FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id() 
    AND p.role_type = 'corporativo'
    AND p.company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id() 
    AND p.role_type = 'corporativo'
  )
);

-- =============================================================================
-- 👤 PROFILE TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "profiles_own_profile"
ON profiles FOR ALL
TO authenticated
USING (
  user_id IN (
    SELECT u.id FROM users u 
    WHERE u.stack_user_id = auth.user_id()
  )
)
WITH CHECK (
  user_id IN (
    SELECT u.id FROM users u 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Users can view other profiles in their tenant/company
CREATE POLICY "profiles_tenant_read"
ON profiles FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Only corporativo and gerente can modify other profiles
CREATE POLICY "profiles_admin_modify"
ON profiles FOR UPDATE, DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id() 
    AND p.role_type IN ('corporativo', 'gerente')
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id() 
    AND p.role_type IN ('corporativo', 'gerente')
  )
);

-- =============================================================================
-- 🎯 OBJECTIVE TABLE POLICIES
-- =============================================================================

-- Tenant-based access for objectives
CREATE POLICY "objectives_tenant_access"
ON objectives FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
  AND deleted_at IS NULL -- Only show non-deleted objectives
);

-- Users can create objectives in their tenant
CREATE POLICY "objectives_tenant_create"
ON objectives FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Objective owners and managers can modify their objectives
CREATE POLICY "objectives_owner_modify"
ON objectives FOR UPDATE, DELETE
TO authenticated
USING (
  (
    -- Objective owner
    owner_id IN (
      SELECT u.id FROM users u 
      WHERE u.stack_user_id = auth.user_id()
    )
    OR
    -- Managers in the same tenant
    tenant_id IN (
      SELECT p.tenant_id 
      FROM profiles p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.stack_user_id = auth.user_id() 
      AND p.role_type IN ('corporativo', 'gerente')
    )
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- =============================================================================
-- 🚀 INITIATIVE TABLE POLICIES
-- =============================================================================

-- Tenant-based access for initiatives
CREATE POLICY "initiatives_tenant_access"
ON initiatives FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
  AND deleted_at IS NULL
);

-- Users can create initiatives in their tenant
CREATE POLICY "initiatives_tenant_create"
ON initiatives FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Initiative owners and managers can modify initiatives
CREATE POLICY "initiatives_owner_modify"
ON initiatives FOR UPDATE, DELETE
TO authenticated
USING (
  (
    -- Initiative owner
    owner_id IN (
      SELECT u.id FROM users u 
      WHERE u.stack_user_id = auth.user_id()
    )
    OR
    -- Managers in the same tenant
    tenant_id IN (
      SELECT p.tenant_id 
      FROM profiles p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.stack_user_id = auth.user_id() 
      AND p.role_type IN ('corporativo', 'gerente')
    )
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- =============================================================================
-- ✅ ACTIVITY TABLE POLICIES
-- =============================================================================

-- Tenant-based access for activities
CREATE POLICY "activities_tenant_access"
ON activities FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
  AND deleted_at IS NULL
);

-- Users can create activities in their tenant
CREATE POLICY "activities_tenant_create"
ON activities FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- Activity assignees, initiative owners, and managers can modify activities
CREATE POLICY "activities_assignee_modify"
ON activities FOR UPDATE, DELETE
TO authenticated
USING (
  (
    -- Activity assignee
    assigned_to IN (
      SELECT u.id FROM users u 
      WHERE u.stack_user_id = auth.user_id()
    )
    OR
    -- Initiative owner (through initiative relationship)
    initiative_id IN (
      SELECT i.id FROM initiatives i
      JOIN users u ON i.owner_id = u.id
      WHERE u.stack_user_id = auth.user_id()
    )
    OR
    -- Managers in the same tenant
    tenant_id IN (
      SELECT p.tenant_id 
      FROM profiles p 
      JOIN users u ON u.id = p.user_id 
      WHERE u.stack_user_id = auth.user_id() 
      AND p.role_type IN ('corporativo', 'gerente')
    )
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
  )
);

-- =============================================================================
-- 🔍 HELPER FUNCTIONS FOR COMMON CHECKS
-- =============================================================================

-- Function to check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_role_in_tenant(required_role user_role, target_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id() 
    AND p.role_type = required_role 
    AND p.tenant_id = target_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT p.tenant_id 
    FROM profiles p 
    JOIN users u ON u.id = p.user_id 
    WHERE u.stack_user_id = auth.user_id()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 📊 RLS TESTING QUERIES (Run these to verify policies work)
-- =============================================================================

-- Test 1: Verify user can only see their own user record
-- Should return only the authenticated user's record
-- SELECT * FROM users;

-- Test 2: Verify tenant isolation for objectives  
-- Should only return objectives from user's tenant
-- SELECT * FROM objectives;

-- Test 3: Verify role-based access for company modifications
-- Should only allow corporativo users to modify companies
-- UPDATE companies SET name = 'Test' WHERE id = '<some_company_id>';

-- Test 4: Verify soft deletes are respected
-- Should not return deleted records
-- SELECT * FROM objectives WHERE deleted_at IS NOT NULL;

-- =============================================================================
-- 🚨 IMPORTANT NOTES
-- =============================================================================

-- 1. These policies assume that:
--    - Stack Auth is configured as JWT provider in Neon
--    - auth.user_id() returns the stack_user_id from JWT token
--    - All users have profiles with tenant_id populated

-- 2. Before applying these policies:
--    - Deploy Drizzle migrations first
--    - Ensure all existing data has tenant_id populated
--    - Test policies in development environment

-- 3. To disable RLS temporarily for debugging:
--    ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;

-- 4. To check which policies are active:
--    SELECT * FROM pg_policies WHERE tablename IN ('users', 'companies', 'profiles', 'objectives', 'initiatives', 'activities');

-- 5. Performance considerations:
--    - These policies use subqueries which may impact performance
--    - Consider creating materialized views or caching for high-traffic scenarios
--    - Monitor query execution plans after implementing