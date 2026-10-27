import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, mock, test } from "node:test";
import sharp from "sharp";

type Row = { id: string; organizationId: string; storageKey?: string; action?: string; fingerprint?: string; resultId?: string; operationId?: string };
let active = true, role = "OWNER", failProvider = false, revokeOnUpload = false, calls = 0;
const assets: Row[] = [], operations: Row[] = [];
const tx = {
  $queryRaw: async () => [],
  user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === "actor" ? { id: "actor", role: "CUSTOMER", banned: false } : null },
  organizationMembership: { findUnique: async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
    const key = where.organizationId_userId;
    return key.organizationId === "org" && key.userId === "actor" ? { id: "member", role, status: active ? "ACTIVE" : "REVOKED", organization: { status: "ACTIVE", entitlement: { plan: "FREE" } } } : null;
  } },
  loyaltyAsset: {
    findFirst: async ({ where }: { where: Row }) => assets.find(row => row.id === where.id && row.organizationId === where.organizationId) ?? null,
    create: async ({ data }: { data: Row }) => { const asset = { ...data, id: randomUUID() }; assets.push(asset); return asset; },
  },
  loyaltyOperation: {
    findUnique: async ({ where }: { where: { organizationId_operationId: Row } }) => operations.find(row => row.operationId === where.organizationId_operationId.operationId) ?? null,
    create: async ({ data }: { data: Row }) => { operations.push(data); return data; },
  },
  organizationAuditLog: { create: async () => ({}) },
};
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { ...tx, $transaction: async (callback: (value: typeof tx) => unknown) => callback(tx) } } });
mock.module("../src/lib/session.ts", { namedExports: { getCurrentSession: async () => ({ user: { id: "actor" } }) } });
mock.module("uploadthing/server", { namedExports: {
  UTFile: File,
  UTApi: class {
    async uploadFiles(file: File, options: { acl: string }) {
      calls++; assert.equal(options.acl, "private"); assert.equal(file.type, "image/png");
      assert.equal((await sharp(new Uint8Array(await file.arrayBuffer())).metadata()).format, "png");
      if (revokeOnUpload) active = false;
      return failProvider ? { error: { code: "FAILED" }, data: null } : { error: null, data: { key: randomUUID() } };
    }
  },
} });
let upload: typeof import("../src/lib/loyalty/program-assets").uploadProgramLogo;
let post: typeof import("../src/app/api/loyalty/organizations/[organizationId]/assets/route").POST;
before(async () => { upload = (await import("../src/lib/loyalty/program-assets")).uploadProgramLogo;
  post = (await import("../src/app/api/loyalty/organizations/[organizationId]/assets/route")).POST;
});
test("logos normalize before private upload; replay and provider/revocation failures never claim assets", async () => {
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).jpeg().toBuffer();
  const file = new File([new Uint8Array(bytes)], "input.jpg", { type: "image/jpeg" });
  const operation = randomUUID();
  const result = await upload("actor", "org", operation, file);
  assert.equal(assets.length, 1); assert.deepEqual(await upload("actor", "org", operation, file), result); assert.equal(calls, 1);
  failProvider = true;
  await assert.rejects(upload("actor", "org", randomUUID(), file), /LOGO_STORAGE_UNAVAILABLE/);
  assert.equal(assets.length, 1);
  failProvider = false; revokeOnUpload = true;
  await assert.rejects(upload("actor", "org", randomUUID(), file), /FORBIDDEN/);
  assert.equal(assets.length, 1); assert.equal(operations.length, 1);
  active = true; revokeOnUpload = false; role = "STAFF";
  const beforeCalls = calls;
  await assert.rejects(upload("actor", "org", randomUUID(), file), /FORBIDDEN/);
  assert.equal(calls, beforeCalls);
  role = "ADMIN";
  await assert.rejects(upload("actor", "foreign", randomUUID(), file), /FORBIDDEN/);
  await assert.rejects(upload("actor", "org", randomUUID(), new File(["bad"], "bad.png", { type: "image/png" })), /INVALID_INPUT/);
  assert.equal(calls, beforeCalls);
});
test("direct upload HTTP rejects STAFF, foreign tenants, wrong origins and malformed bodies", async () => {
  active = true; role = "STAFF";
  process.env.BETTER_AUTH_URL = "https://academy.example.invalid";
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
  const request = (origin = process.env.BETTER_AUTH_URL!) => {
    const form = new FormData(); form.set("operationId", randomUUID()); form.set("file", new File([new Uint8Array(bytes)], "logo.png", { type: "image/png" }));
    return new Request(`${process.env.BETTER_AUTH_URL}/api`, { method: "POST", body: form, headers: { origin } });
  };
  const context = { params: Promise.resolve({ organizationId: "org" }) };
  assert.equal((await post(request(), context)).status, 403);
  role = "ADMIN";
  assert.equal((await post(request(), { params: Promise.resolve({ organizationId: "foreign" }) })).status, 403);
  assert.equal((await post(request("https://foreign.invalid"), context)).status, 403);
  assert.equal((await post(new Request(`${process.env.BETTER_AUTH_URL}/api`, { method: "POST", body: "bad", headers: { origin: process.env.BETTER_AUTH_URL! } }), context)).status, 422);
});
