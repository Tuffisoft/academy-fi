import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, mock, test } from "node:test";
import { defaultProgram } from "../src/lib/loyalty/program-input";

// Adapter/service behavior only; real constraints and concurrency have a separate DB test.
type Row = Record<string, unknown>;
let role = "OWNER", active = true, session = true, banned = false;
let operations: Row[] = [], programs: Row[] = [], assets: Row[] = [];
let audits: Row[] = [];
let transactionCalls = 0, failAudit = false, commitFailures = 0;
let commitFailureCode = "P2034";
const match = (row: Row, where: Row): boolean => Object.entries(where).every(([key, value]) =>
  key === "organizationId_operationId" ? match(row, value as Row)
    : value !== null && typeof value === "object" && "gt" in value ? String(row[key]) > String(value.gt) : row[key] === value);
const tx = {
  $queryRaw: async () => [],
  user: { findUnique: async ({ where }: { where: { id: string } }) => ["actor", "otherActor"].includes(where.id) ? { id: where.id, role: "CUSTOMER", banned } : null },
  organizationMembership: { findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
    const key = where.organizationId_userId;
    return key.organizationId === "org" && ["actor", "otherActor"].includes(key.userId) ? { id: "member", role, status: active ? "ACTIVE" : "REVOKED", organization: { status: "ACTIVE", entitlement: { plan: "FREE" } } } : null;
  } },
  loyaltyOperation: {
    findUnique: async ({ where }: { where: Row }) => operations.find(row => match(row, where)) ?? null,
    create: async ({ data }: { data: Row }) => { operations.push(data); return data; },
  },
  loyaltyProgram: {
    findFirst: async ({ where }: { where: Row }) => programs.find(row => match(row, where)) ?? null,
    findMany: async ({ where, take }: { where: Row; take: number }) => programs.filter(row => match(row, where)).sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(0, take),
    create: async ({ data }: { data: Row }) => { const row = { ...data, id: randomUUID(), status: "DRAFT", revision: 1 }; programs.push(row); return row; },
    update: async ({ where, data }: { where: Row; data: Row }) => { const row = programs.find(row => match(row, where))!; Object.assign(row, { ...data, revision: Number(row.revision) + 1 }); return row; },
  },
  loyaltyAsset: { findFirst: async ({ where }: { where: Row }) => assets.find(row => match(row, where)) ?? null },
  organizationAuditLog: { create: async ({ data }: { data: Row }) => { if (failAudit) throw new Error("AUDIT_UNAVAILABLE"); audits.push(data); return data; } },
};
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { $transaction: async (callback: (transaction: typeof tx) => unknown) => {
  transactionCalls++;
  const snapshot = structuredClone({ operations, programs, assets, audits });
  try {
    const result = await callback(tx);
    if (commitFailures > 0) { commitFailures--; throw Object.assign(new Error("COMMIT_FAILED"), { code: commitFailureCode }); }
    return result;
  } catch (error) {
    ({ operations, programs, assets, audits } = snapshot);
    throw error;
  }
} } } });
mock.module("../src/lib/session.ts", { namedExports: { getCurrentSession: async () => session ? { user: { id: "actor", role: "STAFF" } } : null } });
let save: typeof import("../src/lib/loyalty/programs").saveProgram;
let read: typeof import("../src/lib/loyalty/programs").readPrograms;
let action: typeof import("../src/lib/loyalty/program.actions").saveProgramAction;
let http: typeof import("../src/lib/loyalty/program-http").programHttp;
before(async () => {
  ({ saveProgram: save, readPrograms: read } = await import("../src/lib/loyalty/programs"));
  action = (await import("../src/lib/loyalty/program.actions")).saveProgramAction;
  http = (await import("../src/lib/loyalty/program-http")).programHttp;
});
const command = () => ({ organizationId: "org", operationId: randomUUID(), config: { ...defaultProgram, name: "Coffee", reward: "Coffee" } });
test("drafts save, reopen, replay, reject changed operation contents and stale revisions", async () => {
  programs = []; operations = []; assets = []; role = "OWNER"; active = true;
  const input = command(), first = await save("actor", input);
  assert.equal((await save("actor", input)).replayed, true); assert.equal(programs.length, 1);
  assert.deepEqual((await read("actor", "org", first.program.id)).programs[0], first.program);
  await assert.rejects(save("actor", { ...input, config: { ...input.config, target: 9 } }), /IDEMPOTENCY_CONFLICT/);
  const update = { ...command(), programId: first.program.id, expectedRevision: 1 };
  assert.equal((await save("actor", update)).program.revision, 2);
  await assert.rejects(save("actor", { ...update, operationId: randomUUID() }), /REVISION_CONFLICT/);
  await assert.rejects(save("actor", { ...command(), config: { ...input.config, logoAssetId: "foreign" } }), /INVALID_INPUT/);
  assets.push({ id: "foreign", organizationId: "foreign-org", mediaType: "image/png", purpose: "LOGO" });
  await assert.rejects(save("actor", { ...command(), config: { ...input.config, logoAssetId: "foreign" } }), /INVALID_INPUT/);
});
test("service, action and HTTP reject STAFF, revoked access and foreign IDs", async () => {
  const input = command(); role = "STAFF";
  await assert.rejects(save("actor", input), /FORBIDDEN/); await assert.rejects(read("actor", "org"), /FORBIDDEN/);
  assert.equal((await action(input, "de")).ok, false);
  process.env.BETTER_AUTH_URL = "https://academy.example.invalid";
  const request = (body: unknown, origin = process.env.BETTER_AUTH_URL!) => new Request(`${process.env.BETTER_AUTH_URL}/api`, { method: "POST", headers: { origin, "content-type": "application/json", "accept-language": "de" }, body: JSON.stringify(body) });
  const body = { operationId: input.operationId, config: input.config };
  assert.equal((await http(request(body), "org")).status, 403);
  role = "ADMIN";
  assert.equal((await http(request(body), "org")).status, 200);
  for (const size of [41, 20_000]) {
    const oversized = { ...body, operationId: randomUUID(), config: { ...body.config, name: "a".repeat(size) } };
    assert.equal((await http(request(oversized), "org")).status, 422);
    assert.equal((await action({ ...oversized, organizationId: "org" }, "de")).ok, false);
  }
  assert.equal((await http(request(body, "https://foreign.invalid"), "org")).status, 403);
  assert.equal((await http(request({ ...body, actorId: "foreign" }), "org")).status, 422);
  assert.equal((await http(request(body), "foreign")).status, 403);
  assert.equal((await http(request({ ...body, operationId: randomUUID(), expectedRevision: 1 }), "org", "foreign-program")).status, 404);
  active = false;
  assert.equal((await http(request(body), "org")).status, 403);
  await assert.rejects(read("actor", "org"), /FORBIDDEN/);
  active = true; banned = true;
  assert.equal((await http(request(body), "org")).status, 403);
  banned = false; session = false;
  assert.equal((await http(request(body), "org")).status, 401);
  const reply = await action(input, "en"); assert.equal(reply.ok, false);
  session = true;
});

test("reads validate empty identifiers before DB access and paginate exactly 50 own drafts", async () => {
  role = "OWNER"; active = true; banned = false;
  const beforeCalls = transactionCalls;
  for (const [programId, after] of [["", undefined], [undefined, ""], ["id", "cursor"], ["../foreign", undefined]] as const) {
    await assert.rejects(read("actor", "org", programId, after), /INVALID_INPUT/);
  }
  await assert.rejects(read("", "org"), /INVALID_INPUT/);
  await assert.rejects(save("", command()), /INVALID_INPUT/);
  assert.equal(transactionCalls, beforeCalls);
  programs = Array.from({ length: 51 }, (_, i) => ({ ...command().config, id: `p${String(i).padStart(3, "0")}`, organizationId: "org", status: "DRAFT", revision: 1 }));
  programs.push({ ...programs[0], id: "foreign", organizationId: "foreign" });
  const first = await read("actor", "org");
  assert.equal(first.programs.length, 50); assert.equal(first.next, "p049");
  const second = await read("actor", "org", undefined, first.next!);
  assert.deepEqual(second.programs.map(row => row.id), ["p050"]); assert.equal(second.next, null);
  await assert.rejects(read("actor", "org", "foreign"), /NOT_FOUND/);
});

test("audit/commit failures roll back drafts and bounded retries keep the same operation", async () => {
  operations = []; programs = []; assets = []; audits = []; role = "ADMIN"; active = true; banned = false; session = true;
  const input = command();
  failAudit = true;
  const beforeFailure = transactionCalls;
  const failed = await action(input, "de");
  assert.equal(failed.ok, false); if (!failed.ok) assert.equal(failed.error.code, "UNAVAILABLE");
  assert.equal(transactionCalls - beforeFailure, 1);
  assert.equal(programs.length, 0); assert.equal(operations.length, 0); assert.equal(audits.length, 0);
  failAudit = false; commitFailures = 2; commitFailureCode = "P2034";
  const beforeRetry = transactionCalls;
  const result = await save("actor", input);
  assert.equal(transactionCalls - beforeRetry, 3);
  assert.equal(programs.length, 1); assert.equal(operations.length, 1); assert.equal(audits.length, 1);
  assert.equal(operations[0].operationId, input.operationId);
  assert.equal((await save("actor", input)).program.id, result.program.id);
  await assert.rejects(save("otherActor", input), /IDEMPOTENCY_CONFLICT/);
  const snapshot = structuredClone(programs);
  commitFailures = 3;
  const beforeExhaustion = transactionCalls;
  await assert.rejects(save("actor", { ...command(), programId: result.program.id, expectedRevision: 1, config: { ...input.config, name: "Uncommitted" } }), /COMMIT_FAILED/);
  assert.equal(transactionCalls - beforeExhaustion, 3); assert.deepEqual(programs, snapshot);
  commitFailureCode = "P1001"; commitFailures = 1;
  const beforeConnectionFailure = transactionCalls;
  await assert.rejects(save("actor", command()), /COMMIT_FAILED/);
  assert.equal(transactionCalls - beforeConnectionFailure, 1); assert.deepEqual(programs, snapshot);
  assert.equal(operations.length, 1); assert.equal(audits.length, 1);
  commitFailures = 0;
});
