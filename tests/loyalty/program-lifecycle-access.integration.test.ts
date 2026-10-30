import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { z } from "zod";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

let actorId: string | null = null;
// Only the authenticated request context is simulated; current DB rights are real.
mock.module("../../src/lib/session.ts", { namedExports: {
  getCurrentSession: async () => actorId ? { user: { id: actorId, role: "OWNER" } } : null,
} });

test("real DB: direct lifecycle action and POST reject foreign tenants, role claims and revoked rights", { timeout: 120_000 }, async () => {
  const env = databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.BETTER_AUTH_URL = "https://academy.example.invalid";
  const { prisma } = await import("../../src/lib/prisma");
  const { changeProgramLifecycleAction: action } = await import("../../src/lib/loyalty/program.actions");
  const { POST } = await import("../../src/app/api/loyalty/organizations/[organizationId]/programs/[id]/lifecycle/route");
  const owner = randomUUID(), admin = randomUUID(), staff = randomUUID(), internal = randomUUID();
  const org = randomUUID(), foreign = randomUUID();
  const users = [owner, admin, staff, internal];
  const organizations = [org, foreign];
  const config = { ...defaultProgram, name: "Isolated lifecycle access", reward: "Coffee" };
  const post = (programId: string, body: unknown, organizationId = org) => POST(new Request(`${process.env.BETTER_AUTH_URL}/api`, {
    method: "POST", headers: { origin: process.env.BETTER_AUTH_URL!, "content-type": "application/json", "accept-language": "en" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ organizationId, id: programId }) });
  try {
    for (const id of users) await prisma.user.create({ data: { id, name: "Lifecycle access fixture", email: `${id}@example.invalid`, role: id === internal ? "OWNER" : "CUSTOMER", emailVerified: true } });
    for (const id of organizations) await prisma.organization.create({ data: {
      id, slug: id, name: "Lifecycle access fixture", status: "ACTIVE", entitlement: { create: { plan: "FREE" } },
      memberships: { create: [{ userId: owner, role: "OWNER" }, ...(id === org ? [{ userId: admin, role: "ADMIN" as const }, { userId: staff, role: "STAFF" as const }] : [])] },
    } });
    const program = await prisma.loyaltyProgram.create({ data: { ...config, organizationId: org } });
    const other = await prisma.loyaltyProgram.create({ data: { ...config, organizationId: foreign } });
    const body = { action: "PUBLISH", operationId: randomUUID(), expectedRevision: 1 };
    const full = { ...body, organizationId: org, programId: program.id };
    const snapshot = async () => ({
      programs: await prisma.loyaltyProgram.findMany({ where: { organizationId: { in: organizations } }, orderBy: { id: "asc" } }),
      operations: await prisma.loyaltyOperation.count({ where: { organizationId: { in: organizations } } }),
      audits: await prisma.organizationAuditLog.count({ where: { organizationId: { in: organizations } } }),
    });
    const deny = async (input: typeof full, status: number, code: string) => {
      const before = await snapshot();
      for (const locale of ["de", "en"] as const) {
        const reply = await action(input, locale);
        assert.equal(reply.ok, false);
        if (!reply.ok) { assert.equal(reply.error.code, code); assert.ok(reply.error.message); }
      }
      const response = await post(input.programId, { action: input.action, expectedRevision: input.expectedRevision, operationId: input.operationId }, input.organizationId);
      assert.equal(response.status, status);
      assert.equal(z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string().min(1) }) }).parse(await response.json()).error.code, code);
      assert.deepEqual(await snapshot(), before);
    };
    actorId = null;
    await deny(full, 401, "UNAUTHENTICATED");
    for (const user of [staff, internal]) {
      actorId = user;
      for (const name of ["PUBLISH", "ARCHIVE", "REACTIVATE", "BLOCK", "UNBLOCK"]) await deny({ ...full, action: name }, 403, "FORBIDDEN");
    }
    actorId = admin;
    await deny({ ...full, organizationId: foreign }, 403, "FORBIDDEN");
    await deny({ ...full, programId: other.id }, 404, "NOT_FOUND");
    const success = await action(full, "de");
    assert.equal(success.ok, true);
    const replay = await post(program.id, body);
    assert.equal(replay.status, 200);
    assert.equal(z.object({ ok: z.literal(true), data: z.object({ replayed: z.literal(true) }) }).parse(await replay.json()).data.replayed, true);
    assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "PROGRAM_PUBLISH" } }), 1);
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: admin } }, data: { role: "STAFF" } });
    await deny(full, 403, "FORBIDDEN"); // Replay must reauthorize despite claimed session OWNER.
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: admin } }, data: { role: "ADMIN", status: "REVOKED" } });
    await deny(full, 403, "FORBIDDEN");
    actorId = owner;
    await prisma.organization.update({ where: { id: org }, data: { status: "SUSPENDED" } });
    await deny(full, 403, "FORBIDDEN");
  } finally {
    actorId = null;
    try {
      await prisma.$transaction(async tx => {
        const where = { organizationId: { in: organizations } };
        await tx.loyaltyProgram.deleteMany({ where });
        await tx.loyaltyOperation.deleteMany({ where });
        await tx.organizationAuditLog.deleteMany({ where });
        await tx.organizationMembership.deleteMany({ where });
        await tx.organizationEntitlement.deleteMany({ where });
        await tx.organization.deleteMany({ where: { id: { in: organizations } } });
        await tx.user.deleteMany({ where: { id: { in: users } } });
      }, { maxWait: 60_000, timeout: 30_000 });
    } finally { await prisma.$disconnect(); }
  }
});
