import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, mock, test } from "node:test";
import { z } from "zod";
import { defaultProgram } from "../src/lib/loyalty/program-input";
import { logoObjectKey } from "../src/lib/loyalty/logo-storage-config";

// Adapter/service behavior only; real constraints and concurrency have a separate DB test.
type Row = Record<string, unknown>;
let role = "OWNER", active = true, session = true, banned = false;
let hasMembership = true, organizationActive = true, globalRole = "CUSTOMER";
let operations: Row[] = [], programs: Row[] = [], assets: Row[] = [];
let audits: Row[] = [];
let transactionCalls = 0, failAudit = false, commitFailures = 0;
let commitFailureCode = "P2034";
let failDeletion = false;
const deletedKeys: string[] = [];
mock.module("../src/lib/loyalty/logo-storage.ts", { namedExports: {
  deleteLogoObject: async (key: string) => { if (failDeletion) throw new Error("R2_UNAVAILABLE"); deletedKeys.push(key); },
} });
const match = (row: Row, where: Row): boolean => Object.entries(where).every(([key, value]) =>
  key === "organizationId_operationId" ? match(row, value as Row)
    : value !== null && typeof value === "object" && "in" in value ? (value.in as unknown[]).includes(row[key])
    : value !== null && typeof value === "object" && "startsWith" in value ? String(row[key]).startsWith(String(value.startsWith))
    : value !== null && typeof value === "object" && "gt" in value ? String(row[key]) > String(value.gt) : row[key] === value);
const tx = {
  $queryRaw: async () => [],
  user: { findUnique: async ({ where }: { where: { id: string } }) => ["actor", "otherActor"].includes(where.id) ? { id: where.id, role: globalRole, banned } : null },
  organizationMembership: { findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
    const key = where.organizationId_userId;
    return hasMembership && key.organizationId === "org" && ["actor", "otherActor"].includes(key.userId) ? { id: "member", role, status: active ? "ACTIVE" : "REVOKED", organization: { status: organizationActive ? "ACTIVE" : "SUSPENDED", entitlement: { plan: "FREE" } } } : null;
  } },
  loyaltyOperation: {
    findUnique: async ({ where }: { where: Row }) => operations.find(row => match(row, where)) ?? null,
    findFirst: async ({ where }: { where: Row }) => operations.find(row => match(row, where)) ?? null,
    findMany: async ({ where }: { where: Row }) => operations.filter(row => match(row, where)),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => { const rows = operations.filter(row => match(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length }; },
    create: async ({ data }: { data: Row }) => { const row = { id: randomUUID(), ...data }; operations.push(row); return row; },
  },
  loyaltyProgram: {
    count: async ({ where }: { where: Row }) => programs.filter(row => match(row, where)).length,
    findFirst: async ({ where }: { where: Row }) => programs.find(row => match(row, where)) ?? null,
    findMany: async ({ where, take }: { where: Row; take: number }) => programs.filter(row => match(row, where)).sort((a, b) => String(a.id).localeCompare(String(b.id))).slice(0, take),
    create: async ({ data }: { data: Row }) => { const row = { ...data, id: randomUUID(), status: "DRAFT", blockedAt: null, conditionsBoundAt: null, revision: 1 }; programs.push(row); return row; },
    update: async ({ where, data }: { where: Row; data: Row }) => { const row = programs.find(row => match(row, where))!; Object.assign(row, { ...data, revision: Number(row.revision) + 1 }); return row; },
  },
  loyaltyAsset: {
    findFirst: async ({ where }: { where: Row }) => assets.find(row => match(row, where)) ?? null,
    findMany: async ({ where }: { where: Row }) => assets.filter(row => match(row, where)),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => { const rows = assets.filter(row => match(row, where)); rows.forEach(row => Object.assign(row, data)); return { count: rows.length }; },
  },
  organizationAuditLog: { create: async ({ data }: { data: Row }) => { if (failAudit) throw new Error("AUDIT_UNAVAILABLE"); audits.push(data); return data; } },
};
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { loyaltyAsset: tx.loyaltyAsset, loyaltyOperation: tx.loyaltyOperation, $transaction: async (callback: (transaction: typeof tx) => unknown) => {
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
let lifecycle: typeof import("../src/lib/loyalty/programs").changeProgramLifecycle;
let lifecycleAction: typeof import("../src/lib/loyalty/program.actions").changeProgramLifecycleAction;
let lifecyclePost: typeof import("../src/app/api/loyalty/organizations/[organizationId]/programs/[id]/lifecycle/route").POST;
before(async () => {
  ({ saveProgram: save, readPrograms: read } = await import("../src/lib/loyalty/programs"));
  lifecycle = (await import("../src/lib/loyalty/programs")).changeProgramLifecycle;
  action = (await import("../src/lib/loyalty/program.actions")).saveProgramAction;
  http = (await import("../src/lib/loyalty/program-http")).programHttp;
  lifecycleAction = (await import("../src/lib/loyalty/program.actions")).changeProgramLifecycleAction;
  lifecyclePost = (await import("../src/app/api/loyalty/organizations/[organizationId]/programs/[id]/lifecycle/route")).POST;
});
const command = () => ({ organizationId: "org", operationId: randomUUID(), config: { ...defaultProgram, name: "Coffee", reward: "Coffee" } });

test("direct lifecycle action and route enforce authentication, trust boundaries and replay", async () => {
  programs = []; operations = []; audits = []; assets = [];
  role = "OWNER"; active = true; session = true; banned = false;
  hasMembership = true; organizationActive = true; globalRole = "CUSTOMER";
  process.env.BETTER_AUTH_URL = "https://academy.example.invalid";
  const draft = (await save("actor", command())).program;
  const body = { action: "PUBLISH", expectedRevision: 1, operationId: randomUUID() };
  const full = { ...body, organizationId: "org", programId: draft.id };
  const request = (value: unknown = body, locale = "de", origin: string | null = process.env.BETTER_AUTH_URL!, contentType = "application/json") => new Request(`${process.env.BETTER_AUTH_URL}/api`, {
    method: "POST", headers: { ...(origin ? { origin } : {}), "content-type": contentType, "accept-language": locale }, body: JSON.stringify(value),
  });
  const post = (req: Request, organizationId = "org", id = draft.id) => lifecyclePost(req, { params: Promise.resolve({ organizationId, id }) });
  const snapshot = () => structuredClone({ programs, operations, audits });
  const denied = async (input: unknown, req: Request, code: string, status: number, locale: "de" | "en") => {
    const beforeState = snapshot();
    const reply = await lifecycleAction(input, locale);
    assert.equal(reply.ok, false);
    if (!reply.ok) { assert.equal(reply.error.code, code); assert.ok(reply.error.message.length); }
    const response = await post(req);
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(z.object({ ok: z.literal(false), error: z.object({ code: z.string(), message: z.string().min(1) }) }).parse(await response.json()).error.code, code);
    assert.deepEqual(snapshot(), beforeState);
  };
  for (const locale of ["de", "en"] as const) {
    session = false;
    await denied(full, request(body, locale), "UNAUTHENTICATED", 401, locale);
    session = true;
    for (const action of ["PUBLISH", "ARCHIVE", "REACTIVATE", "BLOCK", "UNBLOCK"]) {
      role = "STAFF";
      await denied({ ...full, action }, request({ ...body, action }, locale), "FORBIDDEN", 403, locale);
      role = "ADMIN"; active = false;
      await denied({ ...full, action }, request({ ...body, action }, locale), "FORBIDDEN", 403, locale);
      active = true;
    }
    for (const internalRole of ["OWNER", "INTERN"]) {
      globalRole = internalRole; hasMembership = false;
      await denied(full, request(body, locale), "FORBIDDEN", 403, locale);
    }
    globalRole = "CUSTOMER"; hasMembership = true;
    organizationActive = false;
    await denied(full, request(body, locale), "FORBIDDEN", 403, locale);
    organizationActive = true; banned = true;
    await denied(full, request(body, locale), "FORBIDDEN", 403, locale);
    banned = false;
  }
  for (const invalid of [
    { action: "DELETE" }, { expectedRevision: 0 }, { expectedRevision: 1.5 },
    { operationId: "bad" }, { actorId: "otherActor" }, { role: "OWNER" },
    { config: command().config }, { unknown: true },
  ]) await denied({ ...full, ...invalid }, request({ ...body, ...invalid }), "INVALID_INPUT", 422, "de");
  const beforeInvalid = snapshot();
  for (const req of [
    request(body, "de", "https://foreign.invalid"), request(body, "de", null),
  ]) assert.equal((await post(req)).status, 403);
  for (const req of [
    request(body, "de", process.env.BETTER_AUTH_URL, "text/plain"),
    request(body, "de", process.env.BETTER_AUTH_URL, "application/json-invalid"),
    request(null), request([]), request({ ...body, organizationId: "foreign" }), request({ ...body, programId: "foreign" }),
    request({ padding: "x".repeat(16385) }),
    new Request(`${process.env.BETTER_AUTH_URL}/api`, { method: "POST", headers: { origin: process.env.BETTER_AUTH_URL!, "content-type": "application/json" }, body: "{" }),
  ]) assert.equal((await post(req)).status, 422);
  assert.equal((await post(request(), "foreign")).status, 403);
  assert.equal((await post(request(), "org", "foreign-program")).status, 404);
  assert.equal((await post(request(), "org", "../invalid")).status, 422);
  assert.deepEqual(snapshot(), beforeInvalid);
  // Reflect supplies an untyped client argument to exercise the runtime locale boundary.
  const invalidLocale: unknown = await Reflect.apply(lifecycleAction, undefined, [full, "fr"]);
  assert.equal(z.object({ ok: z.literal(false), error: z.object({ code: z.literal("INVALID_INPUT") }) }).parse(invalidLocale).error.code, "INVALID_INPUT");
  assert.deepEqual(snapshot(), beforeInvalid);
  const success = await lifecycleAction(full, "de");
  assert.equal(success.ok, true);
  const response = await post(request());
  assert.equal(response.status, 200);
  const replay = z.object({ ok: z.literal(true), data: z.object({ replayed: z.boolean(), program: z.object({ revision: z.number().int() }) }) }).parse(await response.json());
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.program.revision, 2);
  await denied({ ...full, action: "BLOCK" }, request({ ...body, action: "BLOCK" }), "IDEMPOTENCY_CONFLICT", 409, "de");
  await denied({ ...full, operationId: randomUUID() }, request({ ...body, operationId: randomUUID() }), "REVISION_CONFLICT", 409, "en");
  role = "STAFF";
  await denied(full, request(), "FORBIDDEN", 403, "de");
  role = "ADMIN";
  const archive = { action: "ARCHIVE", expectedRevision: 2, operationId: randomUUID() };
  assert.equal((await post(request(archive))).status, 200);
  const archiveReplay = await lifecycleAction({ ...archive, organizationId: "org", programId: draft.id }, "en");
  assert.equal(archiveReplay.ok, true);
  if (archiveReplay.ok) assert.equal(archiveReplay.data.replayed, true);
  assert.equal(audits.filter(row => row.action === "PROGRAM_PUBLISH").length, 1);
  assert.equal(audits.filter(row => row.action === "PROGRAM_ARCHIVE").length, 1);
});
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

test("lifecycle enforces limits, independent blocks, current-state replay and binding", async () => {
  programs = []; operations = []; audits = []; assets = []; role = "OWNER"; active = true;
  const input = command(), draft = (await save("actor", input)).program;
  const publish = { organizationId: "org", programId: draft.id, operationId: randomUUID(), expectedRevision: 1, action: "PUBLISH" };
  const published = await lifecycle("actor", publish);
  assert.equal(published.program.status, "PUBLISHED");
  assert.equal((await lifecycle("actor", publish)).replayed, true);
  assert.equal((await save("actor", input)).program.status, "PUBLISHED");
  const second = (await save("actor", command())).program;
  await assert.rejects(lifecycle("actor", { ...publish, programId: second.id, operationId: randomUUID() }), /PROGRAM_LIMIT/);
  const block = { ...publish, action: "BLOCK", expectedRevision: 2, operationId: randomUUID() };
  const blocked = await lifecycle("actor", block);
  assert.ok(blocked.program.blockedAt);
  const auditCount = audits.length;
  const noOp = { ...block, expectedRevision: 3, operationId: randomUUID() };
  assert.equal((await lifecycle("actor", noOp)).unchanged, true);
  assert.equal(audits.length, auditCount);
  assert.equal((await lifecycle("actor", noOp)).replayed, true);
  const archived = await lifecycle("actor", { ...noOp, action: "ARCHIVE", operationId: randomUUID() });
  assert.ok(archived.program.blockedAt);
  assert.equal(archived.program.status, "ARCHIVED");
  assert.equal((await lifecycle("actor", publish)).program.status, "ARCHIVED");
  await assert.rejects(lifecycle("actor", { ...publish, expectedRevision: 4, operationId: randomUUID() }), /STATE_CONFLICT/);
  const reactivated = await lifecycle("actor", { ...publish, action: "REACTIVATE", expectedRevision: 4, operationId: randomUUID() });
  assert.ok(reactivated.program.blockedAt);
  programs.find(row => row.id === draft.id)!.conditionsBoundAt = new Date();
  await assert.rejects(save("actor", { ...command(), programId: draft.id, expectedRevision: 5, config: { ...input.config, reward: "Other" } }), /CONDITIONS_BOUND/);
  assert.equal((await save("actor", { ...command(), programId: draft.id, expectedRevision: 5, config: { ...input.config, name: "Branding" } })).program.name, "Branding");
  role = "STAFF";
  await assert.rejects(lifecycle("actor", publish), /FORBIDDEN/);
  role = "OWNER"; active = false;
  await assert.rejects(lifecycle("actor", publish), /FORBIDDEN/);
  active = true;
  await assert.rejects(lifecycle("actor", { ...publish, organizationId: "foreign" }), /FORBIDDEN/);
  await assert.rejects(lifecycle("actor", { ...publish, action: "DELETE" }), /INVALID_INPUT/);
  await assert.rejects(lifecycle("actor", { ...publish, operationId: randomUUID() }), /REVISION_CONFLICT/);
  await assert.rejects(lifecycle("otherActor", publish), /IDEMPOTENCY_CONFLICT/);
  const revision = Number(programs.find(row => row.id === draft.id)!.revision);
  const failed = { ...publish, action: "UNBLOCK", expectedRevision: revision, operationId: randomUUID() };
  failAudit = true;
  await assert.rejects(lifecycle("actor", failed), /AUDIT_UNAVAILABLE/);
  failAudit = false;
  assert.equal(programs.find(row => row.id === draft.id)!.revision, revision);
  assert.equal(operations.some(row => row.operationId === failed.operationId), false);
  assert.equal((await lifecycle("actor", failed)).program.blockedAt, null);
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
  const beforeInvalidTargets = { calls: transactionCalls, programs: programs.length, operations: operations.length, audits: audits.length };
  for (const target of [0, 11, 1.5, 2147483647]) {
    const invalidTarget = { ...body, operationId: randomUUID(), config: { ...body.config, target } };
    await assert.rejects(save("actor", { ...invalidTarget, organizationId: "org" }), /INVALID_INPUT/);
    assert.equal((await http(request(invalidTarget), "org")).status, 422);
    assert.equal((await action({ ...invalidTarget, organizationId: "org" }, "de")).ok, false);
  }
  assert.deepEqual({ calls: transactionCalls, programs: programs.length, operations: operations.length, audits: audits.length }, beforeInvalidTargets);
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
  programs[0].target = 11;
  programs.push({ ...programs[0], id: "foreign", organizationId: "foreign" });
  const first = await read("actor", "org");
  assert.equal(first.programs.length, 50); assert.equal(first.next, "p049");
  assert.equal(first.programs[0].target, 11);
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
  assert.equal(transactionCalls - beforeRetry, 4);
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

test("logo retirement waits for commit, protects shared references and retries cleanup on save replay", async () => {
  operations = []; programs = []; assets = []; audits = []; role = "OWNER"; active = true; banned = false; session = true;
  deletedKeys.length = 0;
  const key = logoObjectKey("org", randomUUID(), "a".repeat(64));
  assets.push({ id: "old-logo", organizationId: "org", purpose: "LOGO", mediaType: "image/png", storageKey: key });
  const config = { ...command().config, logoAssetId: "old-logo" };
  const first = await save("actor", { ...command(), config });
  const second = await save("actor", { ...command(), config });
  const remove = { ...command(), programId: first.program.id, expectedRevision: 1 };
  failAudit = true;
  await assert.rejects(save("actor", remove), /AUDIT_UNAVAILABLE/);
  failAudit = false;
  assert.equal(assets[0].purpose, "LOGO"); assert.deepEqual(deletedKeys, []);
  await assert.rejects(save("actor", { ...remove, expectedRevision: 2 }), /REVISION_CONFLICT/);
  await save("actor", remove);
  assert.equal(assets[0].purpose, "LOGO"); assert.deepEqual(deletedKeys, []);
  const last = { ...command(), programId: second.program.id, expectedRevision: 1 };
  commitFailureCode = "P1001"; commitFailures = 1;
  await assert.rejects(save("actor", last), /COMMIT_FAILED/);
  assert.equal(assets[0].purpose, "LOGO"); assert.deepEqual(deletedKeys, []);
  failDeletion = true;
  assert.equal((await save("actor", last)).cleanupPending, true);
  assert.ok(operations.some(row => row.action === "LOGO_DELETE_PENDING"));
  assert.equal((await read("actor", "org")).cleanupPending, true);
  await assert.rejects(save("actor", { ...command(), config }), /INVALID_INPUT/);
  failDeletion = false;
  assert.equal((await save("actor", last)).cleanupPending, false);
  assert.ok(operations.some(row => row.action === "LOGO_DELETED"));
  assert.deepEqual(deletedKeys, [key]);
  assert.equal((await read("actor", "org", second.program.id)).programs[0].revision, 2);
});
