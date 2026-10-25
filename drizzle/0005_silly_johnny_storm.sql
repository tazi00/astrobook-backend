ALTER TYPE "cancellation_request_status" ADD VALUE 'admin_pending_money';--> statement-breakpoint
ALTER TYPE "cancellation_request_status" ADD VALUE 'admin_pending_wallet';--> statement-breakpoint
ALTER TYPE "cancellation_request_status" ADD VALUE 'admin_approved';--> statement-breakpoint
ALTER TYPE "cancellation_request_status" ADD VALUE 'admin_rejected';--> statement-breakpoint
ALTER TABLE "cancellation_requests" ALTER COLUMN "razorpay_payment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD COLUMN "deduction_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD COLUMN "upi_id" varchar(255);