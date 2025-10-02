-- Migration: Refactor Companies as Main Entity
-- Description:
--   1. Rename organization_invitations to company_invitations
--   2. Create company_profile table for onboarding data
--   3. Make profiles.company_id NOT NULL
--   4. Update RLS policies
--   5. Ensure Companies is the nuclear entity

-- ============================================================================
-- STEP 1: Create company_profile table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "company_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
  "industry" text,
  "company_size" text,
  "website" text,
  "headquarters_location" text,
  "founded_year" integer,
  "employee_count" integer,
  "annual_revenue" numeric(15, 2),
  "fiscal_year_start" text, -- Format: "MM-DD" (e.g., "01-01", "07-01")
  "timezone" text, -- IANA timezone (e.g., "America/New_York")
  "currency" text DEFAULT 'USD', -- ISO currency code
  "business_model" text, -- B2B, B2C, B2B2C, etc.
  "target_market" text[], -- Array of target markets
  "key_products_services" text[], -- Array of main products/services
  "mission_statement" text,
  "vision_statement" text,
  "core_values" text[], -- Array of core values
  "linkedin_url" text,
  "twitter_handle" text,
  "onboarding_completed" boolean DEFAULT false,
  "onboarding_completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indexes for company_profile
CREATE INDEX "company_profile_company_idx" ON "company_profile"("company_id");
CREATE INDEX "company_profile_industry_idx" ON "company_profile"("industry");
CREATE INDEX "company_profile_size_idx" ON "company_profile"("company_size");

-- ============================================================================
-- STEP 2: Rename organization_invitations to company_invitations
-- ============================================================================

-- Drop existing indexes
DROP INDEX IF EXISTS "org_invitations_email_idx";
DROP INDEX IF EXISTS "org_invitations_token_idx";
DROP INDEX IF EXISTS "org_invitations_org_idx";
DROP INDEX IF EXISTS "org_invitations_status_idx";

-- Rename the table
ALTER TABLE "organization_invitations" RENAME TO "company_invitations";

-- Rename the column organizationId to companyId
ALTER TABLE "company_invitations" RENAME COLUMN "organization_id" TO "company_id";

-- Recreate indexes with new naming
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");
CREATE INDEX "company_invitations_token_idx" ON "company_invitations"("token");
CREATE INDEX "company_invitations_company_idx" ON "company_invitations"("company_id");
CREATE INDEX "company_invitations_status_idx" ON "company_invitations"("status");

-- ============================================================================
-- STEP 3: Update onboarding_sessions references
-- ============================================================================

-- Update onboarding_sessions index
DROP INDEX IF EXISTS "onboarding_token_idx";
CREATE INDEX "onboarding_invitation_token_idx" ON "onboarding_sessions"("invitation_token");

-- ============================================================================
-- STEP 4: Make profiles.company_id NOT NULL (with safety check)
-- ============================================================================

-- First, check if there are any profiles without company_id
-- If there are, this migration will fail and should be reviewed manually
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles WHERE company_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot make company_id NOT NULL: found profiles without company_id';
  END IF;
END $$;

-- Make company_id NOT NULL
ALTER TABLE "profiles" ALTER COLUMN "company_id" SET NOT NULL;

-- ============================================================================
-- STEP 5: Drop old RLS policies and create new ones
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "companies_own_company" ON "companies";
DROP POLICY IF EXISTS "profiles_company_access" ON "profiles";

-- Companies RLS policies
CREATE POLICY "companies_own_company_access"
  ON "companies"
  FOR ALL
  USING (
    id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- Profiles RLS policies
CREATE POLICY "profiles_same_company_access"
  ON "profiles"
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- Company Profile RLS policies
CREATE POLICY "company_profile_own_company"
  ON "company_profile"
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- Company Invitations RLS policies
CREATE POLICY "company_invitations_same_company"
  ON "company_invitations"
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  );

-- Enable RLS on new table
ALTER TABLE "company_profile" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON TABLE "company_profile" IS 'Company profile information collected during onboarding and editable from company settings';
COMMENT ON TABLE "company_invitations" IS 'User invitations to join companies (renamed from organization_invitations)';
COMMENT ON COLUMN "company_profile"."company_id" IS 'One-to-one relationship with companies table';
COMMENT ON COLUMN "company_invitations"."company_id" IS 'Reference to the company this invitation is for (renamed from organization_id)';
COMMENT ON COLUMN "profiles"."company_id" IS 'Required reference to the company this profile belongs to (now NOT NULL)';

-- ============================================================================
-- STEP 7: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_company_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_profile_updated_at_trigger
  BEFORE UPDATE ON "company_profile"
  FOR EACH ROW
  EXECUTE FUNCTION update_company_profile_updated_at();

-- ============================================================================
-- Migration complete
-- ============================================================================
