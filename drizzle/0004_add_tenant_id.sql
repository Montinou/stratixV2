-- =====================================================
-- Add tenant_id column to existing tables
-- =====================================================

-- Add tenant_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add tenant_id to objectives
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add tenant_id to initiatives
ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add tenant_id to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Add tenant_id to key_results if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'key_results') THEN
        ALTER TABLE key_results ADD COLUMN IF NOT EXISTS tenant_id uuid;
    END IF;
END $$;

-- Add tenant_id to comments if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        ALTER TABLE comments ADD COLUMN IF NOT EXISTS tenant_id uuid;
    END IF;
END $$;

-- Add tenant_id to update_history if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'update_history') THEN
        ALTER TABLE update_history ADD COLUMN IF NOT EXISTS tenant_id uuid;
    END IF;
END $$;

-- Create indexes for tenant_id
CREATE INDEX IF NOT EXISTS profiles_tenant_idx ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS objectives_tenant_idx ON objectives(tenant_id);
CREATE INDEX IF NOT EXISTS initiatives_tenant_idx ON initiatives(tenant_id);
CREATE INDEX IF NOT EXISTS activities_tenant_idx ON activities(tenant_id);

-- Add indexes for key_results, comments, update_history if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'key_results') THEN
        CREATE INDEX IF NOT EXISTS key_results_tenant_idx ON key_results(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        CREATE INDEX IF NOT EXISTS comments_tenant_idx ON comments(tenant_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'update_history') THEN
        CREATE INDEX IF NOT EXISTS update_history_tenant_idx ON update_history(tenant_id);
    END IF;
END $$;

-- Set default tenant_id to DEFAULT_ORG_ID for existing records
UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE objectives SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE initiatives SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
UPDATE activities SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Update key_results, comments, update_history if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'key_results') THEN
        UPDATE key_results SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
        UPDATE comments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'update_history') THEN
        UPDATE update_history SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    END IF;
END $$;

COMMENT ON COLUMN profiles.tenant_id IS 'Tenant isolation - references company_id for multi-tenancy';
