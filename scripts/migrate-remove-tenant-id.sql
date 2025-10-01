-- Migration: Remove tenant_id columns and use company_id for RLS
-- Date: 2025-01-10
-- Description: Simplify architecture by using only company_id for Row Level Security

-- Step 1: Drop indexes on tenant_id columns
DROP INDEX IF EXISTS profiles_tenant_idx;
DROP INDEX IF EXISTS objectives_tenant_idx;
DROP INDEX IF EXISTS initiatives_tenant_idx;
DROP INDEX IF EXISTS activities_tenant_idx;
DROP INDEX IF EXISTS comments_tenant_idx;
DROP INDEX IF EXISTS key_results_tenant_idx;
DROP INDEX IF EXISTS update_history_tenant_idx;

-- Step 2: Drop tenant_id columns from all tables
ALTER TABLE profiles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE objectives DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE initiatives DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE activities DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE comments DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE key_results DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE update_history DROP COLUMN IF EXISTS tenant_id;

-- Step 3: Ensure company_id is NOT NULL where needed
ALTER TABLE objectives ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE initiatives ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN company_id SET NOT NULL;

-- Step 4: Create indexes on company_id if they don't exist
CREATE INDEX IF NOT EXISTS profiles_company_idx ON profiles(company_id);
CREATE INDEX IF NOT EXISTS objectives_company_idx ON objectives(company_id);
CREATE INDEX IF NOT EXISTS objectives_owner_idx ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS initiatives_company_idx ON initiatives(company_id);
CREATE INDEX IF NOT EXISTS initiatives_objective_idx ON initiatives(objective_id);
CREATE INDEX IF NOT EXISTS activities_company_idx ON activities(company_id);
CREATE INDEX IF NOT EXISTS activities_initiative_idx ON activities(initiative_id);
CREATE INDEX IF NOT EXISTS comments_company_idx ON comments(company_id);
CREATE INDEX IF NOT EXISTS key_results_company_idx ON key_results(company_id);
CREATE INDEX IF NOT EXISTS update_history_company_idx ON update_history(company_id);

-- Step 5: Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_history ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing RLS policies if they exist
DROP POLICY IF EXISTS profiles_company_isolation ON profiles;
DROP POLICY IF EXISTS objectives_company_isolation ON objectives;
DROP POLICY IF EXISTS initiatives_company_isolation ON initiatives;
DROP POLICY IF EXISTS activities_company_isolation ON activities;
DROP POLICY IF EXISTS comments_company_isolation ON comments;
DROP POLICY IF EXISTS key_results_company_isolation ON key_results;
DROP POLICY IF EXISTS update_history_company_isolation ON update_history;

-- Step 7: Create RLS policies based on company_id
-- Users can only access data from their own company

-- Profiles policy
CREATE POLICY profiles_company_isolation ON profiles
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Objectives policy
CREATE POLICY objectives_company_isolation ON objectives
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Initiatives policy
CREATE POLICY initiatives_company_isolation ON initiatives
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Activities policy
CREATE POLICY activities_company_isolation ON activities
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Comments policy (if table exists)
CREATE POLICY comments_company_isolation ON comments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Key Results policy (if table exists)
CREATE POLICY key_results_company_isolation ON key_results
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Update History policy (if table exists)
CREATE POLICY update_history_company_isolation ON update_history
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Step 8: Grant necessary permissions (adjust as needed for your application)
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON objectives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON initiatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON key_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON update_history TO authenticated;

-- Migration complete
-- Note: The RLS policies use current_setting('app.current_user_id') which needs to be set by your application
-- You may need to adjust this based on your authentication implementation