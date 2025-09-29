-- StratixV2 AI System Tables Migration
-- This migration adds all necessary tables for AI functionality

-- Create enums for AI system
DO $$ BEGIN
 CREATE TYPE "public"."ai_operation_type" AS ENUM('text_generation', 'chat_completion', 'embedding', 'analysis');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic', 'google', 'vercel');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."benchmark_category" AS ENUM('text_generation', 'chat_completion', 'embedding', 'analysis');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."conversation_mood" AS ENUM('positive', 'neutral', 'frustrated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AI Usage Tracking table - monitor AI service consumption
CREATE TABLE IF NOT EXISTS "ai_usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"operation_type" "ai_operation_type" NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" varchar(100) NOT NULL,
	"tokens_used" integer NOT NULL,
	"request_cost" numeric(10, 6),
	"response_time_ms" integer,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- AI Performance Benchmarks table - track AI model performance metrics
CREATE TABLE IF NOT EXISTS "ai_performance_benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "benchmark_category" NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" varchar(100) NOT NULL,
	"avg_response_time" numeric(8, 2) NOT NULL,
	"avg_tokens_per_request" numeric(8, 2) NOT NULL,
	"avg_cost_per_request" numeric(10, 6) NOT NULL,
	"success_rate" numeric(5, 2) NOT NULL,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"measurement_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Conversations table - track AI conversation sessions
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(500),
	"context" jsonb,
	"mood" "conversation_mood" DEFAULT 'neutral',
	"tokens_used" integer DEFAULT 0,
	"message_count" integer DEFAULT 0,
	"last_message_at" timestamp,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Conversation Messages table - individual messages in conversations
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"tokens_used" integer,
	"response_time_ms" integer,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- AI Insights table - generated insights and recommendations
CREATE TABLE IF NOT EXISTS "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"confidence" numeric(5, 2),
	"is_read" boolean DEFAULT false,
	"is_actionable" boolean DEFAULT false,
	"metadata" jsonb,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Knowledge Base table - store AI knowledge and context
CREATE TABLE IF NOT EXISTS "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"tags" jsonb,
	"embedding" jsonb,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"company_id" uuid,
	"tenant_id" uuid,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- AI Configuration table - store AI settings and preferences
CREATE TABLE IF NOT EXISTS "ai_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"config_key" varchar(100) NOT NULL,
	"config_value" jsonb NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create foreign key constraints for AI tables
DO $$ BEGIN
 ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_user_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_performance_benchmarks" ADD CONSTRAINT "ai_performance_benchmarks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_created_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_user_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for AI tables
CREATE INDEX IF NOT EXISTS "ai_usage_user_idx" ON "ai_usage_tracking" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ai_usage_operation_idx" ON "ai_usage_tracking" USING btree ("operation_type");
CREATE INDEX IF NOT EXISTS "ai_usage_provider_idx" ON "ai_usage_tracking" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "ai_usage_company_idx" ON "ai_usage_tracking" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "ai_usage_tenant_idx" ON "ai_usage_tracking" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage_tracking" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "ai_benchmarks_category_idx" ON "ai_performance_benchmarks" USING btree ("category");
CREATE INDEX IF NOT EXISTS "ai_benchmarks_provider_idx" ON "ai_performance_benchmarks" USING btree ("provider");
CREATE INDEX IF NOT EXISTS "ai_benchmarks_company_idx" ON "ai_performance_benchmarks" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "ai_benchmarks_tenant_idx" ON "ai_performance_benchmarks" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_benchmarks_date_idx" ON "ai_performance_benchmarks" USING btree ("measurement_date");
CREATE INDEX IF NOT EXISTS "conversations_user_idx" ON "conversations" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "conversations_company_idx" ON "conversations" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_idx" ON "conversation_messages" USING btree ("conversation_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_role_idx" ON "conversation_messages" USING btree ("role");
CREATE INDEX IF NOT EXISTS "conversation_messages_company_idx" ON "conversation_messages" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_tenant_idx" ON "conversation_messages" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "ai_insights_user_idx" ON "ai_insights" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ai_insights_category_idx" ON "ai_insights" USING btree ("category");
CREATE INDEX IF NOT EXISTS "ai_insights_entity_idx" ON "ai_insights" USING btree ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "ai_insights_company_idx" ON "ai_insights" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "ai_insights_tenant_idx" ON "ai_insights" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_insights_generated_at_idx" ON "ai_insights" USING btree ("generated_at");
CREATE INDEX IF NOT EXISTS "ai_insights_is_read_idx" ON "ai_insights" USING btree ("is_read");
CREATE INDEX IF NOT EXISTS "knowledge_base_category_idx" ON "knowledge_base" USING btree ("category");
CREATE INDEX IF NOT EXISTS "knowledge_base_company_idx" ON "knowledge_base" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "knowledge_base_tenant_idx" ON "knowledge_base" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "knowledge_base_is_active_idx" ON "knowledge_base" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "knowledge_base_priority_idx" ON "knowledge_base" USING btree ("priority");
CREATE INDEX IF NOT EXISTS "ai_config_user_idx" ON "ai_configuration" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ai_config_key_idx" ON "ai_configuration" USING btree ("config_key");
CREATE INDEX IF NOT EXISTS "ai_config_company_idx" ON "ai_configuration" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "ai_config_tenant_idx" ON "ai_configuration" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_config_is_active_idx" ON "ai_configuration" USING btree ("is_active");