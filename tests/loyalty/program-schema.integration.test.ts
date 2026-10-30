import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

// Requires the explicitly authorized lifecycle migration on a disposable test DB.
// This test never applies migrations or enables paid entitlements.
test("real DB: program lifecycle columns and permanent condition binding", async () => {
  const env = databaseIntegrationEnvironment(
    { ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL",
  );
  process.env.DATABASE_URL = env.DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const organizationId = randomUUID();
  const actorId = randomUUID();
  try {
    await prisma.user.create({ data: {
      id: actorId, name: "Isolated program schema owner",
      email: `${actorId}@example.invalid`, role: "CUSTOMER", emailVerified: true,
    } });
    await prisma.organization.create({
      data: { id: organizationId, slug: organizationId, name: "Isolated program schema test",
        memberships: { create: { userId: actorId, role: "OWNER" } } },
    });
    const program = await prisma.loyaltyProgram.create({
      data: { ...defaultProgram, name: "Schema test", reward: "Coffee", organizationId },
    });
    assert.equal(program.status, "DRAFT");
    assert.equal(program.blockedAt, null);
    assert.equal(program.conditionsBoundAt, null);
    await assert.rejects(prisma.loyaltyProgram.update({
      where: { id: program.id }, data: { status: "UNKNOWN" },
    }));
    const boundAt = new Date("2026-10-30T12:00:00.000Z");
    await prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: { status: "PUBLISHED", blockedAt: boundAt, conditionsBoundAt: boundAt },
    });
    // Each rejected write is its own transaction; no aborted transaction reuse.
    for (const data of [
      { target: program.target + 1 }, { reward: "Different reward" },
      { conditionsBoundAt: null },
      { conditionsBoundAt: new Date(boundAt.getTime() + 1_000) },
    ]) {
      await assert.rejects(prisma.loyaltyProgram.update({ where: { id: program.id }, data }));
    }
    // Lifecycle and branding edits must not remove or invalidate the binding.
    await prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: { status: "ARCHIVED", name: "New branding", blockedAt: null,
        target: program.target, reward: program.reward, conditionsBoundAt: boundAt },
    });
    const current = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: program.id } });
    assert.equal(current.target, program.target);
    assert.equal(current.reward, program.reward);
    assert.equal(current.conditionsBoundAt?.getTime(), boundAt.getTime());
    assert.equal(current.status, "ARCHIVED");
    assert.equal(current.name, "New branding");
    assert.equal(current.blockedAt, null);
    await assert.rejects(prisma.$transaction(async (tx) => {
      await tx.loyaltyProgram.update({ where: { id: program.id }, data: { name: "Must roll back" } });
      await tx.loyaltyProgram.update({ where: { id: program.id }, data: { reward: "Forbidden" } });
    }));
    assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id: program.id } })).name, "New branding");
  } finally {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.loyaltyProgram.deleteMany({ where: { organizationId } });
        await tx.organizationMembership.deleteMany({ where: { organizationId } });
        await tx.organization.deleteMany({ where: { id: organizationId } });
        await tx.user.deleteMany({ where: { id: actorId } });
      });
    } finally { await prisma.$disconnect(); }
  }
});
