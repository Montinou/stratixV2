-- Migration: Remove budget column from areas table
-- This migration removes the budget field as it's no longer needed

ALTER TABLE areas DROP COLUMN IF EXISTS budget;
