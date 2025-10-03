-- Migration: Migrate departments to areas
-- Description: Replace department text fields with area_id foreign keys in objectives and profiles

-- Step 1: Add area_id columns
ALTER TABLE "objectives"
ADD COLUMN "area_id" UUID REFERENCES "areas"("id") ON DELETE SET NULL;

ALTER TABLE "profiles"
ADD COLUMN "area_id" UUID REFERENCES "areas"("id") ON DELETE SET NULL;

-- Step 2: Create default areas for existing departments
-- This creates areas only for departments that actually exist in the data
DO $$
DECLARE
  dept_name TEXT;
  company_record RECORD;
  area_id UUID;
  first_user_id TEXT;
BEGIN
  -- Get the first user from neon_auth for created_by
  SELECT id INTO first_user_id FROM "neon_auth"."users_sync" LIMIT 1;

  -- For each company, create areas for their unique departments
  FOR company_record IN
    SELECT DISTINCT company_id FROM objectives WHERE department IS NOT NULL
    UNION
    SELECT DISTINCT company_id FROM profiles WHERE department IS NOT NULL
  LOOP
    -- Get unique departments for this company
    FOR dept_name IN
      SELECT DISTINCT department FROM objectives WHERE company_id = company_record.company_id AND department IS NOT NULL
      UNION
      SELECT DISTINCT department FROM profiles WHERE company_id = company_record.company_id AND department IS NOT NULL
    LOOP
      -- Check if area already exists
      SELECT id INTO area_id FROM areas
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(dept_name))
        AND company_id = company_record.company_id;

      -- Create area if it doesn't exist
      IF area_id IS NULL THEN
        INSERT INTO areas (
          id,
          name,
          code,
          status,
          created_by,
          company_id
        ) VALUES (
          gen_random_uuid(),
          dept_name,
          UPPER(REPLACE(dept_name, ' ', '_')),
          'active',
          first_user_id,
          company_record.company_id
        )
        RETURNING id INTO area_id;

        RAISE NOTICE 'Created area: % for company: %', dept_name, company_record.company_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Migrate data from department to area_id
-- For objectives
UPDATE objectives o
SET area_id = a.id
FROM areas a
WHERE o.department IS NOT NULL
  AND LOWER(TRIM(o.department)) = LOWER(TRIM(a.name))
  AND o.company_id = a.company_id;

-- For profiles
UPDATE profiles p
SET area_id = a.id
FROM areas a
WHERE p.department IS NOT NULL
  AND LOWER(TRIM(p.department)) = LOWER(TRIM(a.name))
  AND p.company_id = a.company_id;

-- Step 4: Drop department columns
ALTER TABLE "objectives" DROP COLUMN "department";
ALTER TABLE "profiles" DROP COLUMN "department";

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "objectives_area_idx" ON "objectives"("area_id");
CREATE INDEX IF NOT EXISTS "profiles_area_idx" ON "profiles"("area_id");
