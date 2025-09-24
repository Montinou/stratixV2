-- Stack Integration Indexing Migration for StratixV2 (NeonDB Version)
-- Migration: 005_add_stack_integration_indexing_neondb
-- Created: 2025-09-24
-- Description: Add proper indexing for Stack authentication integration with profile operations
-- Dependencies: 002_add_multitenant_support_neondb

-- =============================================================================
-- STACK INTEGRATION INDEXES
-- =============================================================================

-- Primary user_id index for Stack user lookups (B-tree for exact matches)
-- This is the most critical index as all Stack operations lookup by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_btree ON public.profiles (user_id);

-- Company isolation index with user_id for multi-tenant queries
-- Supports queries like: WHERE company_id = ? AND user_id = ?
CREATE INDEX IF NOT EXISTS idx_profiles_company_user ON public.profiles (company_id, user_id);

-- Role-based queries within company context
-- Supports queries like: WHERE company_id = ? AND role_type = ?
CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON public.profiles (company_id, role_type);

-- Full name index for user search and sync operations
-- Supports Stack user display name synchronization
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles (full_name);

-- Department-based filtering within company
-- Supports queries like: WHERE company_id = ? AND department = ?
CREATE INDEX IF NOT EXISTS idx_profiles_company_department ON public.profiles (company_id, department);

-- Updated timestamp index for sync operations
-- Supports finding profiles that need Stack user data sync
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at);

-- Composite index for sync queries (company + updated_at)
-- Optimizes queries: WHERE company_id = ? AND updated_at < ?
CREATE INDEX IF NOT EXISTS idx_profiles_company_updated ON public.profiles (company_id, updated_at);

-- =============================================================================
-- STACK INTEGRATION CONSTRAINTS AND VALIDATION
-- =============================================================================

-- Ensure user_id follows UUID format (Stack uses UUIDs)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_uuid_format 
CHECK (user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

-- Ensure full_name is never empty (required for Stack integration)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_not_empty 
CHECK (length(trim(full_name)) > 0);

-- =============================================================================
-- STACK USER PROFILE MAPPING TABLE (OPTIONAL FUTURE ENHANCEMENT)
-- =============================================================================

-- Optional table for advanced Stack integration features
-- This can be used to store additional Stack-specific metadata
CREATE TABLE IF NOT EXISTS public.stack_user_profiles (
    stack_user_id UUID PRIMARY KEY,
    profile_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Stack-specific metadata
    stack_display_name TEXT,
    stack_primary_email TEXT,
    stack_profile_image_url TEXT,
    stack_metadata JSONB DEFAULT '{}',
    
    -- Sync tracking
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_version INTEGER DEFAULT 1,
    sync_errors JSONB DEFAULT '[]',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(profile_user_id), -- One Stack user per profile
    UNIQUE(stack_primary_email, company_id) -- One email per company
);

-- Enable RLS for stack_user_profiles
ALTER TABLE public.stack_user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy for stack_user_profiles (company isolation)
CREATE POLICY stack_user_profiles_company_isolation ON public.stack_user_profiles
    USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Indexes for stack_user_profiles table
CREATE INDEX IF NOT EXISTS idx_stack_user_profiles_profile_user_id ON public.stack_user_profiles (profile_user_id);
CREATE INDEX IF NOT EXISTS idx_stack_user_profiles_company_id ON public.stack_user_profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_stack_user_profiles_email ON public.stack_user_profiles (stack_primary_email);
CREATE INDEX IF NOT EXISTS idx_stack_user_profiles_last_synced ON public.stack_user_profiles (last_synced_at);
CREATE INDEX IF NOT EXISTS idx_stack_user_profiles_sync_version ON public.stack_user_profiles (sync_version);

-- =============================================================================
-- STACK INTEGRATION HELPER FUNCTIONS
-- =============================================================================

-- Function to validate Stack user ID format
CREATE OR REPLACE FUNCTION validate_stack_user_id(user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get profile by Stack user ID with company context
CREATE OR REPLACE FUNCTION get_profile_by_stack_user_id(
    p_stack_user_id UUID,
    p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    role_type TEXT,
    department TEXT,
    company_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.full_name,
        p.role_type::TEXT,
        p.department,
        p.company_id,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE p.user_id = p_stack_user_id
    AND (p_company_id IS NULL OR p.company_id = p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if Stack user exists in company
CREATE OR REPLACE FUNCTION stack_user_exists_in_company(
    p_stack_user_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE user_id = p_stack_user_id 
        AND company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update Stack user profile sync timestamp
CREATE OR REPLACE FUNCTION update_stack_profile_sync(
    p_stack_user_id UUID,
    p_sync_version INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.stack_user_profiles 
    SET 
        last_synced_at = NOW(),
        sync_version = COALESCE(p_sync_version, sync_version + 1),
        updated_at = NOW()
    WHERE stack_user_id = p_stack_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS FOR STACK INTEGRATION
-- =============================================================================

-- Trigger function to update stack_user_profiles when profiles change
CREATE OR REPLACE FUNCTION sync_stack_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stack_user_profiles table when profile changes
    UPDATE public.stack_user_profiles
    SET 
        sync_version = sync_version + 1,
        updated_at = NOW()
    WHERE profile_user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync stack user profiles
DROP TRIGGER IF EXISTS sync_stack_user_profile_trigger ON public.profiles;
CREATE TRIGGER sync_stack_user_profile_trigger
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_stack_user_profile();

-- Trigger for stack_user_profiles updated_at
CREATE OR REPLACE FUNCTION update_stack_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stack_user_profiles_updated_at_trigger ON public.stack_user_profiles;
CREATE TRIGGER update_stack_user_profiles_updated_at_trigger
    BEFORE UPDATE ON public.stack_user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_stack_user_profiles_updated_at();

-- =============================================================================
-- PERFORMANCE ANALYSIS VIEWS
-- =============================================================================

-- View for Stack integration performance monitoring
CREATE OR REPLACE VIEW stack_integration_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    COUNT(p.user_id) as total_profiles,
    COUNT(sup.stack_user_id) as synced_profiles,
    ROUND(
        (COUNT(sup.stack_user_id)::DECIMAL / NULLIF(COUNT(p.user_id), 0)) * 100, 
        2
    ) as sync_percentage,
    MIN(p.created_at) as first_profile_created,
    MAX(p.updated_at) as last_profile_updated,
    AVG(sup.sync_version) as avg_sync_version
FROM public.companies c
LEFT JOIN public.profiles p ON c.id = p.company_id
LEFT JOIN public.stack_user_profiles sup ON p.user_id = sup.profile_user_id
GROUP BY c.id, c.name
ORDER BY total_profiles DESC;

-- View for profiles needing Stack sync
CREATE OR REPLACE VIEW profiles_needing_sync AS
SELECT 
    p.user_id,
    p.full_name,
    p.company_id,
    c.name as company_name,
    p.updated_at as profile_updated_at,
    COALESCE(sup.last_synced_at, p.created_at) as last_synced_at,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(sup.last_synced_at, p.created_at)))/3600 as hours_since_sync
FROM public.profiles p
JOIN public.companies c ON p.company_id = c.id
LEFT JOIN public.stack_user_profiles sup ON p.user_id = sup.profile_user_id
WHERE 
    sup.last_synced_at IS NULL -- Never synced
    OR sup.last_synced_at < p.updated_at -- Profile updated after last sync
    OR sup.last_synced_at < (NOW() - INTERVAL '24 hours') -- Last sync more than 24 hours ago
ORDER BY hours_since_sync DESC;

-- =============================================================================
-- COMPLETION AND LOGGING
-- =============================================================================

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT
);

-- Log migration completion
INSERT INTO migration_log (migration_name, applied_at, success, notes) 
VALUES (
    '005_add_stack_integration_indexing_neondb', 
    NOW(), 
    TRUE,
    'Added comprehensive indexing and helper functions for Stack authentication integration'
)
ON CONFLICT (migration_name) DO UPDATE SET 
    applied_at = NOW(),
    success = TRUE,
    notes = 'Updated - Added comprehensive indexing and helper functions for Stack authentication integration';

-- Return success message
SELECT 
    'Stack integration indexing migration completed successfully. ' ||
    'Added ' || (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_profiles_%'
    )::TEXT || ' profile indexes and ' ||
    (
        SELECT COUNT(*) 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_stack_user_profiles_%'
    )::TEXT || ' Stack user profile indexes.' AS result;