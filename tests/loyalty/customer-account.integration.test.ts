import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import test from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";

test("real DB: customer registration, one-time tokens, recovery, atomic onboarding and persistent limits", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  process.env.STEMPELFI_REGISTRATION_ENABLED = "1";
  process.env.BETTER_AUTH_SECRET = "customer-integration-isolated-fixtures-secret";
  const { prisma } = await import("../../src/lib/prisma");
  const { handleCustomerAccount, createCustomerOrganization, consumeAccountLimit, getCustomerSetup } = await import("../../src/lib/loyalty/customer-account");
  const { verifyPassword } = await import("better-auth/crypto");
  const mails: Array<{ to: string; kind: "verify" | "reset"; token: string }> = [];
  const send = async (mail: { to: string; kind: "verify" | "reset"; token: string }) => { mails.push(mail); };
  const email = randomUUID() + "@example.invalid", oldId = randomUUID();
  const rateIds = new Set<string>();
  const digest = (s: string) => createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(s).digest("hex");
  function rate(action: string, key: string) {
    const window = Math.floor(Date.now() / 3_600_000);
    for (const time of [window - 1, window, window + 1]) rateIds.add("stempelfi:limit:" + digest(action + ":" + key + ":" + time));
  }
  async function invoke(input: Record<string, unknown>, sender = send) {
    const origin = randomUUID();
    const action = String(input.action);
    rate("origin:" + action, origin);
    rate(action, typeof input.email === "string" ? input.email : digest(String(input.token)));
    return handleCustomerAccount(input, sender, origin);
  }
  const input = { action: "register", email, name: "Synthetic customer", password: "Customer-Fixture!2026", locale: "de", operationId: randomUUID() };
  let userId: string | undefined;
  try {
    await assert.rejects(invoke({ ...input, role: "OWNER" }), /INVALID_INPUT/);
    await assert.rejects(invoke({ ...input, emailVerified: true }), /INVALID_INPUT/);
    await assert.rejects(invoke(input, async () => { throw new Error("Mail unavailable"); }), /Mail unavailable/);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } }); userId = user.id;
    assert.equal(user.role, "CUSTOMER"); assert.equal(user.emailVerified, false);
    assert.equal((await getCustomerSetup(user.id))?.verified, false);
    await assert.rejects(createCustomerOrganization(user.id, "Not verified", randomUUID()), /FORBIDDEN/);
    assert.deepEqual(await invoke(input), { status: "CHECK_EMAIL" });
    assert.equal(await prisma.user.count({ where: { email } }), 1);
    await assert.rejects(invoke({ ...input, name: "Changed payload" }), /CONFLICT/);
    const verification = mails.at(-1)!;
    const stored = await prisma.verification.findUniqueOrThrow({ where: { id: "stempelfi:token:" + digest(verification.token) } });
    assert.ok(!stored.value.includes(verification.token));
    await prisma.verification.update({ where: { id: stored.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(invoke({ action: "verify", token: verification.token, locale: "de" }), /INVALID_TOKEN/);
    await invoke({ action: "resend", email, locale: "en" });
    const fresh = mails.at(-1)!;
    await assert.rejects(invoke({ action: "reset", token: fresh.token, password: "Other-Fixture!2026", locale: "en" }), /INVALID_TOKEN/);
    assert.deepEqual(await invoke({ action: "verify", token: fresh.token, locale: "en" }), { status: "VERIFIED" });
    await assert.rejects(invoke({ action: "verify", token: fresh.token, locale: "en" }), /INVALID_TOKEN/);
    assert.equal((await getCustomerSetup(user.id))?.verified, true);
    const operation = randomUUID();
    const repeated = await Promise.all(Array.from({ length: 20 }, () => createCustomerOrganization(user.id, "Synthetic business", operation)));
    assert.equal(new Set(repeated.map(r => r.slug)).size, 1);
    const independent = await Promise.allSettled(Array.from({ length: 20 }, () => createCustomerOrganization(user.id, "Other business", randomUUID())));
    assert.ok(independent.every(r => r.status === "rejected" && /CONFLICT/.test(String(r.reason))));
    assert.equal(await prisma.organizationMembership.count({ where: { userId: user.id } }), 1);
    assert.equal(await prisma.organizationAuditLog.count({ where: { actorId: user.id, action: "CUSTOMER_ONBOARDED" } }), 1);
    assert.equal(await getCustomerSetup(user.id), null);
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    await assert.rejects(createCustomerOrganization(user.id, "Synthetic business", operation), /FORBIDDEN/);
    await prisma.user.update({ where: { id: user.id }, data: { banned: false, role: "CUSTOMER,OWNER" } });
    await assert.rejects(createCustomerOrganization(user.id, "Synthetic business", operation), /FORBIDDEN/);
    await prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } });
    await prisma.user.create({ data: { id: oldId, name: "Existing fixture", email: oldId + "@example.invalid", role: "INTERN", emailVerified: true } });
    await invoke({ ...input, email: oldId + "@example.invalid", operationId: randomUUID() });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: oldId } })).role, "INTERN");
    await prisma.user.update({ where: { id: oldId }, data: { role: "CUSTOMER" } });
    await assert.rejects(createCustomerOrganization(oldId, "No automatic adoption", randomUUID()), /FORBIDDEN/);
    const sessionId = randomUUID();
    await prisma.session.create({ data: { id: sessionId, token: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + 60_000) } });
    await invoke({ action: "requestReset", email, locale: "en" });
    const reset = mails.at(-1)!;
    await invoke({ action: "reset", token: reset.token, password: "Changed-Fixture!2026", locale: "en" });
    await assert.rejects(invoke({ action: "reset", token: reset.token, password: "Changed-Fixture!2026", locale: "en" }), /INVALID_TOKEN/);
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
    const credential = await prisma.account.findFirstOrThrow({ where: { userId: user.id, providerId: "credential" } });
    assert.equal(await verifyPassword({ password: "Changed-Fixture!2026", hash: credential.password! }), true);
    const key = randomUUID(); rate("parallel-test", key);
    const limited = await Promise.allSettled(Array.from({ length: 20 }, () => consumeAccountLimit("parallel-test", key, 5)));
    assert.equal(limited.filter(r => r.status === "fulfilled").length, 5);
    assert.equal(limited.filter(r => r.status === "rejected").length, 15);
  } finally {
    await prisma.$transaction(async tx => {
      const memberships = userId ? await tx.organizationMembership.findMany({ where: { userId }, select: { organizationId: true } }) : [];
      const ids = memberships.map(m => m.organizationId);
      await tx.organizationAuditLog.deleteMany({ where: { organizationId: { in: ids } } });
      await tx.organizationEntitlement.deleteMany({ where: { organizationId: { in: ids } } });
      await tx.organizationMembership.deleteMany({ where: { organizationId: { in: ids } } });
      await tx.organization.deleteMany({ where: { id: { in: ids } } });
      if (userId) await tx.verification.deleteMany({ where: { OR: [{ identifier: { endsWith: ":" + userId } }, { id: "stempelfi:customer:" + userId }] } });
      await tx.verification.deleteMany({ where: { id: { in: [...rateIds] } } });
      await tx.user.deleteMany({ where: { id: { in: [oldId, ...(userId ? [userId] : [])] } } });
    });
    await prisma.$disconnect();
  }
});
