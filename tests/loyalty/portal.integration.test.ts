import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";

test("real DB: multiple INTERN companies, tenant reads, retry payloads and 20-way concurrency", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { createOrganization, getPortalOrganizations, getPortalOrganization, searchInternalOrganizations, getInternalOrganizationDetail, getOrganizationContext } = await import("../../src/lib/loyalty/organizations");
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
    // Read-only basis remains available without granting tariff-dependent writes.
    await prisma.organizationEntitlement.delete({ where: { organizationId: foreign.id } });
    assert.equal((await getPortalOrganization(users[1], foreign.slug)).entitlement, null);
    await assert.rejects(getOrganizationContext(users[1], foreign.id), /FORBIDDEN/);
    await prisma.organizationEntitlement.create({ data: { organizationId: foreign.id, plan: "FREE" } });
    for (const role of ["ADMIN", "STAFF"] as const) {
      const membership = await prisma.organizationMembership.create({ data: { organizationId: foreign.id, userId: users[3], role } });
      assert.equal((await getPortalOrganization(users[3], foreign.slug)).role, role);
      await prisma.organizationMembership.update({ where: { id: membership.id }, data: { status: "REVOKED" } });
      await assert.rejects(getPortalOrganization(users[3], foreign.slug), /FORBIDDEN/);
      await prisma.organizationMembership.delete({ where: { id: membership.id } });
    }
    // Known synthetic IDs make pagination deterministic without inspecting unrelated data.
    const pageIds = Array.from({ length: 55 }, (_, i) => `v040-${marker}-${String(i).padStart(3, "0")}`);
    createdIds.push(...pageIds);
    await prisma.$transaction(async tx => {
      for (const id of pageIds) {
        await tx.organization.create({ data: { id, slug: id, name: `Search ${marker}`, status: "ACTIVE" } });
        await tx.organizationMembership.create({ data: { organizationId: id, userId: users[1], role: "OWNER" } });
      }
    });
    const first = await searchInternalOrganizations(users[2], { q: `search ${marker}` });
    assert.deepEqual(first.organizations.map(row => row.id), pageIds.slice(0, 50));
    assert.equal(first.next, pageIds[49]);
    const second = await searchInternalOrganizations(users[2], { q: `SEARCH ${marker}`, after: first.next! });
    assert.deepEqual(second.organizations.map(row => row.id), pageIds.slice(50));
    assert.equal(second.next, null);
    assert.equal((await searchInternalOrganizations(users[2], { q: pageIds[0] })).organizations[0].id, pageIds[0]);
    assert.equal((await searchInternalOrganizations(users[2], { q: `missing-${marker}` })).organizations.length, 0);
    for (const actor of [users[0], users[1], users[3]]) await assert.rejects(searchInternalOrganizations(actor, { q: marker }), /FORBIDDEN/);
    await prisma.organization.update({ where: { id: foreign.id }, data: { status: "SUSPENDED" } });
    await assert.rejects(getPortalOrganization(users[1], foreign.slug), /FORBIDDEN/);
    assert.equal((await searchInternalOrganizations(users[2], { q: foreign.id })).organizations[0].status, "SUSPENDED");
    const beforeAudit = await prisma.organizationAuditLog.count({ where: { organizationId: foreign.id, actorId: users[2], action: "INTERNAL_DETAIL_READ" } });
    assert.equal((await getInternalOrganizationDetail(users[2], foreign.id))?.id, foreign.id);
    assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: foreign.id, actorId: users[2], targetId: foreign.id, action: "INTERNAL_DETAIL_READ" } }), beforeAudit + 1);
    await prisma.user.update({ where: { id: users[2] }, data: { role: "INTERN" } });
    await assert.rejects(searchInternalOrganizations(users[2], { q: marker }), /FORBIDDEN/);
    await assert.rejects(getInternalOrganizationDetail(users[2], foreign.id), /FORBIDDEN/);
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
