-- Preparation only. Apply exclusively after explicit approval for the target database.
BEGIN;
CREATE TABLE "OrganizationInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "email" VARCHAR(254) NOT NULL,
  "role" "OrganizationRole" NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "acceptedById" TEXT REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "acceptedAt" TIMESTAMP(3),
  "deliveryAttemptId" TEXT NOT NULL,
  "deliveryStatus" VARCHAR(24) NOT NULL DEFAULT 'NOT_SENT',
  "providerId" VARCHAR(160),
  "deliveryUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvitation_role" CHECK ("role" IN ('ADMIN', 'STAFF')),
  CONSTRAINT "OrganizationInvitation_email" CHECK ("email" = lower(btrim("email")) AND length("email") > 3),
  CONSTRAINT "OrganizationInvitation_hash" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "OrganizationInvitation_state" CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED')),
  CONSTRAINT "OrganizationInvitation_acceptance" CHECK (
    ("status" = 'ACCEPTED' AND "acceptedById" IS NOT NULL AND "acceptedAt" IS NOT NULL)
    OR ("status" <> 'ACCEPTED' AND "acceptedById" IS NULL AND "acceptedAt" IS NULL)),
  CONSTRAINT "OrganizationInvitation_expiry" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "OrganizationInvitation_delivery" CHECK ("deliveryStatus" IN ('NOT_SENT', 'PROVIDER_ACCEPTED', 'FAILED', 'UNKNOWN')),
  CONSTRAINT "OrganizationInvitation_provider" CHECK (("deliveryStatus" = 'PROVIDER_ACCEPTED') = ("providerId" IS NOT NULL))
);
CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE UNIQUE INDEX "OrganizationInvitation_pending_email" ON "OrganizationInvitation"("organizationId", "email") WHERE "status" = 'PENDING';
CREATE INDEX "OrganizationInvitation_organizationId_status_expiresAt_idx" ON "OrganizationInvitation"("organizationId", "status", "expiresAt");
CREATE INDEX "OrganizationInvitation_organizationId_email_createdAt_idx" ON "OrganizationInvitation"("organizationId", "email", "createdAt");

CREATE TABLE "OrganizationOperation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "operationId" VARCHAR(36) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "resultId" VARCHAR(160) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationOperation_uuid" CHECK ("operationId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  CONSTRAINT "OrganizationOperation_hash" CHECK ("fingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "OrganizationOperation_action" CHECK ("action" IN ('INVITE', 'ACCEPT', 'REVOKE_INVITATION', 'ROTATE_INVITATION', 'CHANGE_ROLE', 'REMOVE_MEMBER', 'TRANSFER_OWNER'))
);
CREATE UNIQUE INDEX "OrganizationOperation_organizationId_actorId_operationId_key" ON "OrganizationOperation"("organizationId", "actorId", "operationId");
CREATE INDEX "OrganizationOperation_organizationId_action_createdAt_idx" ON "OrganizationOperation"("organizationId", "action", "createdAt");
COMMIT;
