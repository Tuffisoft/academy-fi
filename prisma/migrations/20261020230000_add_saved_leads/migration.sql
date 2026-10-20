BEGIN;
CREATE TABLE "SavedLead" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "placeId" VARCHAR(512) NOT NULL,
  "sourceSearchId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedLead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SavedLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedLead_sourceSearchId_fkey" FOREIGN KEY ("sourceSearchId") REFERENCES "LeadSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SavedLead_userId_placeId_key" ON "SavedLead"("userId", "placeId");
CREATE INDEX "SavedLead_userId_createdAt_idx" ON "SavedLead"("userId", "createdAt");
CREATE INDEX "SavedLead_sourceSearchId_idx" ON "SavedLead"("sourceSearchId");
COMMIT;
