BEGIN;

ALTER TABLE "SavedLead" ADD COLUMN IF NOT EXISTS "location" VARCHAR(200);
ALTER TABLE "SavedLead" ADD COLUMN IF NOT EXISTS "industry" VARCHAR(200);

-- Preserve the known campaign context before campaigns can be edited or deleted.
UPDATE "SavedLead" AS lead
SET "location" = COALESCE(lead."location", search."location"),
    "industry" = COALESCE(lead."industry", search."industry")
FROM "LeadSearch" AS search
WHERE lead."sourceSearchId" = search."id"
  AND (lead."location" IS NULL OR lead."industry" IS NULL);

COMMIT;
