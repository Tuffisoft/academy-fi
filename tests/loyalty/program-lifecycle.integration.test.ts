import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";
import { loyaltyPlans } from "../../src/lib/loyalty/plans";

let profile: keyof typeof loyaltyPlans = "FREE";
// Effective capacities only: persisted FREE guard and real DB transactions remain active.
mock.module("../../src/lib/loyalty/plans.ts", { namedExports: {
  loyaltyPlans,
  freeEntitlement: (plan: string) => {
    if (plan !== "FREE") throw new Error("Unexpected persisted entitlement");
    return loyaltyPlans[profile];
  },
  isSupportedLoyaltyPlan: (plan: string) => plan === "FREE",
} });

test("real DB: program activation capacities, replay, binding and concurrent writes", { timeout: 240_000 }, async () => {
  const env = databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = env.DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { saveProgram, readPrograms, changeProgramLifecycle: change, bindProgramConditions, programTransactionOptions } = await import("../../src/lib/loyalty/programs");
  const actor = randomUUID(), org = randomUUID(), foreign = randomUUID();
  const config = { ...defaultProgram, name: "Isolated lifecycle", reward: "Coffee" };
  const saveInput = () => ({ organizationId: org, operationId: randomUUID(), config });
  const command = (programId: string, expectedRevision: number, action: string) => ({ organizationId: org, programId, expectedRevision, action, operationId: randomUUID() });
  try {
    await prisma.user.create({ data: { id: actor, name: "Lifecycle owner", email: `${actor}@example.invalid`, role: "CUSTOMER", emailVerified: true } });
    for (const id of [org, foreign]) await prisma.organization.create({ data: {
      id, slug: id, name: "Isolated lifecycle", status: "ACTIVE", entitlement: { create: { plan: "FREE" } },
      memberships: { create: { userId: actor, role: "OWNER" } },
    } });
    for (const plan of ["FREE", "PRO", "BUSINESS"] as const) {
      profile = plan;
      const limit = loyaltyPlans[plan].programs;
      const drafts = await Promise.all(Array.from({ length: (limit ?? 1) + 19 }, () => saveProgram(actor, saveInput())));
      if (limit !== null && limit > 1) {
        for (let i = 0; i < limit - 1; i++) await change(actor, command(drafts[i].program.id, 1, "PUBLISH"));
      }
      const offset = limit === null ? 0 : limit - 1;
      const candidates = drafts.slice(offset);
      const attempts = await Promise.allSettled(candidates.map(d => change(actor, command(d.program.id, 1, "PUBLISH"))));
      assert.equal(attempts.filter(r => r.status === "fulfilled").length, limit === null ? candidates.length : 1);
      for (const result of attempts) if (result.status === "rejected") assert.match(String(result.reason), /PROGRAM_LIMIT/);
      const active = await prisma.loyaltyProgram.findMany({ where: { organizationId: org, status: "PUBLISHED" } });
      assert.equal(active.length, limit ?? 20);
      const current = active[0];
      const block = command(current.id, current.revision, "BLOCK");
      const replays = await Promise.all(Array.from({ length: 20 }, () => change(actor, block)));
      assert.equal(replays.filter(r => !r.replayed).length, 1);
      assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, targetId: current.id, action: "PROGRAM_BLOCK" } }), 1);
      assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: current.id } })).revision, current.revision + 1);
      await change(actor, command(current.id, current.revision + 1, "ARCHIVE"));
      assert.equal((await change(actor, block)).program.status, "ARCHIVED");
      const reactivated = await change(actor, command(current.id, current.revision + 2, "REACTIVATE"));
      assert.ok(reactivated.program.blockedAt);
      await assert.rejects(prisma.$transaction(tx => bindProgramConditions(tx, org, current.id), programTransactionOptions), /STATE_CONFLICT/);
      const unblocked = await change(actor, command(current.id, reactivated.program.revision, "UNBLOCK"));
      const writes = await Promise.allSettled([
        prisma.$transaction(tx => bindProgramConditions(tx, org, current.id), programTransactionOptions),
        ...Array.from({ length: 20 }, () => saveProgram(actor, { ...saveInput(), programId: current.id, expectedRevision: unblocked.program.revision, config: { ...config, reward: "New reward" } })),
      ]);
      assert.equal(writes[0].status, "fulfilled");
      const bound = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: current.id } });
      assert.ok(bound.conditionsBoundAt);
      await assert.rejects(saveProgram(actor, { ...saveInput(), programId: current.id, expectedRevision: bound.revision, config: { ...config, reward: "Forbidden" } }), /CONDITIONS_BOUND/);
      const brand = await saveProgram(actor, { ...saveInput(), programId: current.id, expectedRevision: bound.revision, config: { ...config, reward: bound.reward, name: "Branding" } });
      assert.ok(brand.program.conditionsBoundAt);
      const foreignDraft = (await saveProgram(actor, { ...saveInput(), organizationId: foreign })).program;
      await assert.rejects(change(actor, command(foreignDraft.id, 1, "PUBLISH")), /NOT_FOUND/);
      const before = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: current.id } });
      await assert.rejects(prisma.$transaction(async tx => {
        await bindProgramConditions(tx, org, current.id);
        await tx.loyaltyProgram.update({ where: { id: current.id }, data: { reward: "Blocked by DB" } });
      }, programTransactionOptions));
      assert.deepEqual(await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: current.id } }), before);
      for (const row of await prisma.loyaltyProgram.findMany({ where: { organizationId: org, status: "PUBLISHED" } })) await change(actor, command(row.id, row.revision, "ARCHIVE"));
      assert.ok((await readPrograms(actor, org)).programs.some(p => p.status === "ARCHIVED"));
    }
    await assert.rejects(prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: actor } }, data: { status: "REVOKED" } }));
    await prisma.user.update({ where: { id: actor }, data: { banned: true } });
    await assert.rejects(readPrograms(actor, org), /FORBIDDEN/);
  } finally {
    try {
      await prisma.$transaction(async tx => {
        const where = { organizationId: { in: [org, foreign] } };
        await tx.loyaltyProgram.deleteMany({ where });
        await tx.loyaltyOperation.deleteMany({ where });
        await tx.organizationAuditLog.deleteMany({ where });
        await tx.organizationMembership.deleteMany({ where });
        await tx.organizationEntitlement.deleteMany({ where });
        await tx.organization.deleteMany({ where: { id: { in: [org, foreign] } } });
        await tx.user.deleteMany({ where: { id: actor } });
      }, programTransactionOptions);
    } finally { await prisma.$disconnect(); }
  }
});
