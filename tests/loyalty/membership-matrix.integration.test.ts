import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mock, test } from "node:test";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { loyaltyPlans } from "../../src/lib/loyalty/plans";
import { isMembershipReply } from "../../src/lib/loyalty/membership-reply";

let profile: keyof typeof loyaltyPlans = "FREE";
let sessionActor: string | null = null;
// Only request-context I/O and the effective capacity are simulated. All domain
// services, Prisma transactions and database constraints remain real.
mock.module("../../src/lib/loyalty/plans.ts", {
  namedExports: {
    freeEntitlement: (plan: string) => {
      if (plan !== "FREE") throw new Error("Unexpected persisted entitlement");
      return loyaltyPlans[profile];
    },
  },
});
mock.module("../../src/lib/session.ts", {
  namedExports: {
    getCurrentSession: async () =>
      sessionActor ? { user: { id: sessionActor, role: "OWNER" } } : null,
  },
});

test(
  "real DB: three plan capacities, competing rights/ownership and late mail completion",
  { timeout: 420_000 },
  async (t) => {
    databaseIntegrationEnvironment(
      { ...process.env, DATABASE_URL: "" },
      undefined,
      "LOYALTY_TEST_DATABASE_URL",
    );
    process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
    process.env.STEMPELFI_MEMBERS_ENABLED = "1";
    const { prisma } = await import("../../src/lib/prisma");
    const { executeMembership } =
      await import("../../src/lib/loyalty/memberships");
    const { membershipAction } =
      await import("../../src/lib/loyalty/membership.actions");
    const { POST } =
      await import("../../src/app/api/loyalty/organizations/[organizationId]/memberships/route");
    const { runMembershipWorkflow } =
      await import("../../src/lib/loyalty/membership-workflow");
    const { getMembershipOverview } =
      await import("../../src/lib/loyalty/membership-view");
    try {
      for (const plan of ["FREE", "PRO", "BUSINESS"] as const)
        await t.test(plan, { timeout: 160_000 }, async () => {
          profile = plan;
          const org = randomUUID(),
            users = Array.from({ length: 46 }, () => randomUUID()),
            owner = users[0];
          const limit = loyaltyPlans[plan].users,
            initialCount = Math.max(1, limit - 1);
          const email = (i: number) => users[i] + "@example.invalid";
          const command = (
            action: string,
            fields: Record<string, unknown> = {},
          ) => ({
            action,
            organizationId: org,
            operationId: randomUUID(),
            ...fields,
          });
          const invitation = (i: number) =>
            command("INVITE", { email: email(i), role: "STAFF" });
          const rowCount = () =>
            prisma.organizationMembership.count({
              where: { organizationId: org, status: "ACTIVE" },
            });
          let created = false;
          try {
            await prisma.$transaction(async (tx) => {
              await tx.user.createMany({
                data: users.map((id, i) => ({
                  id,
                  name: "Isolated matrix fixture",
                  email: email(i),
                  role: "CUSTOMER",
                  emailVerified: true,
                })),
              });
              await tx.organization.create({
                data: {
                  id: org,
                  name: "Matrix fixture",
                  slug: "matrix-" + org,
                  status: "ACTIVE",
                  entitlement: { create: { plan: "FREE" } },
                },
              });
              await tx.organizationMembership.createMany({
                data: users
                  .slice(0, initialCount)
                  .map((userId, i) => ({
                    organizationId: org,
                    userId,
                    role: i === 0 ? ("OWNER" as const) : ("STAFF" as const),
                  })),
              });
            });
            created = true;
            const repeatedInput = invitation(20);
            if (plan === "FREE") {
              for (const inputs of [
                Array.from({ length: 20 }, () => repeatedInput),
                Array.from({ length: 20 }, (_, i) => invitation(i + 20)),
              ]) {
                const results = await Promise.allSettled(
                  inputs.map((input) => executeMembership(owner, input)),
                );
                assert.equal(
                  results.filter((row) => row.status === "fulfilled").length,
                  0,
                );
                for (const result of results)
                  if (result.status === "rejected")
                    assert.match(String(result.reason), /LIMIT_REACHED/);
              }
              assert.equal(await rowCount(), 1);
              assert.equal(
                await prisma.organizationInvitation.count({
                  where: { organizationId: org },
                }),
                0,
              );
              return;
            }
            const repeats = await Promise.all(
              Array.from({ length: 20 }, () =>
                executeMembership(owner, repeatedInput),
              ),
            );
            assert.equal(new Set(repeats.map((row) => row.resultId)).size, 1);
            assert.equal(repeats.filter((row) => row.delivery).length, 1);
            await assert.rejects(
              executeMembership(owner, { ...repeatedInput, role: "ADMIN" }),
              /CONFLICT/,
            );
            await executeMembership(
              owner,
              command("REVOKE_INVITATION", {
                invitationId: repeats[0].resultId,
              }),
            );
            const independent = await Promise.allSettled(
              Array.from({ length: 20 }, (_, i) =>
                executeMembership(owner, invitation(i + 20)),
              ),
            );
            assert.equal(
              independent.filter((row) => row.status === "fulfilled").length,
              1,
            );
            for (const result of independent)
              if (result.status === "rejected")
                assert.match(String(result.reason), /LIMIT_REACHED/);
            const won = independent.find((row) => row.status === "fulfilled");
            assert.ok(won?.status === "fulfilled" && won.value.delivery);
            const mail = won.value.delivery;
            const recipient = users.find(
              (userId) => userId + "@example.invalid" === mail.to,
            );
            assert.ok(recipient);
            assert.equal((await getMembershipOverview(owner, org)).reserved, 1);
            if (plan === "BUSINESS") {
              await prisma.organizationInvitation.createMany({
                data: Array.from({ length: 55 }, () => ({
                  organizationId: org,
                  email: randomUUID() + "@example.invalid",
                  role: "STAFF" as const,
                  tokenHash: createHash("sha256")
                    .update(randomUUID())
                    .digest("hex"),
                  status: "REVOKED",
                  createdById: owner,
                  deliveryAttemptId: randomUUID(),
                  expiresAt: new Date(Date.now() + 86_400_000),
                })),
              });
              const complete = await getMembershipOverview(owner, org);
              assert.equal(complete.reserved, 1);
              assert.equal(complete.invitations.length, 51);
              assert.ok(
                complete.invitations.some(
                  (row) => row.id === mail.invitationId,
                ),
              );
            }
            const race = await Promise.allSettled([
              executeMembership(
                recipient,
                command("ACCEPT", { token: mail.token }),
              ),
              executeMembership(
                owner,
                command("REVOKE_INVITATION", {
                  invitationId: mail.invitationId,
                }),
              ),
            ]);
            assert.equal(
              race.filter((row) => row.status === "fulfilled").length,
              1,
            );
            for (const result of race)
              if (result.status === "rejected")
                assert.match(String(result.reason), /INVALID_INVITATION/);
            const raced = await prisma.organizationInvitation.findUniqueOrThrow(
              { where: { id: mail.invitationId } },
            );
            assert.ok(
              raced.status === "ACCEPTED" || raced.status === "REVOKED",
            );
            assert.equal(
              await rowCount(),
              raced.status === "ACCEPTED" ? limit : limit - 1,
            );
            if (raced.status === "ACCEPTED")
              await executeMembership(
                owner,
                command("REMOVE_MEMBER", { userId: recipient }),
              );

            // A forged OWNER session claim cannot turn a real STAFF account into a manager.
            sessionActor = users[1];
            const deniedCommand = invitation(42);
            const denied = await membershipAction({
              locale: "de",
              command: deniedCommand,
            });
            assert.ok(!denied.ok);
            assert.equal(denied.error.code, "FORBIDDEN");
            const response = await POST(
              new Request("http://localhost:3000/api", {
                method: "POST",
                headers: {
                  origin: new URL(process.env.BETTER_AUTH_URL!).origin,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ locale: "en", command: deniedCommand }),
              }),
              { params: Promise.resolve({ organizationId: org }) },
            );
            assert.equal(response.status, 403);
            assert.equal(
              await prisma.organizationOperation.count({
                where: { organizationId: org, actorId: users[1] },
              }),
              0,
            );
            await executeMembership(
              owner,
              command("CHANGE_ROLE", { userId: users[1], role: "ADMIN" }),
            );
            const requestBeforeRevocation = invitation(42);
            const competingRights = await Promise.allSettled([
              ...Array.from({ length: 20 }, (_, i) =>
                executeMembership(users[1], invitation(i + 20)),
              ),
              executeMembership(
                owner,
                command("CHANGE_ROLE", { userId: users[1], role: "STAFF" }),
              ),
            ]);
            assert.equal(competingRights[20].status, "fulfilled");
            assert.ok(
              competingRights
                .slice(0, 20)
                .filter((row) => row.status === "fulfilled").length <= 1,
            );
            for (const result of competingRights.slice(0, 20))
              if (result.status === "rejected")
                assert.match(String(result.reason), /FORBIDDEN|LIMIT_REACHED/);
            for (const pending of await prisma.organizationInvitation.findMany({
              where: {
                organizationId: org,
                status: "PENDING",
                createdById: users[1],
              },
            }))
              await executeMembership(
                owner,
                command("REVOKE_INVITATION", { invitationId: pending.id }),
              );
            const afterDemotion = await membershipAction({
              locale: "de",
              command: requestBeforeRevocation,
            });
            assert.ok(!afterDemotion.ok);
            assert.equal(afterDemotion.error.code, "FORBIDDEN");
            await executeMembership(
              owner,
              command("CHANGE_ROLE", { userId: users[3], role: "ADMIN" }),
            );
            assert.equal(
              (await getMembershipOverview(users[3], org)).role,
              "ADMIN",
            );
            const preparedBeforeRemoval = invitation(42);
            await executeMembership(
              owner,
              command("REMOVE_MEMBER", { userId: users[3] }),
            );
            sessionActor = users[3]; // The old session still claims OWNER after access was removed.
            const removed = await membershipAction({
              locale: "de",
              command: preparedBeforeRemoval,
            });
            assert.ok(!removed.ok);
            assert.equal(removed.error.code, "FORBIDDEN");
            const removedApi = await POST(
              new Request("http://localhost:3000/api", {
                method: "POST",
                headers: {
                  origin: new URL(process.env.BETTER_AUTH_URL!).origin,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  locale: "en",
                  command: preparedBeforeRemoval,
                }),
              }),
              { params: Promise.resolve({ organizationId: org }) },
            );
            assert.equal(removedApi.status, 403);
            await prisma.user.update({
              where: { id: owner },
              data: { banned: true },
            });
            sessionActor = owner;
            const banned = await membershipAction({
              locale: "en",
              command: invitation(42),
            });
            assert.ok(!banned.ok);
            assert.equal(banned.error.code, "FORBIDDEN");
            await prisma.user.update({
              where: { id: owner },
              data: { banned: false },
            });

            // Provider I/O is deliberately suspended while a new invitation token wins.
            const sendIntent = invitation(43);
            process.env.RESEND_KEY =
              "synthetic-key-never-used-by-the-injected-sender";
            process.env.RESEND_FROM_EMAIL = "test@example.invalid";
            let release: (value: string) => void = () => {
              throw Error("Sender not started");
            };
            let started: () => void = () => {
              throw Error("Missing sender signal");
            };
            const pendingProvider = new Promise<string>((resolve) => {
              release = resolve;
            });
            const providerStarted = new Promise<void>((resolve) => {
              started = resolve;
            });
            let oldToken: string | undefined;
            const sending = runMembershipWorkflow(
              owner,
              sendIntent,
              "en",
              async (mail) => {
                oldToken = mail.token;
                started();
                return pendingProvider;
              },
            );
            try {
              await Promise.race([
                providerStarted,
                sending.then(() => {
                  throw Error("Workflow ended before sender started");
                }),
              ]);
              const pending =
                await prisma.organizationInvitation.findFirstOrThrow({
                  where: {
                    organizationId: org,
                    email: email(43),
                    status: "PENDING",
                  },
                });
              assert.equal(pending.deliveryStatus, "UNKNOWN");
              let replaySends = 0;
              const replay = await runMembershipWorkflow(
                owner,
                sendIntent,
                "en",
                async () => {
                  replaySends++;
                  return "unexpected";
                },
              );
              assert.ok(replay.ok);
              assert.equal(replay.data.deliveryStatus, "UNKNOWN");
              assert.equal(replaySends, 0);
              const rotated = await executeMembership(
                owner,
                command("ROTATE_INVITATION", { invitationId: pending.id }),
              );
              assert.ok(rotated.delivery);
              release("old-provider-reference");
              const sent = await sending;
              assert.ok(sent.ok);
              assert.equal(sent.data.deliveryStatus, "UNKNOWN");
              const fresh =
                await prisma.organizationInvitation.findUniqueOrThrow({
                  where: { id: pending.id },
                });
              assert.equal(fresh.deliveryStatus, "NOT_SENT");
              assert.equal(fresh.providerId, null);
              assert.equal(fresh.deliveryAttemptId, rotated.delivery.attemptId);
              assert.equal(
                fresh.expiresAt.getTime(),
                pending.expiresAt.getTime(),
              );
              assert.ok(oldToken);
              await assert.rejects(
                executeMembership(
                  users[43],
                  command("ACCEPT", { token: oldToken }),
                ),
                /INVALID_INVITATION/,
              );
              await executeMembership(
                owner,
                command("REVOKE_INVITATION", { invitationId: pending.id }),
              );
            } finally {
              release("cleanup-provider-reference");
              await sending;
              delete process.env.RESEND_KEY;
              delete process.env.RESEND_FROM_EMAIL;
            }

            // Two independently identified transfers from the same owner cannot both win.
            const transfers = await Promise.allSettled([
              executeMembership(
                owner,
                command("TRANSFER_OWNER", { userId: users[1] }),
              ),
              executeMembership(
                owner,
                command("TRANSFER_OWNER", { userId: users[2] }),
              ),
            ]);
            assert.equal(
              transfers.filter((row) => row.status === "fulfilled").length,
              1,
            );
            for (const result of transfers)
              if (result.status === "rejected")
                assert.match(String(result.reason), /FORBIDDEN/);
            assert.equal(
              await prisma.organizationMembership.count({
                where: { organizationId: org, role: "OWNER", status: "ACTIVE" },
              }),
              1,
            );
            assert.equal(
              (
                await prisma.organizationEntitlement.findUniqueOrThrow({
                  where: { organizationId: org },
                })
              ).plan,
              "FREE",
            );
          } finally {
            sessionActor = null;
            if (created)
              await prisma.$transaction(async (tx) => {
                const where = { organizationId: org };
                await tx.organizationOperation.deleteMany({ where });
                await tx.organizationInvitation.deleteMany({ where });
                await tx.organizationAuditLog.deleteMany({ where });
                await tx.organizationEntitlement.deleteMany({ where });
                await tx.organizationMembership.deleteMany({ where });
                await tx.organization.delete({ where: { id: org } });
                await tx.user.deleteMany({ where: { id: { in: users } } });
              });
          }
        });
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  "real DB: discarded mutation responses replay once, changed payloads conflict and revoked sessions cannot replay",
  { timeout: 180_000 },
  async () => {
    databaseIntegrationEnvironment(
      { ...process.env, DATABASE_URL: "" },
      undefined,
      "LOYALTY_TEST_DATABASE_URL",
    );
    process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
    process.env.STEMPELFI_MEMBERS_ENABLED = "1";
    profile = "PRO";
    const { prisma } = await import("../../src/lib/prisma");
    const { membershipAction } = await import("../../src/lib/loyalty/membership.actions");
    const { POST } = await import("../../src/app/api/loyalty/organizations/[organizationId]/memberships/route");
    const org = randomUUID(), otherOrg = randomUUID();
    const users = Array.from({ length: 4 }, () => randomUUID());
    const [owner, successor, staff, foreignOwner] = users;
    const command = (action: string, fields: Record<string, string>) => ({
      action, organizationId: org, operationId: randomUUID(), ...fields,
    });
    const post = (intent: Record<string, string>, confirmOwnership = false, locale: "de" | "en" = "de") => POST(
      new Request("http://localhost:3000/api", {
        method: "POST",
        headers: { origin: new URL(process.env.BETTER_AUTH_URL!).origin, "Content-Type": "application/json" },
        body: JSON.stringify({ locale, command: intent, confirmOwnership }),
      }),
      { params: Promise.resolve({ organizationId: org }) },
    );
    const read = async (response: Response) => {
      const body: unknown = await response.json();
      assert.ok(isMembershipReply(body));
      return body;
    };
    const state = async () => ({
      members: await prisma.organizationMembership.findMany({
        where: { organizationId: org }, orderBy: { userId: "asc" },
        select: { userId: true, role: true, status: true, updatedAt: true },
      }),
      operations: await prisma.organizationOperation.count({ where: { organizationId: org } }),
      audits: await prisma.organizationAuditLog.count({ where: { organizationId: org } }),
      invitations: await prisma.organizationInvitation.count({ where: { organizationId: org } }),
    });
    const deniedWithoutWrites = async (intent: Record<string, string>, code: "FORBIDDEN" | "CONFLICT") => {
      const before = await state();
      for (const locale of ["de", "en"] as const) {
        const response = await post(intent, true, locale);
        assert.equal(response.status, code === "CONFLICT" ? 409 : 403);
        const body = await read(response);
        assert.ok(!body.ok);
        assert.equal(body.error.code, code);
        const action = await membershipAction({ locale, command: intent, confirmOwnership: true });
        assert.ok(!action.ok);
        assert.equal(action.error.code, code);
      }
      assert.deepEqual(await state(), before);
    };
    let created = false;
    try {
      await prisma.$transaction(async tx => {
        await tx.user.createMany({ data: users.map(id => ({
          id, name: "Isolated response-loss fixture", email: id + "@example.invalid", role: "CUSTOMER", emailVerified: true,
        })) });
        for (const [id, userId] of [[org, owner], [otherOrg, foreignOwner]]) {
          await tx.organization.create({ data: {
            id, slug: "retry-" + id, name: "Isolated response-loss fixture", status: "ACTIVE",
            entitlement: { create: { plan: "FREE" } },
          } });
          await tx.organizationMembership.create({ data: { organizationId: id, userId, role: "OWNER" } });
        }
        await tx.organizationMembership.createMany({ data: [
          { organizationId: org, userId: successor, role: "ADMIN" },
          { organizationId: org, userId: staff, role: "STAFF" },
        ] });
      });
      created = true;
      const roleIntent = command("CHANGE_ROLE", { userId: staff, role: "ADMIN" });
      const transferIntent = command("TRANSFER_OWNER", { userId: successor });
      const removalIntent = command("REMOVE_MEMBER", { userId: staff });

      sessionActor = foreignOwner; // Session mock deliberately claims global OWNER.
      await deniedWithoutWrites(roleIntent, "FORBIDDEN");
      sessionActor = owner;
      const beforeConfirmation = await state();
      const unconfirmed = await post(transferIntent);
      assert.equal(unconfirmed.status, 422);
      const invalid = await read(unconfirmed);
      assert.ok(!invalid.ok);
      assert.equal(invalid.error.code, "INVALID_INPUT");
      assert.deepEqual(await state(), beforeConfirmation);

      for (const intent of [roleIntent, transferIntent, removalIntent]) {
        sessionActor = intent.action === "REMOVE_MEMBER" ? successor : owner;
        const before = await state();
        // Real handler and transaction commit; only consumption of the returned
        // response body is dropped. This is not a real browser network outage.
        const lostResponse = await post(intent, true);
        assert.equal(lostResponse.status, 200);
        await lostResponse.body?.cancel();
        const committed = await state();
        assert.equal(committed.operations, before.operations + 1);
        assert.equal(committed.audits, before.audits + 1);
        if (intent.action === "CHANGE_ROLE")
          assert.equal(committed.members.find(row => row.userId === staff)?.role, "ADMIN");
        if (intent.action === "TRANSFER_OWNER") {
          assert.equal(committed.members.find(row => row.userId === successor)?.role, "OWNER");
          assert.equal(committed.members.find(row => row.userId === owner)?.role, "ADMIN");
        }
        if (intent.action === "REMOVE_MEMBER")
          assert.equal(committed.members.find(row => row.userId === staff)?.status, "REVOKED");
        const retried = await Promise.all(Array.from({ length: 20 }, async (_, i) => {
          const response = await post(intent, true, i % 2 ? "de" : "en");
          assert.equal(response.status, 200);
          const body = await read(response);
          assert.ok(body.ok);
          assert.equal(body.data.replayed, true);
          return body.data.resultId;
        }));
        assert.equal(new Set(retried).size, 1);
        assert.equal(await prisma.organizationOperation.count({ where: {
          organizationId: org, actorId: sessionActor, operationId: intent.operationId,
        } }), 1);
        assert.deepEqual(await state(), committed);
        await deniedWithoutWrites({ ...intent, userId: foreignOwner }, "CONFLICT");
      }

      sessionActor = owner; // Former owner is now ADMIN, even in the stale OWNER session.
      await deniedWithoutWrites(command("TRANSFER_OWNER", { userId: owner }), "FORBIDDEN");
      sessionActor = successor;
      assert.equal((await post(command("REMOVE_MEMBER", { userId: owner }))).status, 200);
      sessionActor = owner;
      await deniedWithoutWrites(transferIntent, "FORBIDDEN");
      sessionActor = staff;
      await deniedWithoutWrites(roleIntent, "FORBIDDEN");
      assert.equal(await prisma.organizationMembership.count({
        where: { organizationId: org, role: "OWNER", status: "ACTIVE" },
      }), 1);
      assert.equal((await prisma.organizationEntitlement.findUniqueOrThrow({
        where: { organizationId: org },
      })).plan, "FREE");
    } finally {
      sessionActor = null;
      if (created) await prisma.$transaction(async tx => {
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
  },
);
