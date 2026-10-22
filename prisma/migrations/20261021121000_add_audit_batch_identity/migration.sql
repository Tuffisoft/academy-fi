ALTER TABLE "WebsiteAudit" ADD COLUMN "batchId" TEXT;
UPDATE "WebsiteAudit" SET "batchId" = "runToken";
CREATE INDEX "WebsiteAudit_userId_batchId_idx" ON "WebsiteAudit"("userId", "batchId");
