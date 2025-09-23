-- AI Suggestions Migration for StratixV2 (NeonDB Version)
-- Migration: 003_add_ai_suggestions_neondb
-- Created: 2025-09-23
-- Description: Add AI suggestion tracking and analytics capabilities (NeonDB compatible)
-- Dependencies: 002_add_multitenant_support

-- =============================================================================
-- AI SUGGESTIONS TABLE
-- =============================================================================

-- Create table to store AI suggestion history for analytics
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  objective_title TEXT,
  objective_description TEXT,
  department TEXT,
  suggestion_type TEXT NOT NULL, -- 'initiative', 'activity', 'metric', etc.
  suggestion_text TEXT NOT NULL,
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own AI suggestions" ON public.ai_suggestions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own AI suggestions" ON public.ai_suggestions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own AI suggestions" ON public.ai_suggestions
  FOR UPDATE USING (user_id = auth.uid());

-- Corporate users can view all suggestions for analytics
CREATE POLICY "Corporate can view all AI suggestions" ON public.ai_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'corporativo'
    )
  );

-- =============================================================================
-- TRIGGERS AND INDEXES
-- =============================================================================

-- Add trigger for updated_at
CREATE TRIGGER update_ai_suggestions_updated_at 
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_created_at ON public.ai_suggestions(created_at);
CREATE INDEX idx_ai_suggestions_suggestion_type ON public.ai_suggestions(suggestion_type);

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Migration completed successfully
SELECT 'AI suggestions migration (NeonDB version) completed successfully' AS result;