-- Migration: 0006_payout_records
-- Adds the payout_records table for admin-created astrologer settlements.
-- Also adds payout_method + payout_details columns to astrologer_profiles
-- (migration drift fix — these columns exist in the Drizzle schema but were
-- never applied to the database, causing 500s on the astrologers endpoint).
-- And adds user_id + astrologer_id columns to payments table
-- (same drift — causes 500s on the transactions endpoint).

--> statement-breakpoint
-- 1. Fix astrologer_profiles migration drift
ALTER TABLE "astrologer_profiles"
  ADD COLUMN IF NOT EXISTS "payout_method" varchar(8),
  ADD COLUMN IF NOT EXISTS "payout_details" jsonb,
  ADD COLUMN IF NOT EXISTS "payout_details_updated_at" timestamp with time zone;

--> statement-breakpoint
-- 2. Fix payments table migration drift
--    (only add if the column truly doesn't exist — safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE "payments" ADD COLUMN "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'astrologer_id'
  ) THEN
    ALTER TABLE "payments" ADD COLUMN "astrologer_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

--> statement-breakpoint
-- 3. Create payout_records table
CREATE TABLE IF NOT EXISTS "payout_records" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "astrologer_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount"         numeric(12, 2) NOT NULL,
  "status"         varchar(10) NOT NULL DEFAULT 'pending',
  "payout_method"  varchar(8),
  "reference_id"   varchar(255),
  "notes"          text,
  "period_from"    timestamp with time zone,
  "period_to"      timestamp with time zone,
  "created_by"     uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payout_records_astrologer_idx" ON "payout_records" ("astrologer_id");
CREATE INDEX IF NOT EXISTS "payout_records_status_idx"     ON "payout_records" ("status");
CREATE INDEX IF NOT EXISTS "payout_records_created_at_idx" ON "payout_records" ("created_at");
