ALTER TABLE "forms" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ALTER COLUMN "settings" SET DEFAULT '{"theme":"light","primaryColor":"#6C47FF","fontFamily":"DM Sans","showProgressBar":true,"shuffleQuestions":false,"allowMultipleSubmissions":false,"autoSaveDraft":true,"showSocialShare":false,"notifyOwnerOnSubmission":true,"thankYouMessage":"Thanks for your response! 🎉"}'::jsonb;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "anonymous_responses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "expiry" timestamp;--> statement-breakpoint
ALTER TABLE "form_responses" ADD COLUMN "name" varchar(80);