-- Migration: Remove tenantId from AI tables
-- We don't use multi-tenancy, only company_id for data isolation
-- This migration removes the redundant tenant_id column from all AI tables

-- Drop indexes first
DROP INDEX IF EXISTS "ai_usage_tenant_idx";
DROP INDEX IF EXISTS "ai_benchmarks_tenant_idx";
DROP INDEX IF EXISTS "conversations_tenant_idx";
DROP INDEX IF EXISTS "conversation_messages_tenant_idx";
DROP INDEX IF EXISTS "ai_insights_tenant_idx";
DROP INDEX IF EXISTS "knowledge_base_tenant_idx";
DROP INDEX IF EXISTS "ai_config_tenant_idx";

-- Drop tenant_id columns
ALTER TABLE "ai_usage_tracking" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "ai_performance_benchmarks" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "ai_insights" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "knowledge_base" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "ai_configuration" DROP COLUMN IF EXISTS "tenant_id";
