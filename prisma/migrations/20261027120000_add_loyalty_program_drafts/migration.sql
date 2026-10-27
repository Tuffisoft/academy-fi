-- Additive preparation only. Applying this migration requires explicit authorization.
CREATE TABLE "LoyaltyOperation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "operationId" VARCHAR(36) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "resultId" VARCHAR(160) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LoyaltyOperation_organizationId_operationId_key" ON "LoyaltyOperation"("organizationId", "operationId");
CREATE INDEX "LoyaltyOperation_organizationId_action_createdAt_idx" ON "LoyaltyOperation"("organizationId", "action", "createdAt");
CREATE TABLE "LoyaltyAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL DEFAULT 'image/png',
  "purpose" TEXT NOT NULL DEFAULT 'LOGO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyAsset_normalized_check" CHECK ("mediaType" = 'image/png' AND "purpose" = 'LOGO')
);
CREATE UNIQUE INDEX "LoyaltyAsset_storageKey_key" ON "LoyaltyAsset"("storageKey");
CREATE UNIQUE INDEX "LoyaltyAsset_organizationId_id_key" ON "LoyaltyAsset"("organizationId", "id");

CREATE TABLE "LoyaltyProgram" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "name" VARCHAR(80) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "reward" VARCHAR(160) NOT NULL,
  "target" INTEGER NOT NULL,
  "backgroundColor" VARCHAR(7) NOT NULL,
  "textColor" VARCHAR(7) NOT NULL,
  "symbol" VARCHAR(20) NOT NULL,
  "logoAssetId" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LoyaltyProgram_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyProgram_organizationId_logoAssetId_fkey" FOREIGN KEY ("organizationId", "logoAssetId") REFERENCES "LoyaltyAsset"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyProgram_values_check" CHECK ("target" > 0 AND "revision" > 0 AND length(btrim("name")) > 0 AND length(btrim("reward")) > 0),
  CONSTRAINT "LoyaltyProgram_draft_check" CHECK ("status" = 'DRAFT'),
  CONSTRAINT "LoyaltyProgram_colors_check" CHECK ("backgroundColor" ~ '^#[0-9A-F]{6}$' AND "textColor" ~ '^#[0-9A-F]{6}$'),
  CONSTRAINT "LoyaltyProgram_symbol_check" CHECK ("symbol" IN ('STAMP', 'STAR', 'HEART', 'GIFT', 'COFFEE'))
);
CREATE UNIQUE INDEX "LoyaltyProgram_organizationId_id_key" ON "LoyaltyProgram"("organizationId", "id");
CREATE INDEX "LoyaltyProgram_organizationId_createdAt_id_idx" ON "LoyaltyProgram"("organizationId", "createdAt", "id");
-- Rollback preparation: only before any real program data, remove LoyaltyProgram first, then
-- LoyaltyAsset and LoyaltyOperation. Never run a destructive rollback on existing data; retain/back up rows instead.
