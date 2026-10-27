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
  const actor = randomUUID(), secondActor = randomUUID(), org = randomUUID(), foreign = randomUUID();
  try {
    await prisma.user.create({ data: { id: actor, name: "Isolated draft test", email: `${actor}@example.invalid`, role: "CUSTOMER", emailVerified: true } });
    await prisma.user.create({ data: { id: secondActor, name: "Isolated draft admin", email: `${secondActor}@example.invalid`, role: "CUSTOMER", emailVerified: true } });
    for (const id of [org, foreign]) await prisma.organization.create({ data: { id, slug: id, name: "Isolated draft test", status: "ACTIVE", entitlement: { create: { plan: "FREE" } }, memberships: { create: { userId: actor, role: "OWNER" } } } });
    const input = { organizationId: org, operationId: randomUUID(), config: { ...defaultProgram, name: "Coffee", reward: "Coffee" } };
    await prisma.organizationMembership.create({ data: { organizationId: org, userId: secondActor, role: "ADMIN" } });
    const repeat = await Promise.all(Array.from({ length: 20 }, () => saveProgram(actor, input)));
    assert.equal(new Set(repeat.map(row => row.program.id)).size, 1);
    await assert.rejects(readPrograms(actor, foreign, repeat[0].program.id), /NOT_FOUND/);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "PROGRAM_SAVE" } }), 1);
    await assert.rejects(saveProgram(actor, { ...input, config: { ...input.config, target: 9 } }), /IDEMPOTENCY_CONFLICT/);
    await assert.rejects(saveProgram(secondActor, input), /IDEMPOTENCY_CONFLICT/);
    const independent = await Promise.all(Array.from({ length: 20 }, () => saveProgram(actor, { ...input, operationId: randomUUID() })));
    assert.equal(new Set(independent.map(row => row.program.id)).size, 20);
    const changes = await Promise.allSettled(Array.from({ length: 20 }, () => saveProgram(actor, { ...input, operationId: randomUUID(), programId: repeat[0].program.id, expectedRevision: 1 })));
    assert.equal(changes.filter(row => row.status === "fulfilled").length, 1);
    for (const result of changes) if (result.status === "rejected") assert.match(String(result.reason), /REVISION_CONFLICT/);
    assert.equal((await readPrograms(actor, org, repeat[0].program.id)).programs[0].revision, 2);
    assert.equal((await readPrograms(secondActor, org, repeat[0].program.id)).programs[0].revision, 2);
    const rollbackId = randomUUID(), rollbackOperation = randomUUID();
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.loyaltyProgram.create({ data: { ...input.config, id: rollbackId, organizationId: org } });
      await tx.loyaltyOperation.create({ data: { organizationId: org, actorId: actor, operationId: rollbackOperation, action: "PROGRAM_SAVE", fingerprint: "0".repeat(64), resultId: rollbackId } });
      // Real FK failure must roll back both preceding writes, not leave a false saved result.
      await tx.organizationAuditLog.create({ data: { organizationId: org, actorId: `absent-${randomUUID()}`, action: "PROGRAM_SAVE", targetId: rollbackId, reason: "Isolated rollback test" } });
    }));
    assert.equal(await prisma.loyaltyProgram.count({ where: { id: rollbackId } }), 0);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, operationId: rollbackOperation } }), 0);
    await prisma.loyaltyProgram.createMany({ data: Array.from({ length: 31 }, () => ({ ...input.config, organizationId: org })) });
    const firstPage = await readPrograms(actor, org);
    assert.equal(firstPage.programs.length, 50); assert.ok(firstPage.next);
    const nextPage = await readPrograms(actor, org, undefined, firstPage.next);
    assert.equal(nextPage.programs.length, 2); assert.equal(nextPage.next, null);
    assert.equal(new Set([...firstPage.programs, ...nextPage.programs].map(row => row.id)).size, 52);
    const asset = await prisma.loyaltyAsset.create({ data: { organizationId: foreign, storageKey: `isolated-${randomUUID()}` } });
    await assert.rejects(saveProgram(actor, { ...input, operationId: randomUUID(), config: { ...input.config, logoAssetId: asset.id } }), /INVALID_INPUT/);
    await assert.rejects(prisma.loyaltyProgram.update({ where: { id: repeat[0].program.id }, data: { logoAssetId: asset.id } }));
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: secondActor } }, data: { status: "REVOKED" } });
    await assert.rejects(readPrograms(secondActor, org), /FORBIDDEN/);
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: secondActor } }, data: { status: "ACTIVE" } });
    await prisma.$transaction(async tx => {
      await tx.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: actor } }, data: { role: "STAFF" } });
      await tx.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: secondActor } }, data: { role: "OWNER" } });
    });
    await assert.rejects(saveProgram(actor, { ...input, operationId: randomUUID() }), /FORBIDDEN/);
    await assert.rejects(readPrograms(actor, org), /FORBIDDEN/);
    await assert.rejects(saveProgram(actor, input), /FORBIDDEN/);
  } finally {
    // Only IDs owned by this isolated test; never reset a database.
    try {
      await prisma.$transaction(async tx => {
        await tx.loyaltyProgram.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.loyaltyAsset.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationAuditLog.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.loyaltyOperation.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationMembership.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationEntitlement.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organization.deleteMany({ where: { id: { in: [org, foreign] } } });
        await tx.user.deleteMany({ where: { id: { in: [actor, secondActor] } } });
      }, { maxWait: 60_000, timeout: 30_000 });
    } finally { await prisma.$disconnect(); }
  }
});
