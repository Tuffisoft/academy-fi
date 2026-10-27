import "server-only";
import { createHash } from "node:crypto";
import { UTApi, UTFile } from "uploadthing/server";
import { prisma } from "@/lib/prisma";
import { ProgramError, programAccess, programTransactionOptions } from "./programs";
import { operationId as operationSchema } from "./program-input";
import { normalizeLogo } from "./logo";

export async function uploadProgramLogo(actorId: string, organizationId: string, operationId: string, file: File) {
  const parsed = operationSchema.safeParse(operationId);
  if (!parsed.success) throw new ProgramError("INVALID_INPUT");
  await prisma.$transaction(tx => programAccess(tx, actorId, organizationId), programTransactionOptions);
  let normalized: Buffer;
  try { normalized = await normalizeLogo(new Uint8Array(await file.arrayBuffer()), file.type); }
  catch { throw new ProgramError("INVALID_INPUT"); }
  const fingerprint = createHash("sha256").update(normalized).digest("hex");
  const key = { organizationId, actorId, operationId: parsed.data };
  const previous = await prisma.loyaltyOperation.findUnique({ where: { organizationId_operationId: { organizationId: key.organizationId, operationId: key.operationId } } });
  const replay = async () => prisma.$transaction(async tx => {
    await programAccess(tx, actorId, organizationId);
    const prior = await tx.loyaltyOperation.findUnique({ where: { organizationId_operationId: { organizationId: key.organizationId, operationId: key.operationId } } });
    if (!prior) return null;
    if (prior.actorId !== actorId || prior.action !== "LOGO_UPLOAD" || prior.fingerprint !== fingerprint) throw new ProgramError("IDEMPOTENCY_CONFLICT");
    const asset = await tx.loyaltyAsset.findFirst({ where: { id: prior.resultId, organizationId } });
    if (!asset) throw new ProgramError("NOT_FOUND");
    return { id: asset.id };
  }, programTransactionOptions);
  if (previous) return (await replay())!;
  const api = new UTApi();
  const uploaded = await api.uploadFiles(new UTFile([new Uint8Array(normalized)], "logo.png", { type: "image/png" }), { acl: "private" });
  if (uploaded.error || !uploaded.data) throw new Error("LOGO_STORAGE_UNAVAILABLE");
  const storageKey = uploaded.data.key;
  // Provider I/O stays outside transactions. Unreferenced private files are retained on ambiguous DB outcomes;
  // deleting here could destroy a successfully committed logo after a connection failure.
  return prisma.$transaction(async tx => {
    const context = await programAccess(tx, actorId, organizationId);
    const prior = await tx.loyaltyOperation.findUnique({ where: { organizationId_operationId: { organizationId: key.organizationId, operationId: key.operationId } } });
    if (prior) {
      if (prior.actorId !== actorId || prior.action !== "LOGO_UPLOAD" || prior.fingerprint !== fingerprint) throw new ProgramError("IDEMPOTENCY_CONFLICT");
      return { id: prior.resultId };
    }
    const asset = await tx.loyaltyAsset.create({ data: { organizationId, storageKey } });
    await tx.loyaltyOperation.create({ data: { ...key, action: "LOGO_UPLOAD", fingerprint, resultId: asset.id } });
    await tx.organizationAuditLog.create({ data: { organizationId, actorId, actorMembershipId: context.membershipId,
      action: "LOGO_UPLOAD", targetId: asset.id, reason: "Normalized private logo stored" } });
    return { id: asset.id };
  }, programTransactionOptions);
}
export async function programLogo(actorId: string, organizationId: string, assetId: string) {
  const asset = await prisma.$transaction(async tx => {
    await programAccess(tx, actorId, organizationId);
    const row = await tx.loyaltyAsset.findFirst({ where: { id: assetId, organizationId, purpose: "LOGO", mediaType: "image/png" } });
    if (!row) throw new ProgramError("NOT_FOUND");
    return row;
  }, programTransactionOptions);
  // No client URL is fetched. The SDK signs a DB-owned provider key; the private image is proxied.
  const { ufsUrl } = await new UTApi().generateSignedURL(asset.storageKey, { expiresIn: 60 });
  const response = await fetch(ufsUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("LOGO_STORAGE_UNAVAILABLE");
  return response;
}
