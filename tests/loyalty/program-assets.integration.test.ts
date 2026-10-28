import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { deleteLogoObject, getLogoObject, logoObjectUrl } from "../../src/lib/loyalty/logo-storage";
import { logoObjectKey } from "../../src/lib/loyalty/logo-storage-config";
import { normalizeLogo } from "../../src/lib/loyalty/logo";
import { boundedBody } from "../../src/lib/loyalty/program-body";
import { databaseIntegrationEnvironment } from "../../scripts/quality-environment.mjs";
import { defaultProgram } from "../../src/lib/loyalty/program-input";

test("real R2 test bucket and DB: private normalized logo, replay, tenant access and cleanup", { timeout: 240_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" }, undefined, "LOYALTY_TEST_DATABASE_URL");
  if (process.env.ACADEMYFI_UPLOAD_TEST !== "1" || !process.env.STEMPELFI_R2_SECRET_ACCESS_KEY) throw new Error("Explicitly confirmed R2 test bucket and ACADEMYFI_UPLOAD_TEST=1 required");
  process.env.DATABASE_URL = process.env.LOYALTY_TEST_DATABASE_URL;
  const { prisma } = await import("../../src/lib/prisma");
  const { uploadProgramLogo, programLogo } = await import("../../src/lib/loyalty/program-assets");
  const { saveProgram, readPrograms } = await import("../../src/lib/loyalty/programs");
  const owner = randomUUID(), editor = randomUUID(), org = randomUUID(), foreign = randomUUID();
  const ownedKeys = new Set<string>();
  const assertDeleted = async (key: string) => {
    const client = new AwsClient({ accessKeyId: process.env.STEMPELFI_R2_ACCESS_KEY_ID!, secretAccessKey: process.env.STEMPELFI_R2_SECRET_ACCESS_KEY!, service: "s3", region: "auto", retries: 0 });
    const request = await client.sign(logoObjectUrl(key), { method: "HEAD" });
    const response = await fetch(request, { redirect: "error", signal: AbortSignal.timeout(15_000) });
    await response.body?.cancel();
    assert.equal(response.status, 404, "authenticated R2 HEAD must confirm deleted object");
  };
  try {
    await prisma.user.createMany({ data: [owner, editor].map(id => ({ id, name: "Isolated logo test", email: `${id}@example.invalid`, role: "CUSTOMER", emailVerified: true })) });
    for (const id of [org, foreign]) await prisma.organization.create({ data: { id, slug: id, name: "Isolated logo test", status: "ACTIVE", entitlement: { create: { plan: "FREE" } }, memberships: { create: { userId: owner, role: "OWNER" } } } });
    await prisma.organizationMembership.create({ data: { organizationId: org, userId: editor, role: "ADMIN" } });
    const bytes = await sharp({ create: { width: 16, height: 8, channels: 3, background: "#17513a" } }).withMetadata().jpeg().toBuffer();
    const file = new File([new Uint8Array(bytes)], "synthetic-logo.jpg", { type: "image/jpeg" });
    const operation = randomUUID();
    const normalized = await normalizeLogo(new Uint8Array(bytes), "image/jpeg");
    ownedKeys.add(logoObjectKey(org, operation, createHash("sha256").update(normalized).digest("hex")));
    const result = await uploadProgramLogo(editor, org, operation, file);
    const asset = await prisma.loyaltyAsset.findUniqueOrThrow({ where: { id: result.id } });
    ownedKeys.add(asset.storageKey);
    assert.equal(asset.organizationId, org); assert.equal(asset.mediaType, "image/png");
    assert.deepEqual(await uploadProgramLogo(editor, org, operation, file), result);
    assert.equal(await prisma.loyaltyAsset.count({ where: { organizationId: org } }), 1);
    assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 1);
    assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "LOGO_UPLOAD" } }), 1);
    const retrieved = await programLogo(editor, org, asset.id);
    const metadata = await sharp(new Uint8Array(await retrieved.arrayBuffer())).metadata();
    assert.equal(metadata.format, "png"); assert.equal(metadata.width, 16); assert.equal(metadata.height, 8);
    assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
    const unsigned = logoObjectUrl(asset.storageKey);
    const anonymous = await fetch(unsigned, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const denial = (await boundedBody(anonymous, 8192)).toString("utf8");
    // R2 returns 400 InvalidArgument naming Authorization when no signature is provided.
    const missingAuthentication = anonymous.status === 400 && /<Code>InvalidArgument<\/Code>/.test(denial) && /authorization|authentication|credential/i.test(denial);
    assert.ok([401, 403, 404].includes(anonymous.status) || missingAuthentication, `Private logo must reject unsigned access (HTTP ${anonymous.status})`);
    const draft = await saveProgram(editor, { organizationId: org, operationId: randomUUID(), config: { ...defaultProgram, name: "Logo test", reward: "Coffee", logoAssetId: asset.id } });
    assert.equal((await readPrograms(editor, org, draft.program.id)).programs[0].logoAssetId, asset.id);
    await assert.rejects(programLogo(owner, foreign, asset.id), /NOT_FOUND/);
    await assert.rejects(uploadProgramLogo(editor, foreign, randomUUID(), file), /FORBIDDEN/);
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), new File(["invalid"], "invalid.png", { type: "image/png" })), /LOGO_INVALID/);
    const changed = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
    await assert.rejects(uploadProgramLogo(editor, org, operation, new File([new Uint8Array(changed)], "changed.png", { type: "image/png" })), /IDEMPOTENCY_CONFLICT/);
    const replacementOperation = randomUUID();
    const replacementBytes = await normalizeLogo(new Uint8Array(changed), "image/png");
    const replacementKey = logoObjectKey(org, replacementOperation, createHash("sha256").update(replacementBytes).digest("hex"));
    ownedKeys.add(replacementKey);
    const replacement = await uploadProgramLogo(editor, org, replacementOperation, new File([new Uint8Array(changed)], "replacement.png", { type: "image/png" }));
    const beforeSave = await getLogoObject(asset.storageKey);
    assert.ok(beforeSave.ok, "selection alone retains old logo"); await beforeSave.body?.cancel();
    const replacementConfig = { ...defaultProgram, name: "Logo test", reward: "Coffee", logoAssetId: replacement.id };
    const replaceCommand = { organizationId: org, operationId: randomUUID(), programId: draft.program.id, expectedRevision: 1, config: replacementConfig };
    assert.equal((await saveProgram(editor, replaceCommand)).cleanupPending, false);
    await assertDeleted(asset.storageKey);
    const kept = await getLogoObject(replacementKey); assert.ok(kept.ok); await kept.body?.cancel();
    assert.equal((await saveProgram(editor, replaceCommand)).program.revision, 2);
    await assert.rejects(uploadProgramLogo(editor, org, operation, file), /NOT_FOUND/);
    const remove = { ...replaceCommand, operationId: randomUUID(), expectedRevision: 2, config: { ...replacementConfig, logoAssetId: null } };
    await Promise.all(Array.from({ length: 20 }, () => saveProgram(editor, remove)));
    await assertDeleted(replacementKey);
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: editor } }, data: { role: "STAFF" } });
    await assert.rejects(uploadProgramLogo(editor, org, randomUUID(), file), /FORBIDDEN/);
    await assert.rejects(programLogo(editor, org, asset.id), /FORBIDDEN/);
    await prisma.organizationMembership.update({ where: { organizationId_userId: { organizationId: org, userId: editor } }, data: { role: "ADMIN", status: "REVOKED" } });
    await assert.rejects(uploadProgramLogo(editor, org, operation, file), /FORBIDDEN/);
    await assert.rejects(programLogo(editor, org, asset.id), /FORBIDDEN/);
  } finally {
    try {
      const assets = await prisma.loyaltyAsset.findMany({ where: { organizationId: { in: [org, foreign] } }, select: { storageKey: true } });
      assets.forEach(asset => ownedKeys.add(asset.storageKey));
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
      if (ownedKeys.size) {
        for (const key of ownedKeys) await deleteLogoObject(key);
      }
    } finally { await prisma.$disconnect(); }
  }
});
