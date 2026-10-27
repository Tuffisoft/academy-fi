import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import sharp from "sharp";
import { logoObjectKey } from "../../src/lib/loyalty/logo-storage-config";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

// Real DB/guards/services; provider alone simulated. This proves no provider ACL/delivery.
let calls = 0, failProvider = false;
let afterUpload: (() => Promise<void>) | null = null;
mock.module("../../src/lib/loyalty/logo-storage.ts", { namedExports: {
  putLogoObject: async (bytes: Uint8Array, org: string, operation: string, fingerprint: string) => {
    calls++;
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format,"png"); assert.equal(metadata.exif,undefined);
    assert.ok(metadata.width!<=1024 && metadata.height!<=1024);
    if(afterUpload) await afterUpload();
    if(failProvider) throw new Error("LOGO_STORAGE_UNAVAILABLE");
    return logoObjectKey(org,operation,fingerprint);
  },
} });

test("real DB: normalized asset commit, replay, foreign asset and revocation during provider I/O", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { uploadProgramLogo } = await import("../../src/lib/loyalty/program-assets");
  const { saveProgram, readPrograms } = await import("../../src/lib/loyalty/programs");
  const owner = randomUUID(), editor = randomUUID(), org = randomUUID(), foreign = randomUUID();
  try {
    await prisma.user.createMany({ data: [owner, editor].map(id => ({ id, name: "Isolated logo DB test", email: `${id}@example.invalid`, role: "CUSTOMER", emailVerified: true })) });
    for (const id of [org, foreign]) await prisma.organization.create({ data: { id, slug: id, name: "Isolated logo DB test", status: "ACTIVE", entitlement: { create: { plan: "FREE" } }, memberships: { create: { userId: owner, role: "OWNER" } } } });
    await prisma.organizationMembership.create({ data: { organizationId: org, userId: editor, role: "ADMIN" } });
    const bytes = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "green" } }).withMetadata().jpeg().toBuffer();
    const file = new File([new Uint8Array(bytes)], "logo.jpg", { type: "image/jpeg" }), operation = randomUUID();
    const asset = await uploadProgramLogo(editor, org, operation, file);
    assert.deepEqual(await uploadProgramLogo(editor, org, operation, file), asset); assert.equal(calls, 1);
    assert.equal(await prisma.loyaltyAsset.count({ where: { organizationId: org } }), 1);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 1);
    assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 1);
    const config = { ...defaultProgram, name: "Logo test", reward: "Coffee", logoAssetId: asset.id };
    const draft = await saveProgram(editor, { organizationId: org, operationId: randomUUID(), config });
    assert.equal((await readPrograms(editor, org, draft.program.id)).programs[0].logoAssetId, asset.id);
    await saveProgram(editor, { organizationId: org, operationId: randomUUID(), programId: draft.program.id, expectedRevision: 1, config: { ...config, logoAssetId: null } });
    assert.equal((await readPrograms(editor, org, draft.program.id)).programs[0].logoAssetId, null);
    assert.equal(await prisma.loyaltyAsset.count({ where: { id: asset.id } }), 1);
    await assert.rejects(saveProgram(owner, { organizationId: foreign, operationId: randomUUID(), config }), /INVALID_INPUT/);
    await assert.rejects(uploadProgramLogo(owner, org, operation, file), /IDEMPOTENCY_CONFLICT/);
    failProvider = true;
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), file), /LOGO_STORAGE_UNAVAILABLE/);
    failProvider = false;
    afterUpload = async () => { await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: editor } }, data: { status: "REVOKED" } }); };
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), file), /FORBIDDEN/);
    afterUpload = null;
    const beforeReplay = calls;
    await assert.rejects(uploadProgramLogo(editor, org, operation, file), /FORBIDDEN/); assert.equal(calls, beforeReplay);
    assert.equal(await prisma.loyaltyAsset.count({ where: { organizationId: org } }), 1);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 1);
  } finally {
    try {
      await prisma.$transaction(async tx => {
        await tx.loyaltyProgram.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.loyaltyAsset.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationAuditLog.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.loyaltyOperation.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationMembership.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organizationEntitlement.deleteMany({ where: { organizationId: { in: [org, foreign] } } });
        await tx.organization.deleteMany({ where: { id: { in: [org, foreign] } } });
        await tx.user.deleteMany({ where: { id: { in: [owner, editor] } } });
      }, { maxWait: 60_000, timeout: 30_000 });
    } finally { await prisma.$disconnect(); }
  }
});
