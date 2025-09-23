-- Multitenant Support Migration for StratixV2 (NeonDB Version)
-- Migration: 002_add_multitenant_support_neondb
-- Created: 2025-09-23
-- Description: Add company-based multitenancy to the OKR application (NeonDB compatible)
-- Dependencies: 001_initial_schema_neondb

-- =============================================================================
-- COMPANY TABLES
-- =============================================================================

-- Add companies table for multitenant support
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create import_logs table for tracking file imports
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xlsx', 'csv')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  total_records INTEGER DEFAULT 0,
  successful_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}',
  import_period_start DATE,
  import_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SCHEMA MODIFICATIONS
-- =============================================================================

-- Add company_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.objectives ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.initiatives ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Corporativo can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view their team profiles" ON public.profiles;

-- New RLS policies for profiles with company isolation
CREATE POLICY "Users can view profiles in their company" ON public.profiles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id AND 
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can manage all profiles in company" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.profiles.company_id
    )
  );

-- Update objectives policies
DROP POLICY IF EXISTS "Users can view their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can create their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can update their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Users can delete their own objectives" ON public.objectives;
DROP POLICY IF EXISTS "Corporativo can view all objectives" ON public.objectives;
DROP POLICY IF EXISTS "Gerentes can view team objectives" ON public.objectives;

CREATE POLICY "Company isolation for objectives" ON public.objectives
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own objectives" ON public.objectives
  FOR ALL USING (
    owner_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can manage all objectives in company" ON public.objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.objectives.company_id
    )
  );

CREATE POLICY "Gerentes can view team objectives in company" ON public.objectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p2.id = owner_id
      WHERE p1.id = auth.uid()
      AND p1.company_id = public.objectives.company_id
      AND p2.company_id = public.objectives.company_id
      AND (p1.role = 'gerente' AND p2.manager_id = p1.id)
    )
  );

-- Similar updates for initiatives
DROP POLICY IF EXISTS "Users can view their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can create their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can update their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Users can delete their own initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Corporativo can view all initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Gerentes can view team initiatives" ON public.initiatives;

CREATE POLICY "Company isolation for initiatives" ON public.initiatives
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own initiatives" ON public.initiatives
  FOR ALL USING (
    owner_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can manage all initiatives in company" ON public.initiatives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.initiatives.company_id
    )
  );

-- Activities policies
DROP POLICY IF EXISTS "Users can view their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can create their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;
DROP POLICY IF EXISTS "Corporativo can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Gerentes can view team activities" ON public.activities;

CREATE POLICY "Company isolation for activities" ON public.activities
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own activities" ON public.activities
  FOR ALL USING (
    owner_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can manage all activities in company" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.activities.company_id
    )
  );

-- RLS policies for companies table
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (
    id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can update their company" ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.companies.id
    )
  );

-- RLS policies for import_logs
CREATE POLICY "Users can view import logs in their company" ON public.import_logs
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create import logs in their company" ON public.import_logs
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND
    user_id = auth.uid()
  );

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_logs_updated_at BEFORE UPDATE ON public.import_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to set company_id automatically
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to auto-set company_id
CREATE TRIGGER set_objectives_company_id BEFORE INSERT ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

CREATE TRIGGER set_initiatives_company_id BEFORE INSERT ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

CREATE TRIGGER set_activities_company_id BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Migration completed successfully
SELECT 'Multitenant support migration (NeonDB version) completed successfully' AS result;