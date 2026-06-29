CREATE TYPE "public"."issue_type" AS ENUM('BLOCKING', 'NON_BLOCKING');--> statement-breakpoint
CREATE TYPE "public"."phase" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."pr_status" AS ENUM('DRAFT', 'OPEN', 'IN_REVIEW', 'APPROVED', 'MERGED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."prd_status" AS ENUM('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'IMPLEMENTED');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('NEW', 'CLARIFYING', 'AWAITING_APPROVAL', 'APPROVED', 'PRD_GENERATING', 'PRD_GENERATED', 'AWAITING_PLAN_APPROVAL', 'PLAN_APPROVED', 'IN_DEVELOPMENT', 'IN_AI_REVIEW', 'FIX_NEEDED', 'READY_FOR_HUMAN_APPROVAL', 'SHIPPED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'APPROVED', 'NEEDS_FIXES', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');--> statement-breakpoint
CREATE TABLE "clarifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"asked_by" varchar(255) DEFAULT 'ai',
	"user_id" text,
	"is_answered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"answered_at" timestamp,
	"type" varchar(50) DEFAULT 'standard',
	"required" boolean DEFAULT true
);
--> statement-breakpoint
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
CREATE TABLE "prds" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"problem_statement" text,
	"goals" jsonb,
	"non_goals" jsonb,
	"user_stories" jsonb,
	"acceptance_criteria" jsonb,
	"edge_cases" jsonb,
	"success_metrics" jsonb,
	"non_functional_requirements" jsonb,
	"constraints" text,
	"assumptions" text,
	"dependencies" jsonb,
	"status" "prd_status" DEFAULT 'DRAFT' NOT NULL,
	"file_url" varchar(500),
	"review_requested_at" timestamp,
	"approved_at" timestamp,
	"user_id" text,
	"review_comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" varchar(255) DEFAULT 'ai',
	CONSTRAINT "prds_request_id_unique" UNIQUE("request_id")
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
	"review_comment" text[],
	"reviewed_at" timestamp[],
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
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "request_status" DEFAULT 'NEW' NOT NULL,
	"phase" "phase" DEFAULT '1' NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"source" varchar(50) NOT NULL,
	"source_id" varchar(255),
	"priority" varchar(20) DEFAULT 'MEDIUM',
	"deadline" timestamp,
	"approval_requested_at" timestamp,
	"approved_at" timestamp,
	"user_id" text,
	"approval_comments" text,
	"rejection_reason" text,
	"github_issue_number" integer,
	"github_issue_url" varchar(500),
	"github_branch_name" varchar(255),
	"github_repo_sync_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"prd_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"github_issue_number" integer,
	"github_issue_url" varchar(500),
	"user_id" text,
	"estimated_hours" integer,
	"actual_hours" integer,
	"order" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clarifications" ADD CONSTRAINT "fk_clarification_request" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prds" ADD CONSTRAINT "fk_prd_request" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "fk_task_prd" FOREIGN KEY ("prd_id") REFERENCES "public"."prds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clarification_request" ON "clarifications" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_clarification_answered" ON "clarifications" USING btree ("is_answered");--> statement-breakpoint
CREATE INDEX "github_installation_userId_idx" ON "github_installation" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_installation_installationId_idx" ON "github_installation" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "idx_prd_status" ON "prds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_prd_approved" ON "prds" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "pull_request_installationId_idx" ON "pull_request" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "pull_request_status_idx" ON "pull_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repo_sync_installationId_idx" ON "repo_sync" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "repo_sync_status_idx" ON "repo_sync" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_request_status" ON "requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_request_phase" ON "requests" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "idx_request_customer_email" ON "requests" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "idx_request_github_issue" ON "requests" USING btree ("github_issue_number");--> statement-breakpoint
CREATE INDEX "idx_task_prd" ON "tasks" USING btree ("prd_id");--> statement-breakpoint
CREATE INDEX "idx_task_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_assigned" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");