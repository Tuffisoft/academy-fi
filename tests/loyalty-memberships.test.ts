import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, mock, test } from "node:test";
import { loyaltyPlans } from "../src/lib/loyalty/plans";

// Behavioral service tests with real guards; this store proves no database constraints or concurrency.
type Row = Record<string, unknown>;
type Query = { where?: Row; data?: Row };
const tables: Record<string, Row[]> = {};
const now = new Date("2026-10-26T12:00:00Z");
let failAudit = false, failConflict = false;
let writes: string[] = [];
function record(value: unknown): Row | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Row : null; }
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "organizationId_userId" || key === "organizationId_actorId_operationId") return matches(row, record(value) ?? {});
    if (key === "user") return matches(tables.user.find(user => user.id === row.userId) ?? {}, record(value) ?? {});
    const condition = record(value);
    const actual = row[key];
    if (!condition) return actual === value;
    if ("equals" in condition) return String(actual).toLowerCase() === String(condition.equals).toLowerCase();
    if ("in" in condition) return Array.isArray(condition.in) && condition.in.includes(actual);
    const left = actual instanceof Date ? actual.getTime() : Number(actual);
    return Object.entries(condition).every(([operator, target]) => {
      const right = target instanceof Date ? target.getTime() : Number(target);
      return operator === "gt" ? left > right : operator === "gte" ? left >= right : operator === "lte" ? left <= right : false;
    });
  });
}
function model(name: string) {
  const rows = () => tables[name];
  return {
    findUnique: async ({ where }: Query) => {
      const row = rows().find(row => matches(row, where));
      if (!row) return null;
      return name === "organizationMembership" ? { ...row, organization: { ...tables.organization[0], entitlement: tables.organizationEntitlement[0] } } : { ...row };
    },
    findFirst: async ({ where }: Query) => rows().find(row => matches(row, where)) ?? null,
    count: async ({ where }: Query) => rows().filter(row => matches(row, where)).length,
    create: async ({ data }: Query) => {
      if (name === "organizationAuditLog" && failAudit) throw new Error("Audit unavailable");
      const row = { id: randomUUID(), status: "PENDING", deliveryStatus: "NOT_SENT", ...data };
      writes.push(name + ":create"); rows().push(row); return { ...row };
    },
    update: async ({ where, data }: Query) => {
      const row = rows().find(row => matches(row, where));
      if (!row) throw new Error("Missing fixture");
      writes.push(name + ":" + String(data?.role ?? data?.status ?? "update"));
      Object.assign(row, data); return { ...row };
    },
    updateMany: async ({ where, data }: Query) => {
      const selected = rows().filter(row => matches(row, where));
      selected.forEach(row => Object.assign(row, data)); return { count: selected.length };
    },
    upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
      let row = rows().find(row => matches(row, where));
      if (row) Object.assign(row, update);
      else { row = { id: randomUUID(), status: "ACTIVE", ...create }; rows().push(row); }
      return { ...row };
    },
  };
}
const db = {
  user: model("user"), organization: model("organization"), organizationMembership: model("organizationMembership"),
  organizationInvitation: model("organizationInvitation"), organizationOperation: model("organizationOperation"),
  organizationAuditLog: model("organizationAuditLog"),
  $queryRaw: async () => [{ now: new Date(now) }],
};
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { ...db, $transaction: async (fn: (tx: typeof db) => Promise<unknown>) => {
  if (failConflict) { failConflict = false; throw Object.assign(new Error("Serialization"), { code: "P2034" }); }
  const snapshot = structuredClone(tables);
  try { return await fn(db); } catch (error) { Object.assign(tables, snapshot); throw error; }
} } } });
mock.module("../src/lib/loyalty/plans.ts", { namedExports: { freeEntitlement: (plan: string) => {
  // Synthetic paid fixtures only in this test module; no application flag can enable them.
  if (plan === "FREE" || plan === "PRO" || plan === "BUSINESS") return loyaltyPlans[plan];
  throw new Error("Unconfirmed loyalty entitlement");
} } });
let execute: typeof import("../src/lib/loyalty/memberships").executeMembership;
let schema: typeof import("../src/lib/loyalty/memberships").membershipRequest;
let addStaff: typeof import("../src/lib/loyalty/organizations").addStaffMembership;
before(async () => {
  ({ executeMembership: execute, membershipRequest: schema } = await import("../src/lib/loyalty/memberships"));
  ({ addStaffMembership: addStaff } = await import("../src/lib/loyalty/organizations"));
});
function reset(plan = "PRO") {
  for (const name of ["user", "organization", "organizationMembership", "organizationEntitlement", "organizationInvitation", "organizationOperation", "organizationAuditLog"]) tables[name] = [];
  tables.user = ["owner", "admin", "staff", "recipient", "foreign"].map(id => ({ id, role: "CUSTOMER", banned: false, emailVerified: true, email: id + "@example.invalid" }));
  tables.organization = [{ id: "org", status: "ACTIVE" }];
  tables.organizationEntitlement = [{ organizationId: "org", plan }];
  tables.organizationMembership = ["owner", "admin", "staff"].map(userId => ({ id: userId + "-membership", organizationId: "org", userId, role: userId.toUpperCase(), status: "ACTIVE" }));
  writes = []; failAudit = false; failConflict = false;
}
function request(action: string, rest: Row = {}): Row { return { action, organizationId: "org", operationId: randomUUID(), ...rest }; }
function invite(role = "STAFF", email = "recipient@example.invalid") { return request("INVITE", { role, email }); }
async function created() {
  const result = await execute("owner", invite());
  assert.ok(result.delivery); return result.delivery;
}

test("request validation rejects client identities, OWNER invitations, invalid IDs and malformed tokens", () => {
  for (const raw of [invite("OWNER"), { ...invite(), actorId: "foreign" }, request("ACCEPT", { token: "short" }), { ...invite(), organizationId: "../foreign" }, { ...invite(), operationId: "wrong" }]) assert.equal(schema.safeParse(raw).success, false);
  const parsed = schema.parse(invite("STAFF", "  Recipient@EXAMPLE.INVALID  "));
  assert.ok("email" in parsed); assert.equal(parsed.email, "recipient@example.invalid");
});

test("only current tenant managers can invite and ADMIN cannot grant ADMIN", async () => {
  for (const actor of ["staff", "foreign"]) { reset(); await assert.rejects(execute(actor, invite()), /FORBIDDEN/); assert.equal(tables.organizationInvitation.length, 0); }
  reset(); await assert.rejects(execute("admin", invite("ADMIN")), /FORBIDDEN/);
  reset(); tables.user[0].role = "OWNER,CUSTOMER"; await assert.rejects(execute("owner", invite()), /FORBIDDEN/);
  reset(); tables.user[0].banned = true; await assert.rejects(execute("owner", invite()), /FORBIDDEN/);
  reset(); tables.organizationMembership[0].status = "REVOKED"; await assert.rejects(execute("owner", invite()), /FORBIDDEN/);
});

test("invitations store only a hash, reserve a place, expire after seven days and replay without new delivery", async () => {
  reset(); const input = invite(); const first = await execute("owner", input);
  assert.ok(first.delivery); assert.equal(first.delivery.token.length, 43);
  assert.equal(first.delivery.expiresAt.getTime() - now.getTime(), 7 * 86_400_000);
  assert.ok(!JSON.stringify(tables).includes(first.delivery.token));
  assert.deepEqual(await execute("owner", input), { resultId: first.resultId, replayed: true });
  await assert.rejects(execute("owner", { ...input, email: "other@example.invalid" }), /CONFLICT/);
  await assert.rejects(execute("owner", invite()), /CONFLICT/);
  await execute("owner", invite("STAFF", "second@example.invalid"));
  await assert.rejects(execute("owner", invite("STAFF", "third@example.invalid")), /LIMIT_REACHED/);
  assert.equal(tables.organizationOperation.length, 2);
});

test("Free capacity includes its owner, while expired invitations release capacity", async () => {
  reset("FREE"); tables.organizationMembership = tables.organizationMembership.slice(0, 1);
  await assert.rejects(execute("owner", invite()), /LIMIT_REACHED/);
  reset(); await created(); await execute("owner", invite("STAFF", "second@example.invalid"));
  tables.organizationInvitation[0].expiresAt = new Date(now.getTime() - 1);
  await execute("owner", invite());
  assert.equal(tables.organizationInvitation[0].status, "EXPIRED");
});

test("acceptance requires the verified matching account and cannot replay a later revocation", async () => {
  reset(); const mail = await created(); const input = request("ACCEPT", { token: mail.token });
  await assert.rejects(execute("foreign", input), /INVALID_INVITATION/);
  tables.user[3].emailVerified = false; await assert.rejects(execute("recipient", input), /INVALID_INVITATION/);
  tables.user[3].emailVerified = true;
  const result = await execute("recipient", input);
  assert.equal(result.resultId, mail.invitationId);
  assert.equal(tables.organizationMembership.length, 4);
  assert.equal(tables.organizationInvitation[0].status, "ACCEPTED");
  assert.equal((await execute("recipient", input)).replayed, true);
  const member = tables.organizationMembership.find(row => row.userId === "recipient"); assert.ok(member); member.status = "REVOKED";
  await assert.rejects(execute("recipient", input), /INVALID_INVITATION/);
  await assert.rejects(execute("recipient", request("ACCEPT", { token: mail.token })), /INVALID_INVITATION/);
  assert.equal(member.status, "REVOKED");
});

test("already active recipients are not promoted; reserved acceptance still works after downgrade", async () => {
  reset(); const mail = await created(); tables.organizationEntitlement[0].plan = "FREE";
  tables.organizationMembership.push({ id: "recipient-member", organizationId: "org", userId: "recipient", role: "STAFF", status: "ACTIVE" });
  tables.organizationInvitation[0].role = "ADMIN";
  await execute("recipient", request("ACCEPT", { token: mail.token }));
  assert.equal(tables.organizationMembership.length, 4);
  assert.equal(tables.organizationMembership[3].role, "STAFF");
});

test("rotation invalidates old token without extending expiry or reserving a second place; revocation blocks acceptance", async () => {
  reset(); const first = await created();
  const rotated = await execute("admin", request("ROTATE_INVITATION", { invitationId: first.invitationId })); assert.ok(rotated.delivery);
  assert.notEqual(rotated.delivery.token, first.token); assert.deepEqual(rotated.delivery.expiresAt, first.expiresAt);
  assert.equal(tables.organizationInvitation.length, 1);
  await assert.rejects(execute("recipient", request("ACCEPT", { token: first.token })), /INVALID_INVITATION/);
  await execute("admin", request("REVOKE_INVITATION", { invitationId: first.invitationId }));
  await assert.rejects(execute("recipient", request("ACCEPT", { token: rotated.delivery.token })), /INVALID_INVITATION/);
});

test("ADMIN cannot modify ADMIN/OWNER or promote STAFF and removed managers lose access immediately", async () => {
  reset();
  for (const input of [request("REMOVE_MEMBER", { userId: "owner" }), request("REMOVE_MEMBER", { userId: "admin" }), request("CHANGE_ROLE", { userId: "staff", role: "ADMIN" }), request("TRANSFER_OWNER", { userId: "staff" })]) await assert.rejects(execute("admin", input), /FORBIDDEN/);
  await execute("owner", request("REMOVE_MEMBER", { userId: "admin" }));
  await assert.rejects(execute("admin", invite()), /FORBIDDEN/);
});

test("ownership downgrades the old owner first; its receipt replays after downgrade without a second transfer", async () => {
  reset(); const input = request("TRANSFER_OWNER", { userId: "staff" });
  await execute("owner", input);
  assert.deepEqual(writes.slice(0, 2), ["organizationMembership:ADMIN", "organizationMembership:OWNER"]);
  assert.equal(tables.organizationMembership.filter(row => row.role === "OWNER").length, 1);
  assert.equal((await execute("owner", input)).replayed, true);
  assert.equal(tables.organizationOperation.length, 1);
  await assert.rejects(execute("owner", request("TRANSFER_OWNER", { userId: "admin" })), /FORBIDDEN/);
});

test("failed audit rolls back mutation and receipt; serialization retry keeps the same intent", async () => {
  reset(); failAudit = true; const input = invite();
  await assert.rejects(execute("owner", input), /Audit unavailable/);
  assert.equal(tables.organizationInvitation.length, 0); assert.equal(tables.organizationOperation.length, 0);
  failAudit = false; failConflict = true;
  await execute("owner", input);
  assert.equal(tables.organizationInvitation.length, 1); assert.equal(tables.organizationOperation.length, 1);
});

test("durable rotation rate limits prevent unlimited resend intents", async () => {
  reset(); const mail = await created();
  for (let i = 0; i < 4; i++) await execute("owner", request("ROTATE_INVITATION", { invitationId: mail.invitationId }));
  await assert.rejects(execute("owner", request("ROTATE_INVITATION", { invitationId: mail.invitationId })), /RATE_LIMITED/);
});

test("foundation STAFF addition cannot bypass an invitation or restore revoked access", async () => {
  reset(); await created();
  await assert.rejects(addStaff("owner", "org", "recipient", "Do not bypass invitation"), /CONFLICT/);
  reset(); tables.organizationMembership.push({ id: "revoked", userId: "recipient", organizationId: "org", role: "STAFF", status: "REVOKED" });
  await assert.rejects(addStaff("owner", "org", "recipient", "Do not bypass revocation"), /FORBIDDEN/);
});

test("foreign tenant IDs, missing targets, expired links and blocked ownership targets fail without writes", async () => {
  reset();
  await assert.rejects(execute("owner", { ...invite(), organizationId: "other" }), /FORBIDDEN/);
  await assert.rejects(execute("owner", request("CHANGE_ROLE", { userId: "foreign", role: "ADMIN" })), /FORBIDDEN/);
  tables.user[2].banned = true;
  await assert.rejects(execute("owner", request("TRANSFER_OWNER", { userId: "staff" })), /FORBIDDEN/);
  assert.equal(tables.organizationOperation.length, 0);
  reset(); const mail = await created(); tables.organizationInvitation[0].expiresAt = new Date(now);
  await assert.rejects(execute("recipient", request("ACCEPT", { token: mail.token })), /INVALID_INVITATION/);
  assert.equal(tables.organizationMembership.length, 3);
});

test("failed ownership audit rolls back both role changes and its operation receipt", async () => {
  reset(); failAudit = true;
  await assert.rejects(execute("owner", request("TRANSFER_OWNER", { userId: "staff" })), /Audit unavailable/);
  assert.equal(tables.organizationMembership[0].role, "OWNER"); assert.equal(tables.organizationMembership[2].role, "STAFF");
  assert.equal(tables.organizationOperation.length, 0);
});
