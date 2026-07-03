ALTER TABLE "user_settings" ADD COLUMN "daily_new_words_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "last_new_words_date" varchar(50);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "today_new_words_count" integer DEFAULT 0 NOT NULL;