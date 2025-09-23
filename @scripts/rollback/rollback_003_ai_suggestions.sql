-- Rollback Script for AI Suggestions Migration
-- Rollback: 003_add_ai_suggestions
-- Created: 2025-09-23
-- Description: Remove AI suggestions table and related objects
-- WARNING: This will permanently delete all AI suggestions data

-- =============================================================================
-- SAFETY CHECK
-- =============================================================================

-- Confirm this is intentional (comment out to proceed)
DO $$
BEGIN
    RAISE NOTICE 'ROLLBACK WARNING: This will permanently delete AI suggestions data';
    RAISE NOTICE 'Comment out the RAISE EXCEPTION line to proceed with rollback';
    RAISE EXCEPTION 'Rollback safety check - remove this line to proceed';
END $$;

-- =============================================================================
-- DROP INDEXES
-- =============================================================================

-- Drop performance indexes
DROP INDEX IF EXISTS idx_ai_suggestions_user_id;
DROP INDEX IF EXISTS idx_ai_suggestions_created_at;
DROP INDEX IF EXISTS idx_ai_suggestions_suggestion_type;

-- =============================================================================
-- DROP TRIGGERS
-- =============================================================================

-- Drop updated_at trigger
DROP TRIGGER IF EXISTS update_ai_suggestions_updated_at ON public.ai_suggestions;

-- =============================================================================
-- DROP POLICIES
-- =============================================================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can create their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Users can update their own AI suggestions" ON public.ai_suggestions;
DROP POLICY IF EXISTS "Corporate can view all AI suggestions" ON public.ai_suggestions;

-- =============================================================================
-- DROP TABLE
-- =============================================================================

-- Drop AI suggestions table
DROP TABLE IF EXISTS public.ai_suggestions;

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Rollback completed successfully
SELECT 'AI suggestions migration rolled back successfully' AS result;