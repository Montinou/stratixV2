-- Rollback Script for AI Suggestions Migration (NeonDB Version)
-- Rollback: 003_add_ai_suggestions_neondb
-- Created: 2025-09-23
-- Description: Removes AI suggestions functionality
-- WARNING: This will remove all AI suggestion tracking data

-- =============================================================================
-- SAFETY CHECK
-- =============================================================================

-- Confirm this is intentional (comment out to proceed)
DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK WARNING: This will remove all AI suggestion data';
    RAISE NOTICE 'All AI analytics and suggestion history will be permanently deleted';
    RAISE NOTICE 'Comment out the RAISE EXCEPTION line to proceed with rollback';
    RAISE EXCEPTION 'Rollback safety check - remove this line to proceed';
END $$;

-- =============================================================================
-- DROP INDEXES
-- =============================================================================

-- Drop AI suggestions indexes
DROP INDEX IF EXISTS idx_ai_suggestions_user_id;
DROP INDEX IF EXISTS idx_ai_suggestions_created_at;
DROP INDEX IF EXISTS idx_ai_suggestions_suggestion_type;

-- =============================================================================
-- DROP TRIGGERS
-- =============================================================================

-- Drop trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON public.ai_suggestions;

-- =============================================================================
-- DROP POLICIES (RLS)
-- =============================================================================

-- Drop all RLS policies for ai_suggestions
DROP POLICY IF EXISTS "Users can view their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can create their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can update their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Corporate can view all AI suggestions" ON public.ai_suggestions;

-- =============================================================================
-- DROP TABLES
-- =============================================================================

-- Drop AI suggestions table
DROP TABLE IF EXISTS public.ai_suggestions CASCADE;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Rollback completed successfully
SELECT 'AI suggestions migration (NeonDB version) rolled back successfully' AS result;