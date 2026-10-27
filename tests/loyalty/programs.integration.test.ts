import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

test("real DB: draft replay, independent writes, tenant FK and revision concurrency", { timeout: 240000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { saveProgram, readPrograms } = await import("../../src/lib/loyalty/programs");
  const actor = randomUUID(), org = randomUUID(), foreign = randomUUID();
  try {
    await prisma.user.create({ data: { id: actor, name: "Isolated draft test", email: `${actor}@example.invalid`, role: "CUSTOMER", emailVerified: true } });
    for (const id of [org, foreign]) await prisma.organization.create({ data: { id, slug: id, name: "Isolated draft test", status: "ACTIVE", entitlement: { create: { plan: "FREE" } }, memberships: { create: { userId: actor, role: "OWNER" } } } });
    const input = { organizationId: org, operationId: randomUUID(), config: { ...defaultProgram, name: "Coffee", reward: "Coffee" } };
    const repeat = await Promise.all(Array.from({ length: 20 }, () => saveProgram(actor, input)));
    assert.equal(new Set(repeat.map(row => row.program.id)).size, 1);
    await assert.rejects(readPrograms(actor, foreign, repeat[0].program.id), /NOT_FOUND/);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "PROGRAM_SAVE" } }), 1);
    await assert.rejects(saveProgram(actor, { ...input, config: { ...input.config, target: 9 } }), /IDEMPOTENCY_CONFLICT/);
    const independent = await Promise.all(Array.from({ length: 20 }, () => saveProgram(actor, { ...input, operationId: randomUUID() })));
    assert.equal(new Set(independent.map(row => row.program.id)).size, 20);
    const changes = await Promise.allSettled(Array.from({ length: 20 }, () => saveProgram(actor, { ...input, operationId: randomUUID(), programId: repeat[0].program.id, expectedRevision: 1 })));
    assert.equal(changes.filter(row => row.status === "fulfilled").length, 1);
    for (const result of changes) if (result.status === "rejected") assert.match(String(result.reason), /REVISION_CONFLICT/);
    assert.equal((await readPrograms(actor, org, repeat[0].program.id)).programs[0].revision, 2);
    const asset = await prisma.loyaltyAsset.create({ data: { organizationId: foreign, storageKey: `isolated-${randomUUID()}` } });
    await assert.rejects(saveProgram(actor, { ...input, operationId: randomUUID(), config: { ...input.config, logoAssetId: asset.id } }), /INVALID_INPUT/);
    await assert.rejects(prisma.loyaltyProgram.update({ where: { id: repeat[0].program.id }, data: { logoAssetId: asset.id } }));
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: actor } }, data: { role: "STAFF" } });
    await assert.rejects(saveProgram(actor, { ...input, operationId: randomUUID() }), /FORBIDDEN/);
    await assert.rejects(readPrograms(actor, org), /FORBIDDEN/);
  } finally {
    // Only IDs owned by this isolated test; never reset a database.
    await prisma.loyaltyProgram.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.loyaltyAsset.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.organizationAuditLog.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.loyaltyOperation.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.organizationMembership.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.organizationEntitlement.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org, foreign] } } });
    await prisma.user.deleteMany({ where: { id: actor } });
    await prisma.$disconnect();
  }
});
