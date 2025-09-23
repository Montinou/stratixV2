-- Rollback Script for Multitenant Support Migration
-- Rollback: 002_add_multitenant_support
-- Created: 2025-09-23
-- Description: Remove multitenant features and restore single-tenant policies
-- WARNING: This will permanently delete company and import_logs data

-- =============================================================================
-- SAFETY CHECK
-- =============================================================================

-- Confirm this is intentional (comment out to proceed)
DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK WARNING: This will permanently delete company and import logs data';
    RAISE NOTICE 'Comment out the RAISE EXCEPTION line to proceed with rollback';
    RAISE EXCEPTION 'Rollback safety check - remove this line to proceed';
END $$;

-- =============================================================================
-- DROP TRIGGERS
-- =============================================================================

-- Drop company_id auto-setting triggers
DROP TRIGGER IF EXISTS set_objectives_company_id ON public.objectives;
DROP TRIGGER IF EXISTS set_initiatives_company_id ON public.initiatives;
DROP TRIGGER IF EXISTS set_activities_company_id ON public.activities;

-- Drop updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS update_import_logs_updated_at ON public.import_logs;

-- =============================================================================
-- DROP FUNCTIONS
-- =============================================================================

-- Drop company_id setting function
DROP FUNCTION IF EXISTS public.set_company_id();

-- =============================================================================
-- RESTORE ORIGINAL RLS POLICIES
-- =============================================================================

-- Drop multitenant policies for profiles
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Corporativo can manage all profiles in company" ON public.profiles;

-- Restore original profile policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Corporativo can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'corporativo'
    )
  );

CREATE POLICY "Gerentes can view their team profiles" ON public.profiles
  FOR SELECT USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('corporativo', 'gerente')
    )
  );

-- Drop multitenant policies for objectives
DROP POLICY IF EXISTS "Company isolation for objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can manage their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Corporativo can manage all objectives in company" ON public.objectives;
DROP POLICY IF EXISTS "Gerentes can view team objectives in company" ON public.objectives;

-- Restore original objectives policies
CREATE POLICY "Users can view their own objectives" ON public.objectives
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own objectives" ON public.objectives
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own objectives" ON public.objectives
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own objectives" ON public.objectives
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Corporativo can view all objectives" ON public.objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'corporativo'
    )
  );

CREATE POLICY "Gerentes can view team objectives" ON public.objectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.id = auth.uid()
      WHERE p2.id = owner_id 
      AND (p1.role = 'corporativo' OR (p1.role = 'gerente' AND p2.manager_id = p1.id))
    )
  );

-- Drop multitenant policies for initiatives
DROP POLICY IF EXISTS "Company isolation for initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can manage their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Corporativo can manage all initiatives in company" ON public.initiatives;

-- Restore original initiatives policies
CREATE POLICY "Users can view their own initiatives" ON public.initiatives
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own initiatives" ON public.initiatives
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own initiatives" ON public.initiatives
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own initiatives" ON public.initiatives
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Corporativo can view all initiatives" ON public.initiatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'corporativo'
    )
  );

CREATE POLICY "Gerentes can view team initiatives" ON public.initiatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.id = auth.uid()
      WHERE p2.id = owner_id 
      AND (p1.role = 'corporativo' OR (p1.role = 'gerente' AND p2.manager_id = p1.id))
    )
  );

-- Drop multitenant policies for activities
DROP POLICY IF EXISTS "Company isolation for activities" ON public.activities;
DROP POLICY IF EXISTS "Users can manage their own activities" ON public.activities;
DROP POLICY IF EXISTS "Corporativo can manage all activities in company" ON public.activities;

-- Restore original activities policies
CREATE POLICY "Users can view their own activities" ON public.activities
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own activities" ON public.activities
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own activities" ON public.activities
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own activities" ON public.activities
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Corporativo can view all activities" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'corporativo'
    )
  );

CREATE POLICY "Gerentes can view team activities" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.id = auth.uid()
      WHERE p2.id = owner_id 
      AND (p1.role = 'corporativo' OR (p1.role = 'gerente' AND p2.manager_id = p1.id))
    )
  );

-- =============================================================================
-- DROP IMPORT_LOGS TABLE
-- =============================================================================

-- Drop import_logs policies first
DROP POLICY IF EXISTS "Users can view import logs in their company" ON public.import_logs;
DROP POLICY IF EXISTS "Users can create import logs in their company" ON public.import_logs;

-- Drop import_logs table
DROP TABLE IF EXISTS public.import_logs;

-- =============================================================================
-- DROP COMPANIES TABLE
-- =============================================================================

-- Drop companies policies first
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Corporativo can update their company" ON public.companies;

-- Drop companies table
DROP TABLE IF EXISTS public.companies;

-- =============================================================================
-- REMOVE COMPANY_ID COLUMNS
-- =============================================================================

-- Remove company_id columns from existing tables
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.objectives DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.initiatives DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.activities DROP COLUMN IF EXISTS company_id;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Rollback completed successfully
SELECT 'Multitenant support migration rolled back successfully' AS result;