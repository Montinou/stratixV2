-- Memory System Migration for StratixV2 (NeonDB Version)
-- Migration: 004_add_memory_system_neondb
-- Created: 2025-09-24
-- Description: Add comprehensive memory system for capturing and analyzing strategic knowledge (NeonDB compatible)
-- Dependencies: 003_add_ai_suggestions_neondb

-- =============================================================================
-- MEMORY SYSTEM ENUMS
-- =============================================================================

-- Memory type enumeration
CREATE TYPE memory_type AS ENUM (
    'insight',    -- Strategic insight or learning
    'lesson',     -- Lesson learned from failure/success
    'pattern',    -- Recurring pattern observed
    'outcome',    -- Result or outcome documented
    'decision',   -- Important decision made
    'blocker'     -- Obstacle or challenge encountered
);

-- Memory relationship type enumeration
CREATE TYPE memory_relationship_type AS ENUM (
    'related',     -- General relationship
    'builds_on',   -- This memory builds upon another
    'contradicts', -- This memory contradicts another
    'similar',     -- Similar to another memory
    'caused_by',   -- This memory was caused by another
    'led_to'       -- This memory led to another
);

-- =============================================================================
-- CORE MEMORY TABLES
-- =============================================================================

-- Main memories table
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT, -- AI-generated or user summary
    memory_type memory_type NOT NULL DEFAULT 'insight',
    
    -- Relationships to existing entities
    objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
    initiative_id UUID REFERENCES public.initiatives(id) ON DELETE SET NULL, 
    activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
    
    -- User and company context
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    
    -- Scoring and impact
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 5) DEFAULT 3,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    
    -- Full-text search vector
    search_vector tsvector,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    archived BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory tags for flexible categorization
CREATE TABLE IF NOT EXISTS public.memory_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    tag_type TEXT DEFAULT 'manual', -- 'manual', 'ai_generated'
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate tags per memory
    UNIQUE(memory_id, tag)
);

-- Memory relationships for network analysis
CREATE TABLE IF NOT EXISTS public.memory_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    target_memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    relationship_type memory_relationship_type NOT NULL,
    strength DECIMAL(3,2) CHECK (strength >= 0 AND strength <= 1) DEFAULT 0.5,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent self-references and duplicate relationships
    CHECK (source_memory_id != target_memory_id),
    UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

-- Memory analytics for usage tracking
CREATE TABLE IF NOT EXISTS public.memory_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Action tracking
    action_type TEXT NOT NULL, -- 'view', 'search_result', 'recommendation_shown', 'recommendation_clicked', 'shared', 'edited', 'tagged'
    session_id UUID,
    context_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history for recommendation improvement
CREATE TABLE IF NOT EXISTS public.memory_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Search details
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all memory tables
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_search_history ENABLE ROW LEVEL SECURITY;

-- Memory access policies (Compatible with existing auth pattern)
-- Note: Uses auth.uid() for compatibility with existing NeonDB migrations
-- TODO: Update to Stack Auth specific functions when auth system is fully migrated
CREATE POLICY memories_company_isolation ON public.memories
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY memories_user_access ON public.memories
    FOR ALL USING (
        company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()) AND
        (
            creator_id = auth.uid() OR  -- Own memories
            EXISTS (  -- Team memories for same company
                SELECT 1 FROM public.users u 
                WHERE u.id = auth.uid() 
                AND u.company_id = memories.company_id
            )
        )
    );

-- Memory tags policies
CREATE POLICY memory_tags_company_isolation ON public.memory_tags
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Memory relationships policies
CREATE POLICY memory_relationships_company_isolation ON public.memory_relationships
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Analytics policies
CREATE POLICY memory_analytics_company_isolation ON public.memory_analytics
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Search history policies
CREATE POLICY memory_search_history_user_access ON public.memory_search_history
    FOR ALL USING (user_id = auth.uid() AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Full-text search indexes (GIN)
CREATE INDEX IF NOT EXISTS idx_memories_search_vector ON public.memories USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_memories_content_gin ON public.memories USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(summary, '')));

-- Query performance indexes (B-tree)
CREATE INDEX IF NOT EXISTS idx_memories_company_id ON public.memories (company_id);
CREATE INDEX IF NOT EXISTS idx_memories_creator_id ON public.memories (creator_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON public.memories (memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_impact_score ON public.memories (impact_score);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories (created_at);
CREATE INDEX IF NOT EXISTS idx_memories_archived ON public.memories (archived);
CREATE INDEX IF NOT EXISTS idx_memories_objective_id ON public.memories (objective_id) WHERE objective_id IS NOT NULL;

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_memory_relationships_source ON public.memory_relationships (source_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_target ON public.memory_relationships (target_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_relationships_company ON public.memory_relationships (company_id);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_memory_tags_memory_id ON public.memory_tags (memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON public.memory_tags (tag);
CREATE INDEX IF NOT EXISTS idx_memory_tags_company ON public.memory_tags (company_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_memory_analytics_memory_id ON public.memory_analytics (memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_user_id ON public.memory_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_action_type ON public.memory_analytics (action_type);
CREATE INDEX IF NOT EXISTS idx_memory_analytics_company ON public.memory_analytics (company_id);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_memory_search_history_user ON public.memory_search_history (user_id);
CREATE INDEX IF NOT EXISTS idx_memory_search_history_created ON public.memory_search_history (created_at);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_memories_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.content, '') || ' ' || 
        COALESCE(NEW.summary, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_memories_search_vector_trigger ON public.memories;
CREATE TRIGGER update_memories_search_vector_trigger
    BEFORE INSERT OR UPDATE ON public.memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_memories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for memories updated_at
DROP TRIGGER IF EXISTS update_memories_updated_at_trigger ON public.memories;
CREATE TRIGGER update_memories_updated_at_trigger
    BEFORE UPDATE ON public.memories
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_updated_at();

-- Trigger for relationships updated_at
DROP TRIGGER IF EXISTS update_memory_relationships_updated_at_trigger ON public.memory_relationships;
CREATE TRIGGER update_memory_relationships_updated_at_trigger
    BEFORE UPDATE ON public.memory_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_memories_updated_at();

-- Function to set company_id from user context
CREATE OR REPLACE FUNCTION set_memories_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        NEW.company_id := (SELECT company_id FROM public.users WHERE id = NEW.creator_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set company_id for analytics
CREATE OR REPLACE FUNCTION set_memory_analytics_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        NEW.company_id := (SELECT company_id FROM public.users WHERE id = NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for company_id auto-assignment
DROP TRIGGER IF EXISTS set_memories_company_id_trigger ON public.memories;
CREATE TRIGGER set_memories_company_id_trigger
    BEFORE INSERT ON public.memories
    FOR EACH ROW
    EXECUTE FUNCTION set_memories_company_id();

DROP TRIGGER IF EXISTS set_memory_analytics_company_id_trigger ON public.memory_analytics;
CREATE TRIGGER set_memory_analytics_company_id_trigger
    BEFORE INSERT ON public.memory_analytics
    FOR EACH ROW
    EXECUTE FUNCTION set_memory_analytics_company_id();

-- =============================================================================
-- UTILITY VIEWS
-- =============================================================================

-- Memories with aggregated tags
CREATE OR REPLACE VIEW memories_with_tags AS
SELECT 
    m.*,
    COALESCE(
        json_agg(
            json_build_object(
                'tag', mt.tag,
                'type', mt.tag_type,
                'confidence', mt.confidence_score
            )
        ) FILTER (WHERE mt.id IS NOT NULL),
        '[]'::json
    ) as tags
FROM public.memories m
LEFT JOIN public.memory_tags mt ON m.id = mt.memory_id
GROUP BY m.id, m.title, m.content, m.summary, m.memory_type, 
         m.objective_id, m.initiative_id, m.activity_id, 
         m.creator_id, m.company_id, m.team_id, 
         m.impact_score, m.confidence_score, m.user_rating,
         m.search_vector, m.metadata, m.archived, 
         m.created_at, m.updated_at;

-- Memory relationship network
CREATE OR REPLACE VIEW memory_network AS
SELECT 
    mr.id,
    mr.source_memory_id,
    ms.title as source_title,
    mr.target_memory_id,
    mt.title as target_title,
    mr.relationship_type,
    mr.strength,
    mr.company_id,
    mr.created_at
FROM public.memory_relationships mr
JOIN public.memories ms ON mr.source_memory_id = ms.id
JOIN public.memories mt ON mr.target_memory_id = mt.id;

-- =============================================================================
-- SAMPLE DATA FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_sample_memory_data()
RETURNS TEXT AS $$
DECLARE
    sample_company_id UUID;
    sample_user_id UUID;
    sample_objective_id UUID;
    memory_1_id UUID;
    memory_2_id UUID;
    memory_3_id UUID;
BEGIN
    -- Get sample company and user (assumes they exist from previous migrations)
    SELECT id INTO sample_company_id FROM public.companies LIMIT 1;
    SELECT id INTO sample_user_id FROM public.users WHERE company_id = sample_company_id LIMIT 1;
    SELECT id INTO sample_objective_id FROM public.objectives WHERE company_id = sample_company_id LIMIT 1;
    
    IF sample_company_id IS NULL OR sample_user_id IS NULL THEN
        RETURN 'Error: No sample company or user found. Run previous migrations first.';
    END IF;
    
    -- Insert sample memories
    INSERT INTO public.memories (title, content, summary, memory_type, objective_id, creator_id, company_id, impact_score, confidence_score)
    VALUES 
    ('Q3 Planning Process Insight', 
     'Our Q3 planning sessions were more effective when we included cross-functional representatives from the start, rather than adding them later in the process.',
     'Cross-functional planning from the beginning improves process effectiveness',
     'insight', sample_objective_id, sample_user_id, sample_company_id, 4, 0.85),
    ('Remote Team Collaboration Lesson',
     'When working with remote teams, async communication works better than trying to force synchronous meetings across time zones. Document decisions clearly.',
     'Async communication is more effective for remote teams than forced sync meetings',
     'lesson', NULL, sample_user_id, sample_company_id, 5, 0.90),
    ('Customer Feedback Pattern',
     'We notice that customers who engage with our onboarding process within the first 48 hours have 3x higher retention rates.',
     'Early onboarding engagement correlates with higher retention',
     'pattern', sample_objective_id, sample_user_id, sample_company_id, 5, 0.95)
    RETURNING id INTO memory_1_id, memory_2_id, memory_3_id;
    
    -- Insert sample tags
    INSERT INTO public.memory_tags (memory_id, tag, tag_type, confidence_score, created_by, company_id)
    VALUES 
    (memory_1_id, 'planning', 'manual', NULL, sample_user_id, sample_company_id),
    (memory_1_id, 'cross-functional', 'ai_generated', 0.80, sample_user_id, sample_company_id),
    (memory_2_id, 'remote-work', 'manual', NULL, sample_user_id, sample_company_id),
    (memory_2_id, 'communication', 'ai_generated', 0.75, sample_user_id, sample_company_id),
    (memory_3_id, 'customer-success', 'manual', NULL, sample_user_id, sample_company_id),
    (memory_3_id, 'onboarding', 'ai_generated', 0.90, sample_user_id, sample_company_id);
    
    -- Insert sample relationship
    INSERT INTO public.memory_relationships (source_memory_id, target_memory_id, relationship_type, strength, created_by, company_id)
    VALUES 
    (memory_1_id, memory_2_id, 'related', 0.6, sample_user_id, sample_company_id);
    
    -- Insert sample analytics
    INSERT INTO public.memory_analytics (memory_id, user_id, company_id, action_type, context_data)
    VALUES 
    (memory_1_id, sample_user_id, sample_company_id, 'view', '{"source": "search"}'),
    (memory_2_id, sample_user_id, sample_company_id, 'recommendation_shown', '{"context": "objective_planning"}'),
    (memory_3_id, sample_user_id, sample_company_id, 'shared', '{"shared_with": "team"}');
    
    RETURN 'Sample memory data created successfully';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION COMPLETION
-- =============================================================================

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at, success) 
VALUES ('004_add_memory_system_neondb', NOW(), TRUE)
ON CONFLICT (migration_name) DO UPDATE SET 
    applied_at = NOW(),
    success = TRUE;