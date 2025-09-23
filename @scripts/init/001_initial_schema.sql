-- Initial Schema Migration for StratixV2 OKR Management System
-- This file creates the basic database structure for the OKR application
-- Migration: 001_initial_schema
-- Created: 2025-09-23
-- Description: Core tables, enums, and functions for OKR management

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('corporativo', 'gerente', 'empleado');

-- Create enum for OKR status
CREATE TYPE okr_status AS ENUM ('no_iniciado', 'en_progreso', 'completado', 'pausado');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add triggers for updated_at
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

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
SELECT 'Initial schema migration completed successfully' AS result;