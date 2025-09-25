ALTER TABLE "activities" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "initiatives" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "objectives" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "objectives" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stack_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
CREATE INDEX "activities_tenant_idx" ON "activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "initiatives_tenant_idx" ON "initiatives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "objectives_tenant_idx" ON "objectives" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "profiles_tenant_idx" ON "profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_stack_user_idx" ON "users" USING btree ("stack_user_id");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stack_user_id_unique" UNIQUE("stack_user_id");