-- =====================================================
-- Row Level Security (RLS) Policies for Multi-Tenant
-- =====================================================
--
-- Purpose: Ensure complete data isolation between tenants
-- Each user can only access data from their own tenant_id
--
-- Tables covered:
-- - profiles
-- - objectives
-- - initiatives
-- - activities
-- - key_results
-- - comments
-- - update_history
--
-- =====================================================

-- Step 1: Enable RLS on all tenant-scoped tables
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_history ENABLE ROW LEVEL SECURITY;

-- Step 2: Create helper function to get current user's tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION auth.user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_tenant_id() TO anon;

-- Step 3: Profiles Table Policies
-- =====================================================

-- SELECT: Users can view profiles from their own tenant
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

-- INSERT: Profiles must belong to user's tenant
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

-- UPDATE: Users can only update profiles in their tenant
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
TO authenticated
USING (tenant_id = auth.user_tenant_id())
WITH CHECK (tenant_id = auth.user_tenant_id());

-- DELETE: Corporativo role can delete profiles in their tenant
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
TO authenticated
USING (
  tenant_id = auth.user_tenant_id() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role_type = 'corporativo'
  )
);

-- Step 4: Objectives Table Policies
-- =====================================================

CREATE POLICY "objectives_select_policy" ON objectives
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "objectives_insert_policy" ON objectives
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "objectives_update_policy" ON objectives
FOR UPDATE
TO authenticated
USING (tenant_id = auth.user_tenant_id())
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "objectives_delete_policy" ON objectives
FOR DELETE
TO authenticated
USING (tenant_id = auth.user_tenant_id());

-- Step 5: Initiatives Table Policies
-- =====================================================

CREATE POLICY "initiatives_select_policy" ON initiatives
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "initiatives_insert_policy" ON initiatives
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "initiatives_update_policy" ON initiatives
FOR UPDATE
TO authenticated
USING (tenant_id = auth.user_tenant_id())
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "initiatives_delete_policy" ON initiatives
FOR DELETE
TO authenticated
USING (tenant_id = auth.user_tenant_id());

-- Step 6: Activities Table Policies
-- =====================================================

CREATE POLICY "activities_select_policy" ON activities
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "activities_insert_policy" ON activities
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "activities_update_policy" ON activities
FOR UPDATE
TO authenticated
USING (tenant_id = auth.user_tenant_id())
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "activities_delete_policy" ON activities
FOR DELETE
TO authenticated
USING (tenant_id = auth.user_tenant_id());

-- Step 7: Key Results Table Policies
-- =====================================================

CREATE POLICY "key_results_select_policy" ON key_results
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "key_results_insert_policy" ON key_results
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "key_results_update_policy" ON key_results
FOR UPDATE
TO authenticated
USING (tenant_id = auth.user_tenant_id())
WITH CHECK (tenant_id = auth.user_tenant_id());

CREATE POLICY "key_results_delete_policy" ON key_results
FOR DELETE
TO authenticated
USING (tenant_id = auth.user_tenant_id());

-- Step 8: Comments Table Policies
-- =====================================================

CREATE POLICY "comments_select_policy" ON comments
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "comments_insert_policy" ON comments
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

-- UPDATE: Only comment author can update their own comments
CREATE POLICY "comments_update_policy" ON comments
FOR UPDATE
TO authenticated
USING (
  tenant_id = auth.user_tenant_id() AND
  author_id = auth.uid()
)
WITH CHECK (tenant_id = auth.user_tenant_id());

-- DELETE: Only comment author can delete their own comments
CREATE POLICY "comments_delete_policy" ON comments
FOR DELETE
TO authenticated
USING (
  tenant_id = auth.user_tenant_id() AND
  author_id = auth.uid()
);

-- Step 9: Update History Table Policies
-- =====================================================

CREATE POLICY "update_history_select_policy" ON update_history
FOR SELECT
TO authenticated
USING (tenant_id = auth.user_tenant_id());

CREATE POLICY "update_history_insert_policy" ON update_history
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = auth.user_tenant_id());

-- No UPDATE or DELETE for audit trail integrity

-- Step 10: Grant necessary permissions
-- =====================================================

-- Ensure authenticated users can access their tenant data
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON objectives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON initiatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON key_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT ON update_history TO authenticated;

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================

-- Test 1: Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test 2: Check policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Test 3: Test tenant isolation (set auth.uid() first)
-- SET LOCAL auth.uid TO 'test-user-id';
-- SELECT * FROM objectives; -- Should only show user's tenant data
