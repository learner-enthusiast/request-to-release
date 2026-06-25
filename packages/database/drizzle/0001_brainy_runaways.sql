CREATE TABLE "github_installation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"installation_id" integer NOT NULL,
	"account_login" text,
	"account_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installation_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "github_installation_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "pull_request" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"pr_number" integer NOT NULL,
	"title" text NOT NULL,
	"author_login" text,
	"head_sha" text NOT NULL,
	"base_branch" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_comment" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_request_repo_pr_unique" UNIQUE("repo_full_name","pr_number")
);
--> statement-breakpoint
CREATE TABLE "repo_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"repo_full_name" text NOT NULL,
	"branch" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repo_sync_repo_full_name_unique" UNIQUE("repo_full_name")
);
--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_installation_userId_idx" ON "github_installation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_installation_installationId_idx" ON "github_installation" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "pull_request_installationId_idx" ON "pull_request" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "pull_request_status_idx" ON "pull_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repo_sync_installationId_idx" ON "repo_sync" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "repo_sync_status_idx" ON "repo_sync" USING btree ("status");