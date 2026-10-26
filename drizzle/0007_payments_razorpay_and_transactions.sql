-- Migration: Add Razorpay columns to payments + create payment_transactions table
-- Run this DIRECTLY in Neon SQL Editor (drizzle-kit migrate will skip it)

-- ── 1. payments table — add Razorpay + extra columns ─────────────────────────
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "razorpay_order_id"   varchar(255),
  ADD COLUMN IF NOT EXISTS "razorpay_payment_id" varchar(255),
  ADD COLUMN IF NOT EXISTS "currency"            varchar(10)  NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "method"              varchar(50),
  ADD COLUMN IF NOT EXISTS "failure_code"        varchar(100),
  ADD COLUMN IF NOT EXISTS "failure_reason"      text,
  ADD COLUMN IF NOT EXISTS "captured_at"         timestamp with time zone;

-- Index on razorpay_order_id (lookups during webhook processing)
CREATE INDEX IF NOT EXISTS "payments_razorpay_order_id_idx"
  ON "payments" ("razorpay_order_id");

-- ── 2. payment_transactions table — immutable webhook event log ───────────────
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id"                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  "payment_id"          uuid          REFERENCES "payments"("id")     ON DELETE SET NULL,
  "appointment_id"      uuid          REFERENCES "appointments"("id") ON DELETE SET NULL,
  "user_id"             uuid          REFERENCES "users"("id")        ON DELETE SET NULL,
  "astrologer_id"       uuid          REFERENCES "users"("id")        ON DELETE SET NULL,
  "razorpay_order_id"   varchar(255),
  "razorpay_payment_id" varchar(255),
  "event"               varchar(50)   NOT NULL,
  "amount"              numeric(12,2),
  "currency"            varchar(10)   DEFAULT 'INR',
  "method"              varchar(50),
  "failure_code"        varchar(100),
  "failure_reason"      text,
  "razorpay_fee"        numeric(12,2),
  "razorpay_tax"        numeric(12,2),
  "captured_at"         timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pt_razorpay_order_id_idx"  ON "payment_transactions" ("razorpay_order_id");
CREATE INDEX IF NOT EXISTS "pt_appointment_id_idx"     ON "payment_transactions" ("appointment_id");
CREATE INDEX IF NOT EXISTS "pt_user_id_idx"            ON "payment_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "pt_event_idx"              ON "payment_transactions" ("event");
CREATE INDEX IF NOT EXISTS "pt_created_at_idx"         ON "payment_transactions" ("created_at");
