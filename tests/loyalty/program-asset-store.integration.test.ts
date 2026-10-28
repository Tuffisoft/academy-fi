import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock, test } from "node:test";
import sharp from "sharp";
import { logoObjectKey } from "../../src/lib/loyalty/logo-storage-config";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

// Real DB/guards/services; provider alone simulated. This proves no provider ACL/delivery.
let calls = 0, failProvider = false;
let failDeletion = false;
const deleted: string[] = [];
let afterUpload: (() => Promise<void>) | null = null;
mock.module("../../src/lib/loyalty/logo-storage.ts", { namedExports: {
  deleteLogoObject: async (key: string) => { if (failDeletion) throw new Error("LOGO_STORAGE_UNAVAILABLE"); deleted.push(key); },
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
    const shared = await saveProgram(editor, { organizationId: org, operationId: randomUUID(), config });
    const independent = await Promise.all(Array.from({ length: 20 }, () => saveProgram(editor, { organizationId: org, operationId: randomUUID(), config })));
    const remove = { organizationId: org, operationId: randomUUID(), programId: draft.program.id, expectedRevision: 1, config: { ...config, logoAssetId: null } };
    await Promise.all(Array.from({ length: 20 }, () => saveProgram(editor, remove)));
    assert.equal(deleted.length, 0, "another program still uses the logo");
    assert.equal((await prisma.loyaltyAsset.findUniqueOrThrow({ where: { id: asset.id } })).purpose, "LOGO");
    await Promise.all(independent.map(item => saveProgram(editor, { ...remove, operationId: randomUUID(), programId: item.program.id })));
    assert.equal(deleted.length, 0, "shared reference survives 20 independent concurrent removals");
    const lastRemove = { ...remove, operationId: randomUUID(), programId: shared.program.id };
    failDeletion = true;
    assert.equal((await saveProgram(editor, lastRemove)).cleanupPending, true);
    assert.equal((await readPrograms(editor, org)).cleanupPending, true);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, resultId: asset.id, action: "LOGO_DELETE_PENDING" } }), 1);
    await assert.rejects(saveProgram(editor, { organizationId: org, operationId: randomUUID(), config }), /INVALID_INPUT/);
    await assert.rejects(uploadProgramLogo(editor, org, operation, file), /NOT_FOUND/);
    failDeletion = false;
    await Promise.all(Array.from({ length: 20 }, () => saveProgram(editor, lastRemove)));
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, resultId: asset.id, action: "LOGO_DELETED" } }), 1);
    assert.ok(deleted.length > 0);
    assert.equal((await readPrograms(editor, org)).cleanupPending, false);
    assert.equal((await readPrograms(editor, org, shared.program.id)).programs[0].revision, 2);
    assert.equal((await readPrograms(editor, org, draft.program.id)).programs[0].logoAssetId, null);
    assert.equal(await prisma.loyaltyAsset.count({ where: { id: asset.id } }), 1, "metadata retained for replay protection");
    await assert.rejects(saveProgram(owner, { organizationId: foreign, operationId: randomUUID(), config }), /INVALID_INPUT/);
    await assert.rejects(uploadProgramLogo(owner, org, operation, file), /IDEMPOTENCY_CONFLICT/);
    let releaseFirst = () => {}, releaseSecond = () => {}, readyFirst = () => {}, readySecond = () => {};
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });
    const firstReady = new Promise<void>(resolve => { readyFirst = resolve; });
    const secondReady = new Promise<void>(resolve => { readySecond = resolve; });
    let arrivals = 0;
    afterUpload = async () => { if (++arrivals === 1) { readyFirst(); await firstGate; } else { readySecond(); await secondGate; } };
    const overlapOperation = randomUUID();
    const firstUpload = uploadProgramLogo(editor, org, overlapOperation, file);
    await firstReady;
    const delayedUpload = uploadProgramLogo(editor, org, overlapOperation, file);
    await secondReady;
    releaseFirst();
    const overlapAsset = await firstUpload;
    afterUpload = null;
    const overlapDraft = await saveProgram(editor, { organizationId: org, operationId: randomUUID(), config: { ...config, logoAssetId: overlapAsset.id } });
    await saveProgram(editor, { organizationId: org, operationId: randomUUID(), programId: overlapDraft.program.id, expectedRevision: 1, config: { ...config, logoAssetId: null } });
    const deletionsBeforeLatePut = deleted.length;
    releaseSecond();
    await assert.rejects(delayedUpload, /NOT_FOUND/);
    assert.equal(deleted.length, deletionsBeforeLatePut + 1, "late PUT gets its own committed cleanup");
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, resultId: overlapAsset.id, action: "LOGO_DELETED" } }), 2);
    failProvider = true;
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), file), /LOGO_STORAGE_UNAVAILABLE/);
    failProvider = false;
    afterUpload = async () => { await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: editor } }, data: { status: "REVOKED" } }); };
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), file), /FORBIDDEN/);
    afterUpload = null;
    const beforeReplay = calls;
    await assert.rejects(uploadProgramLogo(editor, org, operation, file), /FORBIDDEN/); assert.equal(calls, beforeReplay);
    assert.equal(await prisma.loyaltyAsset.count({ where: { organizationId: org } }), 2);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 2);
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
