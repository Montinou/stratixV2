-- Initial Schema Migration for StratixV2 OKR Management System (NeonDB Version)
-- This file creates the basic database structure for the OKR application
-- Migration: 001_initial_schema_neondb
-- Created: 2025-09-23
-- Description: Core tables, enums, and functions for OKR management (NeonDB compatible)

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('corporativo', 'gerente', 'empleado');

-- Create enum for OKR status
CREATE TYPE okr_status AS ENUM ('no_iniciado', 'en_progreso', 'completado', 'pausado');

-- =============================================================================
-- AUTH SIMULATION (for NeonDB without Supabase Auth)
-- =============================================================================

-- Create users table to simulate auth.users (since NeonDB doesn't have Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  invited_at TIMESTAMP WITH TIME ZONE,
  confirmation_token TEXT,
  confirmation_sent_at TIMESTAMP WITH TIME ZONE,
  recovery_token TEXT,
  recovery_sent_at TIMESTAMP WITH TIME ZONE,
  email_change_token TEXT,
  email_change TEXT,
  email_change_sent_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  is_super_admin BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth function simulation
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
BEGIN
  -- This is a placeholder - in real implementation, this would return the current user's ID
  -- For testing purposes, we'll return the first user or null
  RETURN (SELECT id FROM public.users LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create view in auth schema for compatibility
CREATE OR REPLACE VIEW auth.users AS 
SELECT * FROM public.users;

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Create profiles table (extends users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'empleado',
  department TEXT,
  manager_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create objectives table
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  department TEXT,
  status okr_status DEFAULT 'no_iniciado',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create initiatives table
CREATE TABLE IF NOT EXISTS public.initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  status okr_status DEFAULT 'no_iniciado',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  initiative_id UUID NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  status okr_status DEFAULT 'no_iniciado',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'empleado')
  );
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Create trigger for auto-creating profiles
DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for users (basic access)
CREATE POLICY "Users can view their own user record" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own user record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for profiles
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

-- RLS policies for objectives
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

-- RLS policies for initiatives (similar to objectives)
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

-- RLS policies for activities (similar to objectives and initiatives)
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
-- COMPLETION
-- =============================================================================

-- Migration completed successfully
SELECT 'Initial schema migration (NeonDB version) completed successfully' AS result;