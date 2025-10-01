CREATE TYPE "public"."activity_status" AS ENUM('todo', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."area_status" AS ENUM('active', 'inactive', 'planning');--> statement-breakpoint
CREATE TYPE "public"."initiative_status" AS ENUM('planning', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."objective_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."onboarding_step" AS ENUM('create_org', 'accept_invite', 'complete_profile');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('corporativo', 'gerente', 'empleado');--> statement-breakpoint
CREATE TYPE "public"."ai_operation_type" AS ENUM('text_generation', 'chat_completion', 'embedding', 'analysis');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic', 'google', 'vercel');--> statement-breakpoint
CREATE TYPE "public"."benchmark_category" AS ENUM('text_generation', 'chat_completion', 'embedding', 'analysis');--> statement-breakpoint
CREATE TYPE "public"."conversation_mood" AS ENUM('positive', 'neutral', 'frustrated');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"initiative_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" text DEFAULT 'no_iniciado',
	"progress" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"company_id" uuid NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"code" varchar(50),
	"parent_area_id" uuid,
	"manager_id" uuid,
	"budget" numeric(15, 2),
	"headcount" integer DEFAULT 0,
	"status" "area_status" DEFAULT 'active',
	"color" varchar(7),
	"icon" varchar(50),
	"created_by" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "areas_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"logo_url" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"objective_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" text DEFAULT 'no_iniciado',
	"progress" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_results" (
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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"owner_id" uuid NOT NULL,
	"department" text,
	"status" text DEFAULT 'no_iniciado',
	"progress" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_step" text NOT NULL,
	"partial_data" jsonb DEFAULT '{}'::jsonb,
	"invitation_token" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_sessions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" "user_role" DEFAULT 'empleado' NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'empleado' NOT NULL,
	"department" text,
	"manager_id" uuid,
	"company_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "update_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"updated_by" text NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_configuration" (
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
--> statement-breakpoint
CREATE TABLE "ai_insights" (
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
--> statement-breakpoint
CREATE TABLE "ai_performance_benchmarks" (
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
--> statement-breakpoint
CREATE TABLE "ai_usage_tracking" (
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
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
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
--> statement-breakpoint
CREATE TABLE "conversations" (
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
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
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
--> statement-breakpoint
CREATE TABLE "import_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"import_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"successful_records" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"error_details" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_sync_id_fk" FOREIGN KEY ("author_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_created_by_users_sync_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_companies_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invited_by_users_sync_id_fk" FOREIGN KEY ("invited_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_history" ADD CONSTRAINT "update_history_updated_by_users_sync_id_fk" FOREIGN KEY ("updated_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "update_history" ADD CONSTRAINT "update_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_performance_benchmarks" ADD CONSTRAINT "ai_performance_benchmarks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_sync_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_created_by_users_sync_id_fk" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."users_sync"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_company_idx" ON "activities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "activities_initiative_idx" ON "activities" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "areas_company_idx" ON "areas" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "areas_parent_idx" ON "areas" USING btree ("parent_area_id");--> statement-breakpoint
CREATE INDEX "areas_manager_idx" ON "areas" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "areas_status_idx" ON "areas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "comments_entity_idx" ON "comments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "comments_company_idx" ON "comments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "initiatives_company_idx" ON "initiatives" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "initiatives_objective_idx" ON "initiatives" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "key_results_objective_idx" ON "key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "key_results_company_idx" ON "key_results" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "objectives_company_idx" ON "objectives" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "objectives_owner_idx" ON "objectives" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "onboarding_user_idx" ON "onboarding_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_status_idx" ON "onboarding_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "onboarding_token_idx" ON "onboarding_sessions" USING btree ("invitation_token");--> statement-breakpoint
CREATE INDEX "onboarding_last_activity_idx" ON "onboarding_sessions" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "org_invitations_email_idx" ON "organization_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "org_invitations_token_idx" ON "organization_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "org_invitations_org_idx" ON "organization_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_invitations_status_idx" ON "organization_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_company_idx" ON "profiles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "update_history_entity_idx" ON "update_history" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "update_history_updated_by_idx" ON "update_history" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "update_history_company_idx" ON "update_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ai_config_user_idx" ON "ai_configuration" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_config_key_idx" ON "ai_configuration" USING btree ("config_key");--> statement-breakpoint
CREATE INDEX "ai_config_company_idx" ON "ai_configuration" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ai_config_tenant_idx" ON "ai_configuration" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_config_is_active_idx" ON "ai_configuration" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ai_insights_user_idx" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_insights_category_idx" ON "ai_insights" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_insights_entity_idx" ON "ai_insights" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ai_insights_company_idx" ON "ai_insights" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ai_insights_tenant_idx" ON "ai_insights" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_insights_generated_at_idx" ON "ai_insights" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "ai_insights_is_read_idx" ON "ai_insights" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "ai_benchmarks_category_idx" ON "ai_performance_benchmarks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_benchmarks_provider_idx" ON "ai_performance_benchmarks" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_benchmarks_company_idx" ON "ai_performance_benchmarks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ai_benchmarks_tenant_idx" ON "ai_performance_benchmarks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_benchmarks_date_idx" ON "ai_performance_benchmarks" USING btree ("measurement_date");--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage_tracking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_operation_idx" ON "ai_usage_tracking" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "ai_usage_provider_idx" ON "ai_usage_tracking" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_usage_company_idx" ON "ai_usage_tracking" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ai_usage_tenant_idx" ON "ai_usage_tracking" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_usage_created_at_idx" ON "ai_usage_tracking" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_idx" ON "conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_role_idx" ON "conversation_messages" USING btree ("role");--> statement-breakpoint
CREATE INDEX "conversation_messages_company_idx" ON "conversation_messages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_tenant_idx" ON "conversation_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_created_at_idx" ON "conversation_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_company_idx" ON "conversations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base" USING btree ("category");--> statement-breakpoint
CREATE INDEX "knowledge_base_company_idx" ON "knowledge_base" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_tenant_idx" ON "knowledge_base" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_is_active_idx" ON "knowledge_base" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "knowledge_base_priority_idx" ON "knowledge_base" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "import_logs_user_idx" ON "import_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_logs_company_idx" ON "import_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "import_logs_status_idx" ON "import_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_logs_type_idx" ON "import_logs" USING btree ("import_type");