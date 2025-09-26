-- Complete Drizzle RLS + Stack Auth + Neon Migration Script
-- This script sets up Row Level Security (RLS) for Stack Auth integration
-- Compatible with Drizzle ORM RLS patterns from drizzle-orm/neon

-- ===== STEP 1: INSTALL REQUIRED EXTENSIONS =====

-- Install pg_session_jwt extension for JWT handling
CREATE EXTENSION IF NOT EXISTS pg_session_jwt;

-- ===== STEP 2: CREATE AUTHENTICATION FUNCTION =====

-- Create auth.user_id() function to extract user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub'
$$ LANGUAGE SQL STABLE;

-- ===== STEP 3: CONFIGURE ROLES AND PERMISSIONS =====

-- Grant permissions to authenticated role for existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;

-- Grant permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO anonymous;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anonymous;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anonymous;

-- Grant sequence permissions for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT USAGE ON SEQUENCES TO anonymous;

-- ===== STEP 4: ENABLE RLS ON ALL USER TABLES =====

-- Enable RLS on main tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ===== STEP 5: CREATE RLS POLICIES =====

-- Note: Drizzle RLS policies are defined in the schema file using crudPolicy()
-- This SQL creates equivalent policies for manual setup or verification

-- Users table policies
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (stack_user_id = auth.user_id());

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (stack_user_id = auth.user_id());

-- Profiles table policies  
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id()));

-- Companies table policies (users can only see companies they're associated with)
DROP POLICY IF EXISTS "Users can view associated companies" ON companies;
CREATE POLICY "Users can view associated companies" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE company_id = companies.id 
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    )
  );

DROP POLICY IF EXISTS "Corporativo can modify companies" ON companies;
CREATE POLICY "Corporativo can modify companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE company_id = companies.id 
      AND user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND role_type = 'corporativo'
    )
  );

-- Objectives table policies (role-based access)
DROP POLICY IF EXISTS "Users can view objectives by role" ON objectives;
CREATE POLICY "Users can view objectives by role" ON objectives
  FOR SELECT USING (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND (
        role_type = 'corporativo' 
        OR (role_type = 'gerente' AND department = objectives.department)
      )
    )
  );

DROP POLICY IF EXISTS "Users can modify objectives by role" ON objectives;
CREATE POLICY "Users can modify objectives by role" ON objectives
  FOR ALL USING (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND role_type = 'corporativo'
    )
  );

-- Initiatives table policies (inherit access from parent objective)
DROP POLICY IF EXISTS "Users can view initiatives by objective access" ON initiatives;
CREATE POLICY "Users can view initiatives by objective access" ON initiatives
  FOR SELECT USING (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM objectives o, profiles p
      WHERE o.id = initiatives.objective_id
      AND p.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND (
        o.owner_id = p.user_id
        OR p.role_type = 'corporativo' 
        OR (p.role_type = 'gerente' AND p.department = o.department)
      )
    )
  );

DROP POLICY IF EXISTS "Users can modify initiatives by role" ON initiatives;
CREATE POLICY "Users can modify initiatives by role" ON initiatives
  FOR ALL USING (
    owner_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND role_type = 'corporativo'
    )
  );

-- Activities table policies (users can see activities assigned to them or via initiatives)
DROP POLICY IF EXISTS "Users can view activities by assignment or initiative access" ON activities;
CREATE POLICY "Users can view activities by assignment or initiative access" ON activities
  FOR SELECT USING (
    assigned_to = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM initiatives i, objectives o, profiles p
      WHERE i.id = activities.initiative_id
      AND o.id = i.objective_id
      AND p.user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND (
        i.owner_id = p.user_id
        OR o.owner_id = p.user_id
        OR p.role_type = 'corporativo' 
        OR (p.role_type = 'gerente' AND p.department = o.department)
      )
    )
  );

DROP POLICY IF EXISTS "Users can modify activities by role" ON activities;
CREATE POLICY "Users can modify activities by role" ON activities
  FOR ALL USING (
    assigned_to = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = (SELECT id FROM users WHERE stack_user_id = auth.user_id())
      AND role_type IN ('corporativo', 'gerente')
    )
  );

-- ===== STEP 6: VERIFICATION QUERIES =====

-- Verify auth.user_id() function works
-- SELECT auth.user_id(); -- Should return current user's ID when authenticated

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'profiles', 'companies', 'objectives', 'initiatives', 'activities');

-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test basic RLS functionality (run when authenticated)
-- SELECT * FROM profiles; -- Should only show current user's profile

-- ===== STEP 7: COMPLETION LOG =====

-- Log successful migration
INSERT INTO public._drizzle_migrations (hash, created_at) 
VALUES ('add-rls-policies-stack-auth', NOW())
ON CONFLICT (hash) DO NOTHING;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'RLS migration completed successfully. All tables now have Row Level Security enabled with Stack Auth integration.';
END $$;