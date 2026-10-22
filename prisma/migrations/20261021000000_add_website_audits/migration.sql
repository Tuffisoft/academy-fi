BEGIN;
CREATE TABLE "WebsiteAudit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "placeId" VARCHAR(512) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
  "runToken" TEXT NOT NULL,
  "qualityScore" INTEGER,
  "report" JSONB,
  "errorCode" VARCHAR(40),
  "startedAt" TIMESTAMP(3),
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WebsiteAudit_qualityScore_check" CHECK ("qualityScore" IS NULL OR "qualityScore" BETWEEN 0 AND 100),
  CONSTRAINT "WebsiteAudit_status_check" CHECK ("status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'NO_WEBSITE', 'FAILED'))
);
CREATE UNIQUE INDEX "WebsiteAudit_userId_placeId_key" ON "WebsiteAudit"("userId", "placeId");
CREATE INDEX "WebsiteAudit_userId_status_idx" ON "WebsiteAudit"("userId", "status");
CREATE INDEX "WebsiteAudit_status_startedAt_idx" ON "WebsiteAudit"("status", "startedAt");
COMMIT;
