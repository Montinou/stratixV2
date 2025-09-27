-- Onboarding System Migration for StratixV2 OKR Management System (NeonDB Version)
-- This file extends the database with onboarding session management
-- Migration: 006_add_onboarding_system_neondb
-- Created: 2025-09-27
-- Description: Onboarding sessions, industries, and organization setup tables

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Create enum for onboarding status
DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for organization size
DO $$ BEGIN
    CREATE TYPE organization_size AS ENUM ('startup', 'pyme', 'empresa', 'corporacion');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Create industries table for AI-powered suggestions
CREATE TABLE IF NOT EXISTS public.industries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  ai_context JSONB DEFAULT '{}',
  okr_examples JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create onboarding_sessions table
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE,
  status onboarding_status DEFAULT 'in_progress',
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 5,
  form_data JSONB NOT NULL DEFAULT '{}',
  ai_suggestions JSONB DEFAULT '{}',
  ai_analysis JSONB DEFAULT '{}',
  completion_percentage FLOAT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organizations table for company setup during onboarding
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry_id INTEGER REFERENCES public.industries(id),
  size organization_size NOT NULL,
  description TEXT,
  website VARCHAR(255),
  country VARCHAR(100),
  city VARCHAR(100),
  employee_count INTEGER,
  founded_year INTEGER,
  okr_maturity VARCHAR(50) DEFAULT 'beginner',
  business_goals JSONB DEFAULT '[]',
  current_challenges JSONB DEFAULT '[]',
  ai_insights JSONB DEFAULT '{}',
  created_by TEXT NOT NULL REFERENCES neon_auth.users_sync(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table for user-organization relationships
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(100),
  job_title VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create onboarding_progress table for step-by-step tracking
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_data JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  ai_validation JSONB DEFAULT '{}',
  completion_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, step_number)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON public.onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_expires_at ON public.onboarding_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_created_at ON public.onboarding_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_organizations_industry_id ON public.organizations(industry_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_size ON public.organizations(size);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_session_id ON public.onboarding_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step_number ON public.onboarding_progress(step_number);

CREATE INDEX IF NOT EXISTS idx_industries_category ON public.industries(category);
CREATE INDEX IF NOT EXISTS idx_industries_name ON public.industries(name);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Add triggers for updated_at
CREATE TRIGGER update_industries_updated_at BEFORE UPDATE ON public.industries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_sessions_updated_at BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for industries (public read access)
CREATE POLICY "Anyone can read industries" ON public.industries
  FOR SELECT USING (true);

-- RLS policies for onboarding_sessions
CREATE POLICY "Users can view their own onboarding sessions" ON public.onboarding_sessions
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own onboarding sessions" ON public.onboarding_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own onboarding sessions" ON public.onboarding_sessions
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own onboarding sessions" ON public.onboarding_sessions
  FOR DELETE USING (user_id = auth.uid()::text);

-- RLS policies for organizations
CREATE POLICY "Organization members can view their organizations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
      AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Organization creators can update their organizations" ON public.organizations
  FOR UPDATE USING (created_by = auth.uid()::text);

-- RLS policies for organization_members
CREATE POLICY "Organization members can view membership records" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
      AND om2.user_id = auth.uid()::text
      AND om2.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization admins can manage memberships" ON public.organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.organization_id = organization_members.organization_id
      AND om2.user_id = auth.uid()::text
      AND om2.role IN ('admin', 'owner')
    )
  );

-- RLS policies for onboarding_progress
CREATE POLICY "Users can view their own onboarding progress" ON public.onboarding_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_sessions
      WHERE id = onboarding_progress.session_id
      AND user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own onboarding progress" ON public.onboarding_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_sessions
      WHERE id = onboarding_progress.session_id
      AND user_id = auth.uid()::text
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to cleanup expired onboarding sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_onboarding_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired onboarding sessions
  DELETE FROM public.onboarding_sessions
  WHERE expires_at < NOW() AND status = 'in_progress';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Function to calculate onboarding completion percentage
CREATE OR REPLACE FUNCTION public.calculate_onboarding_completion(session_uuid UUID)
RETURNS FLOAT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  completion_percentage FLOAT;
BEGIN
  -- Get total steps from session
  SELECT total_steps INTO total_steps
  FROM public.onboarding_sessions
  WHERE id = session_uuid;

  IF total_steps IS NULL OR total_steps = 0 THEN
    RETURN 0.0;
  END IF;

  -- Count completed steps
  SELECT COUNT(*) INTO completed_steps
  FROM public.onboarding_progress
  WHERE session_id = session_uuid AND completed = true;

  -- Calculate percentage
  completion_percentage = (completed_steps::FLOAT / total_steps::FLOAT) * 100.0;

  -- Update the session with calculated percentage
  UPDATE public.onboarding_sessions
  SET completion_percentage = completion_percentage,
      updated_at = NOW()
  WHERE id = session_uuid;

  RETURN completion_percentage;
END;
$$;

-- Function to auto-complete onboarding when all steps are done
CREATE OR REPLACE FUNCTION public.auto_complete_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_completion FLOAT;
BEGIN
  -- Calculate completion percentage
  session_completion = public.calculate_onboarding_completion(NEW.session_id);

  -- If 100% complete, mark session as completed
  IF session_completion >= 100.0 THEN
    UPDATE public.onboarding_sessions
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.session_id AND status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-complete onboarding
CREATE TRIGGER trigger_auto_complete_onboarding
  AFTER UPDATE OF completed ON public.onboarding_progress
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION public.auto_complete_onboarding();

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Insert sample industries for onboarding
INSERT INTO public.industries (name, category, description, ai_context, okr_examples) VALUES
  ('Tecnología de Software', 'Tecnología', 'Desarrollo de software, aplicaciones y plataformas digitales',
   '{"keywords": ["desarrollo", "producto", "usuarios", "escalabilidad"], "metrics": ["DAU", "churn", "time to market"]}',
   '[{"objective": "Aumentar la base de usuarios activos", "key_results": ["Alcanzar 10K usuarios activos mensuales", "Reducir churn rate a menos del 5%", "Implementar 3 features clave"]}]'),

  ('E-commerce', 'Comercio', 'Comercio electrónico y ventas online',
   '{"keywords": ["ventas", "conversión", "inventario", "experiencia"], "metrics": ["conversion rate", "AOV", "CAC"]}',
   '[{"objective": "Incrementar ventas online", "key_results": ["Aumentar conversion rate al 3.5%", "Crecer ventas en 40%", "Reducir tiempo de entrega a 24h"]}]'),

  ('Fintech', 'Servicios Financieros', 'Tecnología financiera y servicios bancarios digitales',
   '{"keywords": ["compliance", "seguridad", "transacciones", "regulación"], "metrics": ["transaction volume", "fraud rate", "user acquisition"]}',
   '[{"objective": "Expandir servicios financieros", "key_results": ["Procesar $1M en transacciones", "Mantener fraud rate <0.1%", "Obtener 2 licencias regulatorias"]}]'),

  ('Salud Digital', 'Salud', 'Soluciones tecnológicas para el sector salud',
   '{"keywords": ["pacientes", "diagnóstico", "telemedicina", "datos"], "metrics": ["patient satisfaction", "diagnostic accuracy", "consultation time"]}',
   '[{"objective": "Mejorar atención médica digital", "key_results": ["95% satisfacción de pacientes", "Reducir tiempo de consulta 30%", "Integrar con 5 hospitales"]}]'),

  ('Educación Online', 'Educación', 'Plataformas educativas y e-learning',
   '{"keywords": ["estudiantes", "cursos", "aprendizaje", "certificación"], "metrics": ["completion rate", "student engagement", "knowledge retention"]}',
   '[{"objective": "Aumentar efectividad del aprendizaje", "key_results": ["80% completion rate en cursos", "Mejorar retención 25%", "Lanzar 10 cursos nuevos"]}]'),

  ('SaaS B2B', 'Software', 'Software como servicio para empresas',
   '{"keywords": ["empresas", "productividad", "integración", "escalabilidad"], "metrics": ["MRR", "LTV", "feature adoption"]}',
   '[{"objective": "Expandir base de clientes B2B", "key_results": ["Alcanzar $100K MRR", "Aumentar LTV 50%", "Integrar con 3 plataformas populares"]}]'),

  ('Marketing Digital', 'Marketing', 'Agencias y herramientas de marketing digital',
   '{"keywords": ["campañas", "ROI", "audiencia", "conversión"], "metrics": ["CTR", "ROAS", "lead quality"]}',
   '[{"objective": "Optimizar rendimiento de campañas", "key_results": ["Aumentar ROAS al 400%", "Mejorar CTR en 25%", "Generar 1000 leads cualificados"]}]'),

  ('Recursos Humanos', 'Servicios', 'Plataformas de gestión de talento y RRHH',
   '{"keywords": ["talento", "reclutamiento", "empleados", "retención"], "metrics": ["time to hire", "employee satisfaction", "retention rate"]}',
   '[{"objective": "Optimizar gestión de talento", "key_results": ["Reducir time-to-hire a 15 días", "90% satisfacción empleados", "Retención >85%"]}]')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Migration completed successfully
SELECT 'Onboarding system migration (NeonDB version) completed successfully' AS result;