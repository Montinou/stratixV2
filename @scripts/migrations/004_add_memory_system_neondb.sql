-- Memory System Migration for StratixV2 (NeonDB Version)
-- Migration: 004_add_memory_system_neondb
-- Created: 2025-09-23
-- Description: Add comprehensive memory system tables for capturing, storing, and analyzing strategic knowledge (NeonDB compatible)
-- Dependencies: 003_add_ai_suggestions_neondb

-- =============================================================================
-- MEMORY SYSTEM ENUMS
-- =============================================================================

-- Create enum for memory types (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE memory_type AS ENUM ('insight', 'lesson', 'pattern', 'outcome', 'decision', 'blocker');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for memory relationship types (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE memory_relationship_type AS ENUM ('related', 'builds_on', 'contradicts', 'similar', 'caused_by', 'led_to');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- CORE MEMORY TABLES
-- =============================================================================

-- Main memories table for storing strategic knowledge and insights
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT, -- AI-generated or manually provided summary
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  memory_type memory_type NOT NULL DEFAULT 'insight',
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- AI-generated confidence
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5), -- User-rated impact
  context JSONB DEFAULT '{}', -- Additional context metadata
  search_vector TSVECTOR, -- For full-text search
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flexible tagging system for memories
CREATE TABLE IF NOT EXISTS public.memory_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tag_type TEXT DEFAULT 'manual' CHECK (tag_type IN ('manual', 'ai_generated', 'system')),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- For AI-generated tags
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(memory_id, tag) -- Prevent duplicate tags on same memory
);

-- Memory relationships and connections
CREATE TABLE IF NOT EXISTS public.memory_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  relationship_type memory_relationship_type NOT NULL DEFAULT 'related',
  strength NUMERIC(3,2) DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  description TEXT, -- Optional explanation of the relationship
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (source_memory_id != target_memory_id), -- Prevent self-references
  UNIQUE(source_memory_id, target_memory_id, relationship_type) -- Prevent duplicate relationships
);

-- Analytics and usage tracking for memories
CREATE TABLE IF NOT EXISTS public.memory_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'search_result', 'recommendation_shown', 'recommendation_clicked', 'shared', 'edited', 'tagged')),
  context_data JSONB DEFAULT '{}', -- Additional context for the action
  session_id TEXT, -- For grouping related actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory search history for improving recommendations
CREATE TABLE IF NOT EXISTS public.memory_search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  clicked_memory_ids UUID[], -- Array of memory IDs that user clicked on
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_memories_search_vector ON public.memories USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_memories_content_gin ON public.memories USING GIN(to_tsvector('english', title || ' ' || content));

-- B-tree indexes for common queries
CREATE INDEX IF NOT EXISTS idx_memories_creator_id ON public.memories(creator_id);
CREATE INDEX IF NOT EXISTS idx_memories_company_id ON public.memories(company_id);
CREATE INDEX IF NOT EXISTS idx_memories_objective_id ON public.memories(objective_id);
CREATE INDEX IF NOT EXISTS idx_memories_initiative_id ON public.memories(initiative_id);
CREATE INDEX IF NOT EXISTS idx_memories_activity_id ON public.memories(activity_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON public.memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at);
CREATE INDEX IF NOT EXISTS idx_memories_impact_score ON public.memories(impact_score);
CREATE INDEX IF NOT EXISTS idx_memories_archived ON public.memories(is_archived) WHERE is_archived = FALSE;

-- Indexes for memory tags
CREATE INDEX IF NOT EXISTS idx_memory_tags_memory_id ON public.memory_tags(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON public.memory_tags(tag);
CREATE INDEX IF NOT EXISTS idx_memory_tags_type ON public.memory_tags(tag_type);

-- Indexes for memory relationships
CREATE INDEX IF NOT EXISTS idx_memory_relationships_source ON public.memory_relationships(source_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_target ON public.memory_relationships(target_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_type ON public.memory_relationships(relationship_type);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_memory_analytics_memory_id ON public.memory_analytics(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_user_id ON public.memory_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_company_id ON public.memory_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_action ON public.memory_analytics(action_type);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_created_at ON public.memory_analytics(created_at);

-- Indexes for search history
CREATE INDEX IF NOT EXISTS idx_memory_search_history_user_id ON public.memory_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_search_history_company_id ON public.memory_search_history(company_id);
CREATE INDEX IF NOT EXISTS idx_memory_search_history_created_at ON public.memory_search_history(created_at);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update search vector when memory content changes
CREATE OR REPLACE FUNCTION public.update_memory_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.summary, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-set company_id for memories
CREATE OR REPLACE FUNCTION public.set_memory_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-set company_id for memory analytics
CREATE OR REPLACE FUNCTION public.set_memory_analytics_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_memories_updated_at 
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memory_relationships_updated_at 
  BEFORE UPDATE ON public.memory_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for search vector updates
CREATE TRIGGER update_memories_search_vector
  BEFORE INSERT OR UPDATE OF title, content, summary ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.update_memory_search_vector();

-- Add triggers to auto-set company_id
CREATE TRIGGER set_memories_company_id 
  BEFORE INSERT ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.set_memory_company_id();

CREATE TRIGGER set_memory_analytics_company_id 
  BEFORE INSERT ON public.memory_analytics
  FOR EACH ROW EXECUTE FUNCTION public.set_memory_analytics_company_id();

CREATE TRIGGER set_memory_search_history_company_id 
  BEFORE INSERT ON public.memory_search_history
  FOR EACH ROW EXECUTE FUNCTION public.set_memory_analytics_company_id();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all memory tables
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_search_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for memories table
CREATE POLICY "Company isolation for memories" ON public.memories
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own memories" ON public.memories
  FOR ALL USING (
    creator_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can manage all memories in company" ON public.memories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.memories.company_id
    )
  );

CREATE POLICY "Gerentes can view team memories in company" ON public.memories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p2.id = creator_id
      WHERE p1.id = auth.uid()
      AND p1.company_id = public.memories.company_id
      AND p2.company_id = public.memories.company_id
      AND (p1.role = 'gerente' AND p2.manager_id = p1.id)
    )
  );

-- RLS policies for memory_tags
CREATE POLICY "Company isolation for memory tags" ON public.memory_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE m.id = memory_id AND m.company_id = p.company_id
    )
  );

CREATE POLICY "Users can manage tags on accessible memories" ON public.memory_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = memory_id 
      AND (
        m.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'corporativo' AND company_id = m.company_id
        )
      )
    )
  );

-- RLS policies for memory_relationships
CREATE POLICY "Company isolation for memory relationships" ON public.memory_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memories m1, public.memories m2, public.profiles p
      WHERE m1.id = source_memory_id 
      AND m2.id = target_memory_id
      AND p.id = auth.uid()
      AND m1.company_id = p.company_id 
      AND m2.company_id = p.company_id
    )
  );

-- RLS policies for memory_analytics
CREATE POLICY "Company isolation for memory analytics" ON public.memory_analytics
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their own analytics" ON public.memory_analytics
  FOR SELECT USING (
    user_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can view all analytics in company" ON public.memory_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.memory_analytics.company_id
    )
  );

-- RLS policies for memory_search_history
CREATE POLICY "Company isolation for search history" ON public.memory_search_history
  FOR ALL USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own search history" ON public.memory_search_history
  FOR ALL USING (
    user_id = auth.uid() AND
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Corporativo can view search analytics in company" ON public.memory_search_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'corporativo' 
      AND company_id = public.memory_search_history.company_id
    )
  );

-- =============================================================================
-- UTILITY VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for memories with their tags
CREATE OR REPLACE VIEW public.memories_with_tags AS
SELECT 
  m.*,
  ARRAY_AGG(DISTINCT mt.tag) FILTER (WHERE mt.tag IS NOT NULL) AS tags,
  ARRAY_AGG(DISTINCT mt.tag) FILTER (WHERE mt.tag_type = 'ai_generated') AS ai_tags,
  ARRAY_AGG(DISTINCT mt.tag) FILTER (WHERE mt.tag_type = 'manual') AS manual_tags
FROM public.memories m
LEFT JOIN public.memory_tags mt ON m.id = mt.memory_id
WHERE m.is_archived = FALSE
GROUP BY m.id;

-- View for memory relationship network
CREATE OR REPLACE VIEW public.memory_network AS
SELECT 
  mr.id,
  mr.source_memory_id,
  m1.title AS source_title,
  mr.target_memory_id,
  m2.title AS target_title,
  mr.relationship_type,
  mr.strength,
  mr.description,
  mr.created_by,
  mr.created_at
FROM public.memory_relationships mr
JOIN public.memories m1 ON mr.source_memory_id = m1.id
JOIN public.memories m2 ON mr.target_memory_id = m2.id
WHERE m1.is_archived = FALSE AND m2.is_archived = FALSE;

-- =============================================================================
-- SAMPLE DATA FUNCTIONS (for testing)
-- =============================================================================

-- Function to generate sample memory data for testing
CREATE OR REPLACE FUNCTION public.create_sample_memory_data()
RETURNS TEXT AS $$
DECLARE
  sample_user_id UUID;
  sample_company_id UUID;
  sample_objective_id UUID;
  memory_id UUID;
BEGIN
  -- Get a sample user and company
  SELECT id INTO sample_user_id FROM public.users LIMIT 1;
  SELECT company_id INTO sample_company_id FROM public.profiles WHERE id = sample_user_id;
  SELECT id INTO sample_objective_id FROM public.objectives WHERE company_id = sample_company_id LIMIT 1;
  
  -- Insert sample memory
  INSERT INTO public.memories (title, content, creator_id, company_id, objective_id, memory_type, impact_score)
  VALUES 
    ('Q3 User Research Insights', 'Key finding: Users struggle with navigation in complex workflows. This led to 23% drop in task completion.', sample_user_id, sample_company_id, sample_objective_id, 'insight', 4)
  RETURNING id INTO memory_id;
  
  -- Insert sample tags
  INSERT INTO public.memory_tags (memory_id, tag, created_by)
  VALUES 
    (memory_id, 'user-research', sample_user_id),
    (memory_id, 'navigation', sample_user_id),
    (memory_id, 'ux-issues', sample_user_id);
    
  RETURN 'Sample memory data created successfully';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Migration completed successfully
SELECT 'Memory system migration (NeonDB version) completed successfully' AS result;