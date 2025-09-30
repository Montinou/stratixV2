-- =====================================================
-- Row Level Security (RLS) Policies for Multi-Tenant (NeonDB + Stack Auth)
-- =====================================================
--
-- Purpose: Ensure complete data isolation between tenants
-- Each user can only access data from their own tenant_id
--
-- Note: This version is adapted for NeonDB with Stack Auth
-- Uses current_setting for user context instead of Supabase auth functions
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
-- This function retrieves the tenant_id for the current authenticated user
-- The application must set 'app.current_user_id' before queries

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = current_setting('app.current_user_id', true)::text
  LIMIT 1;
$$;

-- Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO PUBLIC;

-- Step 3: Profiles Table Policies
-- =====================================================

-- SELECT: Users can view profiles from their own tenant
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

-- INSERT: Profiles must belong to user's tenant
CREATE POLICY "profiles_insert_policy" ON profiles
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- UPDATE: Users can only update profiles in their tenant
CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- DELETE: Corporativo role can delete profiles in their tenant
CREATE POLICY "profiles_delete_policy" ON profiles
FOR DELETE
USING (
  tenant_id = public.get_current_tenant_id() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = current_setting('app.current_user_id', true)::text
    AND role = 'corporativo'
  )
);

-- Step 4: Objectives Table Policies
-- =====================================================

CREATE POLICY "objectives_select_policy" ON objectives
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "objectives_insert_policy" ON objectives
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "objectives_update_policy" ON objectives
FOR UPDATE
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "objectives_delete_policy" ON objectives
FOR DELETE
USING (tenant_id = public.get_current_tenant_id());

-- Step 5: Initiatives Table Policies
-- =====================================================

CREATE POLICY "initiatives_select_policy" ON initiatives
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "initiatives_insert_policy" ON initiatives
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "initiatives_update_policy" ON initiatives
FOR UPDATE
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "initiatives_delete_policy" ON initiatives
FOR DELETE
USING (tenant_id = public.get_current_tenant_id());

-- Step 6: Activities Table Policies
-- =====================================================

CREATE POLICY "activities_select_policy" ON activities
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "activities_insert_policy" ON activities
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "activities_update_policy" ON activities
FOR UPDATE
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "activities_delete_policy" ON activities
FOR DELETE
USING (tenant_id = public.get_current_tenant_id());

-- Step 7: Key Results Table Policies
-- =====================================================

CREATE POLICY "key_results_select_policy" ON key_results
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "key_results_insert_policy" ON key_results
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "key_results_update_policy" ON key_results
FOR UPDATE
USING (tenant_id = public.get_current_tenant_id())
WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "key_results_delete_policy" ON key_results
FOR DELETE
USING (tenant_id = public.get_current_tenant_id());

-- Step 8: Comments Table Policies
-- =====================================================

CREATE POLICY "comments_select_policy" ON comments
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "comments_insert_policy" ON comments
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- UPDATE: Only comment author can update their own comments
CREATE POLICY "comments_update_policy" ON comments
FOR UPDATE
USING (
  tenant_id = public.get_current_tenant_id() AND
  author_id = current_setting('app.current_user_id', true)::text
)
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- DELETE: Only comment author can delete their own comments
CREATE POLICY "comments_delete_policy" ON comments
FOR DELETE
USING (
  tenant_id = public.get_current_tenant_id() AND
  author_id = current_setting('app.current_user_id', true)::text
);

-- Step 9: Update History Table Policies
-- =====================================================

CREATE POLICY "update_history_select_policy" ON update_history
FOR SELECT
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "update_history_insert_policy" ON update_history
FOR INSERT
WITH CHECK (tenant_id = public.get_current_tenant_id());

-- No UPDATE or DELETE for audit trail integrity

-- =====================================================
-- IMPORTANT: Application Setup Required
-- =====================================================
--
-- Before executing any queries, the application MUST set the current user:
--
-- In your database client initialization:
--
-- import { Pool } from 'pg';
--
-- const pool = new Pool({ connectionString: process.env.DATABASE_URL });
--
-- // Before any query, set the user context:
-- async function setUserContext(userId: string) {
--   await pool.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
-- }
--
-- Usage in API routes:
--
-- export async function GET(request: Request) {
--   const user = await stackServerApp.getUser();
--   await setUserContext(user.id);
--
--   // Now RLS policies will apply
--   const objectives = await db.select().from(objectivesTable);
--   return Response.json(objectives);
-- }
--
-- =====================================================

-- =====================================================
-- Verification Queries (for testing)
-- =====================================================

-- Test 1: Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test 2: Check policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Test 3: Test tenant isolation
-- SELECT set_config('app.current_user_id', 'test-user-id', false);
-- SELECT * FROM objectives; -- Should only show user's tenant data
