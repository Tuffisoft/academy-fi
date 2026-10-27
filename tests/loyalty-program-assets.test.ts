import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, mock, test } from "node:test";
import sharp from "sharp";
import { logoObjectKey } from "../src/lib/loyalty/logo-storage-config";
let downloadMode = "ok", downloadBytes = new Uint8Array();

type Row = {
  id: string;
  organizationId: string;
  storageKey?: string;
  action?: string;
  fingerprint?: string;
  resultId?: string;
  operationId?: string;
};
let active = true,
  role = "OWNER",
  failProvider = false,
  revokeOnUpload = false,
  calls = 0,
  failAudit = false;
let providerKey: string | null = null, signedCalls = 0;
let assets: Row[] = [],
  operations: Row[] = [];
const tx = {
  $queryRaw: async () => [],
  user: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      where.id === "actor"
        ? { id: "actor", role: "CUSTOMER", banned: false }
        : null,
  },
  organizationMembership: {
    findUnique: async ({
      where,
    }: {
      where: {
        organizationId_userId: { organizationId: string; userId: string };
      };
    }) => {
      const key = where.organizationId_userId;
      return key.organizationId === "org" && key.userId === "actor"
        ? {
            id: "member",
            role,
            status: active ? "ACTIVE" : "REVOKED",
            organization: { status: "ACTIVE", entitlement: { plan: "FREE" } },
          }
        : null;
    },
  },
  loyaltyAsset: {
    findFirst: async ({ where }: { where: Row }) =>
      assets.find(
        (row) =>
          row.id === where.id && row.organizationId === where.organizationId,
      ) ?? null,
    create: async ({ data }: { data: Row }) => {
      const asset = { ...data, id: randomUUID() };
      assets.push(asset);
      return asset;
    },
  },
  loyaltyOperation: {
    findUnique: async ({
      where,
    }: {
      where: { organizationId_operationId: Row };
    }) =>
      operations.find(
        (row) =>
          row.operationId === where.organizationId_operationId.operationId,
      ) ?? null,
    create: async ({ data }: { data: Row }) => {
      operations.push(data);
      return data;
    },
  },
  organizationAuditLog: {
    create: async () => {
      if (failAudit) throw new Error("AUDIT_FAILED");
      return {};
    },
  },
};
mock.module("../src/lib/prisma.ts", {
  namedExports: {
    prisma: {
      ...tx,
      $transaction: async (callback: (value: typeof tx) => unknown) => {
        const snapshot = structuredClone({ assets, operations });
        try {
          return await callback(tx);
        } catch (error) {
          ({ assets, operations } = snapshot);
          throw error;
        }
      },
    },
  },
});
mock.module("../src/lib/session.ts", {
  namedExports: { getCurrentSession: async () => ({ user: { id: "actor" } }) },
});
mock.module("../src/lib/loyalty/logo-storage.ts", { namedExports: {
  putLogoObject: async (bytes: Uint8Array, org: string, operation: string, fingerprint: string) => {
    calls++; assert.equal((await sharp(bytes).metadata()).format, "png");
    if (revokeOnUpload) active = false;
    if (failProvider) throw new Error("LOGO_STORAGE_UNAVAILABLE");
    return providerKey ?? logoObjectKey(org, operation, fingerprint);
  },
  getLogoObject: async () => {
    signedCalls++;
    return new Response(downloadMode === "bad-png" ? "not png" : new Uint8Array(downloadBytes), { headers: { "content-type": downloadMode === "wrong-type" ? "text/html" : "image/png", ...(downloadMode === "too-large" ? { "content-length": String(8 * 1024 * 1024 + 1) } : {}) } });
  },
} });
let upload: typeof import("../src/lib/loyalty/program-assets").uploadProgramLogo;
let download: typeof import("../src/lib/loyalty/program-assets").programLogo;
let post: typeof import("../src/app/api/loyalty/organizations/[organizationId]/assets/route").POST;
before(async () => {
  upload = (await import("../src/lib/loyalty/program-assets"))
    .uploadProgramLogo;
  download = (await import("../src/lib/loyalty/program-assets")).programLogo;
  post = (
    await import("../src/app/api/loyalty/organizations/[organizationId]/assets/route")
  ).POST;
});
beforeEach(() => {
  active = true;
  role = "OWNER";
  failProvider = false;
  revokeOnUpload = false;
  failAudit = false;
  calls = 0;
  signedCalls = 0;
  providerKey = null;
  assets = [];
  operations = [];
});

test("invalid file sizes/provider keys and failed DB commits never return usable assets", async () => {
  active = true;
  role = "ADMIN";
  failProvider = false;
  revokeOnUpload = false;
  let read = false;
  class OversizedFile extends File {
    get size() {
      return 4 * 1024 * 1024 + 1;
    }
    async arrayBuffer(): Promise<ArrayBuffer> {
      read = true;
      throw new Error("MUST_NOT_READ");
    }
  }
  const beforeCalls = calls;
  await assert.rejects(
    upload(
      "actor",
      "org",
      randomUUID(),
      new OversizedFile(["synthetic"], "large.png", { type: "image/png" }),
    ),
    /INVALID_INPUT/,
  );
  assert.equal(read, false);
  assert.equal(calls, beforeCalls);
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const file = new File([new Uint8Array(bytes)], "logo.png", {
    type: "image/png",
  });
  const beforeAssets = assets.length,
    beforeOperations = operations.length;
  providerKey = "https://foreign.invalid/file";
  await assert.rejects(
    upload("actor", "org", randomUUID(), file),
    /LOGO_STORAGE_UNAVAILABLE/,
  );
  providerKey = null;
  failAudit = true;
  await assert.rejects(
    upload("actor", "org", randomUUID(), file),
    /AUDIT_FAILED/,
  );
  failAudit = false;
  assert.equal(assets.length, beforeAssets);
  assert.equal(operations.length, beforeOperations);
});

test("private reads validate access, object keys, type, PNG signature and size", async () => {
  active = true; role = "OWNER";
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "blue" } }).png().toBuffer();
  downloadBytes = new Uint8Array(bytes); downloadMode = "ok";
  const asset = { id: randomUUID(), organizationId: "org", storageKey: logoObjectKey("org",randomUUID(),"0".repeat(64)) };
  assets.push(asset);
  const result = await download("actor", "org", asset.id);
  assert.equal(result.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes);
  for (const mode of ["bad-png", "wrong-type", "too-large"]) {
    downloadMode = mode; await assert.rejects(download("actor", "org", asset.id), /LOGO_STORAGE_UNAVAILABLE/);
  }
  const beforeReads = signedCalls, goodKey = asset.storageKey;
  asset.storageKey = "https://foreign.invalid/image";
  await assert.rejects(download("actor", "org", asset.id), /LOGO_STORAGE_UNAVAILABLE/);
  asset.storageKey = goodKey;
  await assert.rejects(download("actor", "org", "../foreign"), /INVALID_INPUT/);
  await assert.rejects(download("actor", "org", "absent"), /NOT_FOUND/);
  active = false; await assert.rejects(download("actor", "org", asset.id), /FORBIDDEN/);
  active = true; role = "STAFF"; await assert.rejects(download("actor", "org", asset.id), /FORBIDDEN/);
  assert.equal(signedCalls, beforeReads); role = "OWNER";
});

test("logos normalize before private upload; replay and provider/revocation failures never claim assets", async () => {
  const bytes = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
  const file = new File([new Uint8Array(bytes)], "input.jpg", {
    type: "image/jpeg",
  });
  const operation = randomUUID();
  const result = await upload("actor", "org", operation, file);
  assert.equal(assets.length, 1);
  assert.deepEqual(await upload("actor", "org", operation, file), result);
  assert.equal(calls, 1);
  failProvider = true;
  await assert.rejects(
    upload("actor", "org", randomUUID(), file),
    /LOGO_STORAGE_UNAVAILABLE/,
  );
  assert.equal(assets.length, 1);
  failProvider = false;
  revokeOnUpload = true;
  await assert.rejects(upload("actor", "org", randomUUID(), file), /FORBIDDEN/);
  assert.equal(assets.length, 1);
  assert.equal(operations.length, 1);
  active = true;
  revokeOnUpload = false;
  role = "STAFF";
  const beforeCalls = calls;
  await assert.rejects(upload("actor", "org", randomUUID(), file), /FORBIDDEN/);
  assert.equal(calls, beforeCalls);
  role = "ADMIN";
  await assert.rejects(
    upload("actor", "foreign", randomUUID(), file),
    /FORBIDDEN/,
  );
  await assert.rejects(
    upload(
      "actor",
      "org",
      randomUUID(),
      new File(["bad"], "bad.png", { type: "image/png" }),
    ),
    /INVALID_INPUT/,
  );
  assert.equal(calls, beforeCalls);
});
test("direct upload HTTP rejects STAFF, foreign tenants, wrong origins and malformed bodies", async () => {
  active = true;
  role = "STAFF";
  process.env.BETTER_AUTH_URL = "https://academy.example.invalid";
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const request = (origin = process.env.BETTER_AUTH_URL!) => {
    const form = new FormData();
    form.set("operationId", randomUUID());
    form.set(
      "file",
      new File([new Uint8Array(bytes)], "logo.png", { type: "image/png" }),
    );
    return new Request(`${process.env.BETTER_AUTH_URL}/api`, {
      method: "POST",
      body: form,
      headers: { origin },
    });
  };
  const context = { params: Promise.resolve({ organizationId: "org" }) };
  assert.equal((await post(request(), context)).status, 403);
  role = "ADMIN";
  assert.equal(
    (
      await post(request(), {
        params: Promise.resolve({ organizationId: "foreign" }),
      })
    ).status,
    403,
  );
  assert.equal(
    (await post(request("https://foreign.invalid"), context)).status,
    403,
  );
  assert.equal(
    (
      await post(
        new Request(`${process.env.BETTER_AUTH_URL}/api`, {
          method: "POST",
          body: "bad",
          headers: { origin: process.env.BETTER_AUTH_URL! },
        }),
        context,
      )
    ).status,
    422,
  );
});
