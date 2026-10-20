BEGIN;

CREATE TYPE "LeadSearchStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "LeadSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "location" VARCHAR(200) NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "industry" VARCHAR(200) NOT NULL,
    "maxResults" INTEGER NOT NULL,
    "analyzeWebsites" BOOLEAN NOT NULL DEFAULT true,
    "status" "LeadSearchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeadSearch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadSearch_radiusKm_check" CHECK ("radiusKm" >= 0.1 AND "radiusKm" <= 9007199254740991),
    CONSTRAINT "LeadSearch_maxResults_check" CHECK ("maxResults" >= 1),
    CONSTRAINT "LeadSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LeadSearch_userId_createdAt_idx" ON "LeadSearch"("userId", "createdAt");
CREATE INDEX "LeadSearch_createdAt_idx" ON "LeadSearch"("createdAt");

COMMIT;
