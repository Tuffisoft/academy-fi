import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { loyaltyPlans } from "../../src/lib/loyalty/plans";

// Paid profiles exist only in this isolated test module, never behind an application setting.
mock.module("../../src/lib/loyalty/plans.ts", { namedExports: { freeEntitlement: (plan: string) => {
  if (plan === "FREE" || plan === "PRO" || plan === "BUSINESS") return loyaltyPlans[plan];
  throw new Error("Unconfirmed loyalty entitlement");
} } });

test("membership transactions: reserved last slot, replay, acceptance, revocation, ownership and constraints", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { executeMembership } = await import("../../src/lib/loyalty/memberships");
  const { addStaffMembership } = await import("../../src/lib/loyalty/organizations");
  const org = randomUUID(), otherOrg = randomUUID();
  const users = Array.from({ length: 28 }, () => randomUUID());
  const owner = users[0], admin = users[1], recipient = users[4];
  const email = (index: number) => users[index] + "@example.invalid";
  const input = (action: string, fields: Record<string, unknown> = {}) => ({ organizationId: org, operationId: randomUUID(), action, ...fields });
  let fixtures = false;
  try {
    // Migration is a precondition. Tests never install, seed or modify its history.
    await prisma.organizationInvitation.count(); await prisma.organizationOperation.count();
    await prisma.$transaction(async tx => {
      await tx.user.createMany({ data: users.map((id, index) => ({ id, email: email(index), name: "Isolated membership fixture", role: "CUSTOMER", emailVerified: true })) });
      for (const organizationId of [org, otherOrg]) {
        await tx.organization.create({ data: { id: organizationId, name: "Membership test", slug: "test-" + organizationId, status: "ACTIVE", entitlement: { create: { plan: "PRO" } } } });
        await tx.organizationMembership.create({ data: { organizationId, userId: organizationId === org ? owner : users[27], role: "OWNER" } });
      }
      await tx.organizationMembership.createMany({ data: [1, 2, 3].map(index => ({ organizationId: org, userId: users[index], role: index === 1 ? "ADMIN" as const : "STAFF" as const })) });
    });
    fixtures = true;
    const command = input("INVITE", { email: email(4), role: "STAFF" });
    const repeated = await Promise.all(Array.from({ length: 20 }, () => executeMembership(owner, command)));
    assert.equal(new Set(repeated.map(result => result.resultId)).size, 1);
    assert.equal(repeated.filter(result => result.delivery).length, 1);
    const mail = repeated.find(result => result.delivery)?.delivery; assert.ok(mail);
    await assert.rejects(executeMembership(owner, { ...command, email: email(5) }), /CONFLICT/);
    await assert.rejects(executeMembership(admin, input("INVITE", { role: "ADMIN", email: email(5) })), /FORBIDDEN/);
    await assert.rejects(executeMembership(users[27], input("REMOVE_MEMBER", { userId: users[2] })), /FORBIDDEN/);
    await assert.rejects(addStaffMembership(owner, org, users[5], "Reserved last slot"), /LIMIT_REACHED/);
    await assert.rejects(executeMembership(users[5], input("ACCEPT", { token: mail.token })), /INVALID_INVITATION/);
    await prisma.user.update({ where: { id: recipient }, data: { emailVerified: false } });
    await assert.rejects(executeMembership(recipient, input("ACCEPT", { token: mail.token })), /INVALID_INVITATION/);
    await prisma.user.update({ where: { id: recipient }, data: { emailVerified: true } });
    const acceptance = input("ACCEPT", { token: mail.token });
    await Promise.all(Array.from({ length: 20 }, () => executeMembership(recipient, acceptance)));
    assert.equal(await prisma.organizationMembership.count({ where: { organizationId: org, status: "ACTIVE" } }), 5);
    await executeMembership(owner, input("REMOVE_MEMBER", { userId: recipient }));
    await assert.rejects(executeMembership(recipient, acceptance), /INVALID_INVITATION/);

    // Twenty different requests compete for one free slot, rather than sharing a request key.
    const competing = await Promise.allSettled(Array.from({ length: 20 }, (_, i) => executeMembership(owner, input("INVITE", { email: email(i + 5), role: "STAFF" }))));
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1);
    for (const result of competing) if (result.status === "rejected") assert.match(String(result.reason), /LIMIT_REACHED/);
    const winner = competing.find(result => result.status === "fulfilled"); assert.ok(winner?.status === "fulfilled");
    const pendingId = winner.value.resultId;
    const rotation = await executeMembership(owner, input("ROTATE_INVITATION", { invitationId: pendingId })); assert.ok(rotation.delivery);
    await executeMembership(admin, input("REVOKE_INVITATION", { invitationId: pendingId }));
    const winnerIndex = users.findIndex(userId => userId + "@example.invalid" === rotation.delivery?.to);
    assert.ok(winnerIndex >= 5);
    await assert.rejects(executeMembership(users[winnerIndex], input("ACCEPT", { token: rotation.delivery.token })), /INVALID_INVITATION/);

    // Exact expiry boundary is enforced with the database clock, independent of a sweeper.
    const expiring = await executeMembership(owner, input("INVITE", { email: email(25), role: "STAFF" })); assert.ok(expiring.delivery);
    await prisma.organizationInvitation.update({ where: { id: expiring.resultId }, data: { createdAt: new Date(Date.now() - 2 * 86_400_000), expiresAt: new Date(Date.now() - 86_400_000) } });
    await assert.rejects(executeMembership(users[25], input("ACCEPT", { token: expiring.delivery.token })), /INVALID_INVITATION/);
    const replacement = await executeMembership(owner, input("INVITE", { email: email(25), role: "STAFF" }));
    assert.notEqual(replacement.resultId, expiring.resultId);

    const transfer = input("TRANSFER_OWNER", { userId: admin });
    await Promise.all(Array.from({ length: 20 }, () => executeMembership(owner, transfer)));
    assert.equal(await prisma.organizationMembership.count({ where: { organizationId: org, role: "OWNER", status: "ACTIVE" } }), 1);
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: org, userId: owner } } })).role, "ADMIN");
    await executeMembership(admin, input("REMOVE_MEMBER", { userId: owner }));
    await assert.rejects(executeMembership(owner, transfer), /FORBIDDEN/);

    const accepted = await prisma.organizationInvitation.findUniqueOrThrow({ where: { id: mail.invitationId } });
    assert.equal(accepted.acceptedById, recipient);
    await assert.rejects(prisma.organizationInvitation.update({ where: { id: pendingId }, data: { role: "OWNER" } }));
    await assert.rejects(prisma.organizationMembership.updateMany({ where: { organizationId: org, role: "OWNER" }, data: { status: "REVOKED" } }));
    assert.equal(await prisma.organizationOperation.count({ where: { organizationId: org, action: "TRANSFER_OWNER" } }), 1);
    const revoked = await prisma.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: org, userId: recipient } } });
    assert.equal(revoked.status, "REVOKED");
  } finally {
    if (fixtures) await prisma.$transaction(async tx => {
      const where = { organizationId: { in: [org, otherOrg] } };
      await tx.organizationOperation.deleteMany({ where });
      await tx.organizationInvitation.deleteMany({ where });
      await tx.organizationAuditLog.deleteMany({ where });
      await tx.organizationEntitlement.deleteMany({ where });
      await tx.organizationMembership.deleteMany({ where });
      await tx.organization.deleteMany({ where: { id: { in: [org, otherOrg] } } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
    });
    await prisma.$disconnect();
  }
});
