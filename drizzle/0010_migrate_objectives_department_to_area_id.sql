-- Migration: Replace department column with area_id in objectives table

-- Add area_id column
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS area_id uuid;

-- Create index for area_id
CREATE INDEX IF NOT EXISTS objectives_area_idx ON objectives(area_id);

-- Drop old department column
ALTER TABLE objectives DROP COLUMN IF EXISTS department;
