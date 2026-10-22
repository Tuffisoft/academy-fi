ALTER TYPE "LeadSearchStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TABLE "LeadSearch" ADD COLUMN "pauseRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LeadSearch" ADD COLUMN "checkpoint" JSONB;
ALTER TABLE "WebsiteAudit" DROP CONSTRAINT IF EXISTS "WebsiteAudit_status_check";
ALTER TABLE "WebsiteAudit" ADD CONSTRAINT "WebsiteAudit_status_check"
  CHECK ("status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'NO_WEBSITE', 'FAILED', 'PAUSED', 'CANCELLED'));
