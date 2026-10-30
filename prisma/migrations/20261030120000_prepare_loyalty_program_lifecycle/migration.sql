-- Preparation only: do not apply without concrete authorization for the target DB.
-- Transactional DDL keeps the former status guard in force if any step fails.
BEGIN;

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "blockedAt" TIMESTAMP(3),
  ADD COLUMN "conditionsBoundAt" TIMESTAMP(3);

ALTER TABLE "LoyaltyProgram"
  ADD CONSTRAINT "LoyaltyProgram_status_check"
  CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));

ALTER TABLE "LoyaltyProgram" DROP CONSTRAINT "LoyaltyProgram_draft_check";

CREATE INDEX "LoyaltyProgram_organizationId_status_idx"
  ON "LoyaltyProgram"("organizationId", "status");

-- Binding is permanent and independent of the existence of customer cards.
-- Concurrent UPDATEs serialize on the program row. The issuing service must
-- acquire organization -> program locks and bind within the issuance transaction.
CREATE FUNCTION "loyalty_protect_program_conditions"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."conditionsBoundAt" IS NOT NULL AND (
    NEW."conditionsBoundAt" IS DISTINCT FROM OLD."conditionsBoundAt"
    OR NEW."target" IS DISTINCT FROM OLD."target"
    OR NEW."reward" IS DISTINCT FROM OLD."reward"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'LoyaltyProgram_bound_conditions_check',
      MESSAGE = 'Bound program conditions cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "LoyaltyProgram_protect_conditions"
  BEFORE UPDATE ON "LoyaltyProgram"
  FOR EACH ROW EXECUTE FUNCTION "loyalty_protect_program_conditions"();

COMMIT;

-- No data rewrite, tariff change, card issuance or publication is performed.
-- Rollback requires separate authorization and an exclusive table lock in the
-- same transaction as its compatibility check. Abort if ANY row is non-DRAFT,
-- blocked or bound. Never clear status/markers or delete rows to force rollback.
-- Only after that check: restore LoyaltyProgram_draft_check, drop this trigger,
-- function, index and status_check, then the two new columns. Retain all rows.
-- This is a rollback outline, not an executable or automatically applied rollback.
