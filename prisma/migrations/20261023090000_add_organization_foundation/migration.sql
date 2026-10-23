-- Atomic additive foundation. No existing business rows are modified.
BEGIN;

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETING');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CUSTOMER';

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "contactEmail" VARCHAR(254),
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEntitlement" (
    "organizationId" TEXT NOT NULL,
    "plan" VARCHAR(20) NOT NULL DEFAULT 'FREE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEntitlement_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "OrganizationAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorMembershipId" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "targetId" VARCHAR(160) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "OrganizationMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_id_userId_key" ON "OrganizationMembership"("organizationId", "id", "userId");

-- CreateIndex
CREATE INDEX "OrganizationAuditLog_organizationId_createdAt_idx" ON "OrganizationAuditLog"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEntitlement" ADD CONSTRAINT "OrganizationEntitlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_actor_membership_fkey" FOREIGN KEY ("organizationId", "actorMembershipId", "actorId") REFERENCES "OrganizationMembership"("organizationId", "id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foundation grants no paid rights before verified billing is implemented.
ALTER TABLE "OrganizationEntitlement" ADD CONSTRAINT "OrganizationEntitlement_free_only" CHECK ("plan" = 'FREE');
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_valid_name" CHECK (length(btrim("name")) > 0);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_valid_slug" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "OrganizationAuditLog" ADD CONSTRAINT "OrganizationAuditLog_reason_required" CHECK (length(btrim("reason")) > 0);

CREATE UNIQUE INDEX "OrganizationMembership_one_owner" ON "OrganizationMembership" ("organizationId") WHERE "role" = 'OWNER' AND "status" = 'ACTIVE';

-- Deferred lower bound permits atomic creation and ownership transfer.
-- Organization and owner membership must be inserted in the same transaction.
CREATE FUNCTION "loyalty_check_owner"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE organization_id text;
BEGIN
  IF TG_TABLE_NAME = 'Organization' THEN
    organization_id := COALESCE(NEW."id", OLD."id");
  ELSE
    organization_id := COALESCE(NEW."organizationId", OLD."organizationId");
    IF TG_OP = 'UPDATE' AND OLD."organizationId" <> NEW."organizationId" THEN
      RAISE EXCEPTION 'Membership organization is immutable' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM "Organization" WHERE "id" = organization_id)
     AND (SELECT count(*) FROM "OrganizationMembership" WHERE "organizationId" = organization_id AND "role" = 'OWNER' AND "status" = 'ACTIVE') <> 1 THEN
    RAISE EXCEPTION 'Organization requires exactly one active owner' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Organization_requires_owner" AFTER INSERT OR UPDATE ON "Organization"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "loyalty_check_owner"();
CREATE CONSTRAINT TRIGGER "OrganizationMembership_preserves_owner" AFTER INSERT OR UPDATE OR DELETE ON "OrganizationMembership"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "loyalty_check_owner"();

COMMIT;
