-- StratixV2 OKR System Tables Migration
-- This migration adds all necessary tables for the OKR management system

-- Create enums for OKR system
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('corporativo', 'gerente', 'empleado');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."objective_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."initiative_status" AS ENUM('planning', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."activity_status" AS ENUM('todo', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Companies table - organization information
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(100),
	"size" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Profiles table - detailed user profile information linked to Neon Auth users
CREATE TABLE IF NOT EXISTS "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role_type" "user_role" NOT NULL,
	"department" varchar(100) NOT NULL,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Objectives table - high-level OKR objectives
CREATE TABLE IF NOT EXISTS "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"department" varchar(100) NOT NULL,
	"status" "objective_status" DEFAULT 'draft' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0',
	"target_value" numeric(10, 2),
	"current_value" numeric(10, 2) DEFAULT '0',
	"unit" varchar(50),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"assigned_to" text,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Initiatives table - strategic initiatives linked to objectives
CREATE TABLE IF NOT EXISTS "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "initiative_status" DEFAULT 'planning' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0',
	"budget" numeric(12, 2),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"objective_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"assigned_to" text,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Activities table - specific activities/tasks linked to initiatives
CREATE TABLE IF NOT EXISTS "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "activity_status" DEFAULT 'todo' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"estimated_hours" numeric(6, 2),
	"actual_hours" numeric(6, 2) DEFAULT '0',
	"due_date" timestamp,
	"completed_at" timestamp,
	"initiative_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"assigned_to" text,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Comments table - comments for objectives, initiatives, and activities
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Key Results table - specific measurable results for objectives
CREATE TABLE IF NOT EXISTS "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2) DEFAULT '0',
	"unit" varchar(50) NOT NULL,
	"progress_percentage" numeric(5, 2) DEFAULT '0',
	"objective_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Update History table - track changes to OKR entities
CREATE TABLE IF NOT EXISTS "update_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"updated_by" text NOT NULL,
	"company_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create foreign key constraints
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "objectives" ADD CONSTRAINT "objectives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "objectives" ADD CONSTRAINT "objectives_created_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "objectives" ADD CONSTRAINT "objectives_assigned_to_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_created_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_assigned_to_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_initiative_id_initiatives_id_fk" FOREIGN KEY ("initiative_id") REFERENCES "public"."initiatives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_assigned_to_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("author_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "key_results" ADD CONSTRAINT "key_results_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "key_results" ADD CONSTRAINT "key_results_created_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "update_history" ADD CONSTRAINT "update_history_updated_by_users_sync_in_neon_auth_id_fk" FOREIGN KEY ("updated_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "update_history" ADD CONSTRAINT "update_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" USING btree ("name");
CREATE INDEX IF NOT EXISTS "profiles_company_idx" ON "profiles" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "profiles_role_idx" ON "profiles" USING btree ("role_type");
CREATE INDEX IF NOT EXISTS "profiles_department_idx" ON "profiles" USING btree ("department");
CREATE INDEX IF NOT EXISTS "profiles_tenant_idx" ON "profiles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "objectives_company_idx" ON "objectives" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "objectives_department_idx" ON "objectives" USING btree ("department");
CREATE INDEX IF NOT EXISTS "objectives_status_idx" ON "objectives" USING btree ("status");
CREATE INDEX IF NOT EXISTS "objectives_assigned_idx" ON "objectives" USING btree ("assigned_to");
CREATE INDEX IF NOT EXISTS "objectives_tenant_idx" ON "objectives" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "initiatives_objective_idx" ON "initiatives" USING btree ("objective_id");
CREATE INDEX IF NOT EXISTS "initiatives_company_idx" ON "initiatives" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "initiatives_status_idx" ON "initiatives" USING btree ("status");
CREATE INDEX IF NOT EXISTS "initiatives_assigned_idx" ON "initiatives" USING btree ("assigned_to");
CREATE INDEX IF NOT EXISTS "initiatives_tenant_idx" ON "initiatives" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "activities_initiative_idx" ON "activities" USING btree ("initiative_id");
CREATE INDEX IF NOT EXISTS "activities_company_idx" ON "activities" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "activities_status_idx" ON "activities" USING btree ("status");
CREATE INDEX IF NOT EXISTS "activities_assigned_idx" ON "activities" USING btree ("assigned_to");
CREATE INDEX IF NOT EXISTS "activities_due_date_idx" ON "activities" USING btree ("due_date");
CREATE INDEX IF NOT EXISTS "activities_tenant_idx" ON "activities" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "comments_entity_idx" ON "comments" USING btree ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "comments_author_idx" ON "comments" USING btree ("author_id");
CREATE INDEX IF NOT EXISTS "comments_company_idx" ON "comments" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "comments_tenant_idx" ON "comments" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "key_results_objective_idx" ON "key_results" USING btree ("objective_id");
CREATE INDEX IF NOT EXISTS "key_results_company_idx" ON "key_results" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "key_results_tenant_idx" ON "key_results" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "update_history_entity_idx" ON "update_history" USING btree ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "update_history_updated_by_idx" ON "update_history" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "update_history_company_idx" ON "update_history" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "update_history_tenant_idx" ON "update_history" USING btree ("tenant_id");