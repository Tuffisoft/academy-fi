import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";

test("organization DB constraints, tenant guards and concurrent Free capacity", { timeout: 180_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { getOrganizationContext, getInternalOrganizationDetail, addStaffMembership } = await import("../../src/lib/loyalty/organizations");
  const prefix = randomUUID();
  const users = Array.from({ length: 23 }, () => randomUUID());
  const orgA = randomUUID(), orgB = randomUUID();
  const memberA = randomUUID(), memberB = randomUUID();
  try {
    await prisma.user.createMany({ data: users.map((id, i) => ({ id, name: "Loyalty isolated test", email: `${id}@example.invalid`, role: i === 22 ? "OWNER" : "CUSTOMER" })) });
    for (const [id, userId, membershipId] of [[orgA, users[0], memberA], [orgB, users[1], memberB]]) {
      await prisma.$transaction(async (tx) => {
        await tx.organization.create({ data: { id, slug: `test-${id}`, name: `Test ${prefix}`, status: "ACTIVE", entitlement: { create: {} } } });
        await tx.organizationMembership.create({ data: { id: membershipId, organizationId: id, userId, role: "OWNER" } });
      });
    }
    assert.equal((await getOrganizationContext(users[0], orgA)).role, "OWNER");
    await assert.rejects(getOrganizationContext(users[0], orgB), /FORBIDDEN/);
    await assert.rejects(getOrganizationContext(users[22], orgA), /FORBIDDEN/);
    await assert.rejects(getInternalOrganizationDetail(users[0], orgA), /FORBIDDEN/);
    assert.equal((await getInternalOrganizationDetail(users[22], orgA))?.id, orgA);

    // Real FK rejection of a membership belonging to the other tenant.
    await assert.rejects(prisma.organizationAuditLog.create({ data: { organizationId: orgA, actorId: users[1], actorMembershipId: memberB, action: "TEST", targetId: orgA, reason: "Foreign membership must fail" } }));
    await assert.rejects(prisma.organizationAuditLog.create({ data: { organizationId: orgA, actorId: users[1], actorMembershipId: memberA, action: "TEST", targetId: orgA, reason: "Mismatched actor must fail" } }));
    await assert.rejects(prisma.organizationEntitlement.update({ where: { organizationId: orgA }, data: { plan: "PRO" } }));
    await assert.rejects(prisma.organizationMembership.create({ data: { organizationId: orgA, userId: users[2], role: "OWNER" } }));
    await assert.rejects(prisma.organizationMembership.update({ where: { id: memberA }, data: { status: "REVOKED" } }));

    const staff = await prisma.organizationMembership.create({ data: { organizationId: orgA, userId: users[2], role: "STAFF" } });
    assert.equal((await getOrganizationContext(users[2], orgA)).role, "STAFF");
    await prisma.organizationMembership.update({ where: { id: staff.id }, data: { status: "REVOKED" } });
    await assert.rejects(getOrganizationContext(users[2], orgA), /FORBIDDEN/);
    await assert.rejects(addStaffMembership(users[2], orgA, users[3], "Revoked membership"), /FORBIDDEN/);
    await prisma.organizationMembership.delete({ where: { id: staff.id } });
    await prisma.user.update({ where: { id: users[0] }, data: { role: "OWNER,CUSTOMER" } });
    await assert.rejects(getOrganizationContext(users[0], orgA), /FORBIDDEN/);
    await prisma.user.update({ where: { id: users[0] }, data: { role: "CUSTOMER" } });

    // Free already has its owner in the only seat: neither retries nor independent
    // contenders may create a second seat. First-seat onboarding belongs to v0.2.0.
    const repeated = await Promise.allSettled(Array.from({ length: 20 }, () => addStaffMembership(users[0], orgA, users[2], "Repeated capacity test")));
    const independent = await Promise.allSettled(users.slice(2, 22).map((id) => addStaffMembership(users[0], orgA, id, "Independent capacity test")));
    for (const result of [...repeated, ...independent]) {
      assert.equal(result.status, "rejected");
      if (result.status === "rejected") assert.match(String(result.reason), /LIMIT_REACHED/);
    }
    assert.equal(await prisma.organizationMembership.count({ where: { organizationId: orgA } }), 1);
    await prisma.user.update({ where: { id: users[0] }, data: { banned: true } });
    await assert.rejects(getOrganizationContext(users[0], orgA), /FORBIDDEN/);
    await assert.rejects(addStaffMembership(users[0], orgA, users[2], "Revoked identity"), /FORBIDDEN/);
    await prisma.user.update({ where: { id: users[0] }, data: { banned: false } });
    await prisma.organization.update({ where: { id: orgA }, data: { status: "SUSPENDED" } });
    await assert.rejects(getOrganizationContext(users[0], orgA), /FORBIDDEN/);
  } finally {
    // Delete only this run's randomly identified fixtures. Deferred owner constraints
    // permit cleanup of the entire organization in one transaction.
    await prisma.$transaction(async (tx) => {
      await tx.organizationAuditLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.organizationEntitlement.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.organizationMembership.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
