-- Remove old Supabase-style RLS policies that conflict with tenant-based isolation
-- These policies use auth.user_id() which doesn't work in non-Supabase environments
-- We keep only the tenant-based policies that use get_current_tenant_id()

-- Drop old objectives policies
DROP POLICY IF EXISTS "Users can view objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can manage own objectives" ON public.objectives;

-- Drop old initiatives policies
DROP POLICY IF EXISTS "Users can view initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can manage own initiatives" ON public.initiatives;

-- Drop old activities policies
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Users can manage own activities" ON public.activities;

-- Verify remaining policies (should only be tenant-based ones)
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('objectives', 'initiatives', 'activities')
ORDER BY tablename, policyname;
