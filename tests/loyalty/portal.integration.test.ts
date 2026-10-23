import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";

test("real DB: multiple INTERN companies, tenant reads, retry payloads and 20-way concurrency", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { createOrganization, getPortalOrganizations, getPortalOrganization } = await import("../../src/lib/loyalty/organizations");
  const users = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const marker = randomUUID();
  let createdIds: string[] = [];
  try {
    await prisma.user.createMany({ data: users.map((id, i) => ({ id, name: "Isolated portal test", email: `${id}@example.invalid`, role: i < 2 ? "INTERN" : i === 2 ? "OWNER" : "CUSTOMER", emailVerified: true })) });
    const operation = randomUUID();
    const repeated = await Promise.all(Array.from({ length: 20 }, () => createOrganization(users[0], `Repeat ${marker}`, operation)));
    assert.equal(new Set(repeated.map(row => row.id)).size, 1);
    await assert.rejects(createOrganization(users[0], `Other payload ${marker}`, operation), /CONFLICT/);
    const independent = await Promise.all(Array.from({ length: 20 }, (_, i) => createOrganization(users[0], `Independent ${i} ${marker}`, randomUUID())));
    assert.equal(new Set(independent.map(row => row.id)).size, 20);
    const foreign = await createOrganization(users[1], `Other owner ${marker}`, randomUUID());
    createdIds = [...new Set([...repeated, ...independent, foreign].map(row => row.id))];
    const own = await getPortalOrganizations(users[0]);
    assert.equal(own.internal, false); assert.equal(own.canCreate, true);
    assert.equal(own.organizations.length, 21);
    assert.ok(!own.organizations.some(row => row.id === foreign.id));
    assert.equal((await getPortalOrganization(users[0], repeated[0].slug)).id, repeated[0].id);
    await assert.rejects(getPortalOrganization(users[0], foreign.slug), /FORBIDDEN/);
    await assert.rejects(getPortalOrganization(users[3], repeated[0].slug), /FORBIDDEN/);
    for (const actor of [users[2], users[3]]) await assert.rejects(createOrganization(actor, "Denied", randomUUID()), /FORBIDDEN/);
    const all = await getPortalOrganizations(users[2]);
    assert.equal(all.internal, true); assert.equal(all.canCreate, false);
    assert.ok(all.organizations.some(row => row.id === foreign.id));
    assert.equal((await getPortalOrganization(users[2], foreign.slug)).internal, true);
    for (const id of createdIds) {
      assert.equal(await prisma.organizationMembership.count({ where: { organizationId: id, role: "OWNER", status: "ACTIVE" } }), 1);
      assert.equal((await prisma.organizationEntitlement.findUniqueOrThrow({ where: { organizationId: id } })).plan, "FREE");
      assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: id, action: "ORGANIZATION_CREATED" } }), 1);
    }
    await prisma.$transaction(async tx => {
      await tx.organizationMembership.updateMany({ where: { organizationId: repeated[0].id, userId: users[0] }, data: { role: "ADMIN", status: "REVOKED" } });
      await tx.organizationMembership.create({ data: { organizationId: repeated[0].id, userId: users[1], role: "OWNER" } });
    });
    await assert.rejects(getPortalOrganization(users[0], repeated[0].slug), /FORBIDDEN/);
    await assert.rejects(createOrganization(users[0], `Repeat ${marker}`, operation), /FORBIDDEN/);
    assert.ok(!(await getPortalOrganizations(users[0])).organizations.some(row => row.id === repeated[0].id));
    await prisma.user.update({ where: { id: users[0] }, data: { role: "OWNER,INTERN" } });
    await assert.rejects(getPortalOrganizations(users[0]), /FORBIDDEN/);
    await prisma.user.update({ where: { id: users[0] }, data: { role: "INTERN", banned: true } });
    await assert.rejects(createOrganization(users[0], "Denied", randomUUID()), /FORBIDDEN/);
    await assert.rejects(getPortalOrganizations(users[0]), /FORBIDDEN/);
  } finally {
    // Discover only this run's owned fixtures, including commits before a failed assertion.
    const memberships = await prisma.organizationMembership.findMany({ where: { userId: { in: users } }, select: { organizationId: true } });
    createdIds = [...new Set([...createdIds, ...memberships.map(row => row.organizationId)])];
    await prisma.$transaction(async tx => {
      await tx.organizationAuditLog.deleteMany({ where: { organizationId: { in: createdIds } } });
      await tx.organizationEntitlement.deleteMany({ where: { organizationId: { in: createdIds } } });
      await tx.organizationMembership.deleteMany({ where: { organizationId: { in: createdIds } } });
      await tx.organization.deleteMany({ where: { id: { in: createdIds } } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
    });
    await prisma.$disconnect();
  }
});
