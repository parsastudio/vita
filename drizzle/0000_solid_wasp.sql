CREATE TABLE "deleted_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"table_name" varchar(255) NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_budgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"category_or_tag" varchar(255) NOT NULL,
	"limit_amount" numeric(15, 2) NOT NULL,
	"period" varchar(50) DEFAULT 'monthly' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"category" varchar(255) NOT NULL,
	"tags" text[] NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "language_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"original_text" text NOT NULL,
	"translation" text NOT NULL,
	"focus_word" varchar(255) NOT NULL,
	"srs_status" varchar(50) DEFAULT 'active' NOT NULL,
	"difficulty" numeric DEFAULT '0.5' NOT NULL,
	"stability" numeric DEFAULT '1.0' NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" integer DEFAULT 0 NOT NULL,
	"due" timestamp with time zone DEFAULT now() NOT NULL,
	"last_review" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"enabled_modules" text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"reset_token" text,
	"reset_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "deleted_records" ADD CONSTRAINT "deleted_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "language_cards" ADD CONSTRAINT "language_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deleted_records_user_id_idx" ON "deleted_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deleted_records_deleted_at_idx" ON "deleted_records" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "finance_budgets_user_id_idx" ON "finance_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "finance_budgets_updated_at_idx" ON "finance_budgets" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "finance_transactions_user_id_idx" ON "finance_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_updated_at_idx" ON "finance_transactions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "language_cards_user_id_idx" ON "language_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "language_cards_updated_at_idx" ON "language_cards" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "language_cards_due_idx" ON "language_cards" USING btree ("due");--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_settings_updated_at_idx" ON "user_settings" USING btree ("updated_at");