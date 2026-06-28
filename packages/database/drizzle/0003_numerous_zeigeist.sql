ALTER TABLE "clarifications" ADD COLUMN "type" varchar(50) DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "clarifications" ADD COLUMN "required" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "github_repo_sync_id" text;