-- Rollback Script for Initial Schema Migration
-- Rollback: 001_initial_schema
-- Created: 2025-09-23
-- Description: Complete database teardown - removes all application objects
-- WARNING: This will permanently delete ALL application data

-- =============================================================================
-- SAFETY CHECK
-- =============================================================================

-- Confirm this is intentional (comment out to proceed)
DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK WARNING: This will permanently delete ALL application data';
    RAISE NOTICE 'This is a complete database teardown operation';
    RAISE NOTICE 'Comment out the RAISE EXCEPTION line to proceed with rollback';
    RAISE EXCEPTION 'Rollback safety check - remove this line to proceed';
END $$;

-- =============================================================================
-- DROP TRIGGERS
-- =============================================================================

-- Drop auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_objectives_updated_at ON public.objectives;
DROP TRIGGER IF EXISTS update_initiatives_updated_at ON public.initiatives;
DROP TRIGGER IF EXISTS update_activities_updated_at ON public.activities;

-- =============================================================================
-- DROP POLICIES (RLS)
-- =============================================================================

-- Drop all RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Corporativo can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view their team profiles" ON public.profiles;

-- Drop all RLS policies for objectives
DROP POLICY IF EXISTS "Users can view their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can create their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can update their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can delete their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Corporativo can view all objectives" ON public.objectives;
DROP POLICY IF EXISTS "Gerentes can view team objectives" ON public.objectives;

-- Drop all RLS policies for initiatives
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can create their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Corporativo can view all initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Gerentes can view team initiatives" ON public.initiatives;

-- Drop all RLS policies for activities
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;
DROP POLICY IF EXISTS "Corporativo can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Gerentes can view team activities" ON public.activities;

-- =============================================================================
-- DROP TABLES (IN DEPENDENCY ORDER)
-- =============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.initiatives CASCADE;
DROP TABLE IF EXISTS public.objectives CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =============================================================================
-- DROP FUNCTIONS
-- =============================================================================

-- Drop custom functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- =============================================================================
-- DROP ENUMS
-- =============================================================================

-- Drop custom enums
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS okr_status;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Rollback completed successfully
SELECT 'Initial schema migration rolled back successfully - Database clean' AS result;