import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  ProgramError,
  programAccess,
  programTransactionOptions,
} from "./programs";
import { operationId as operationSchema, resourceId } from "./program-input";
import { normalizeLogo, maxLogoBytes } from "./logo";
import { boundedBody } from "./program-body";

import { getLogoObject, putLogoObject } from "./logo-storage";
import { logoObjectKeySchema } from "./logo-storage-config";

export async function uploadProgramLogo(
  actorId: string,
  organizationId: string,
  operationId: string,
  file: File,
) {
  const parsed = operationSchema.safeParse(operationId);
  if (
    !parsed.success ||
    !(file instanceof File) ||
    !file.size ||
    file.size > maxLogoBytes ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new ProgramError("INVALID_INPUT");
  await prisma.$transaction(
    (tx) => programAccess(tx, actorId, organizationId),
    programTransactionOptions,
  );
  let normalized: Buffer;
  try {
    normalized = await normalizeLogo(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
  } catch {
    throw new ProgramError("INVALID_INPUT");
  }
  const fingerprint = createHash("sha256").update(normalized).digest("hex");
  const key = { organizationId, actorId, operationId: parsed.data };
  const previous = await prisma.loyaltyOperation.findUnique({
    where: {
      organizationId_operationId: {
        organizationId: key.organizationId,
        operationId: key.operationId,
      },
    },
  });
  const replay = async () =>
    prisma.$transaction(async (tx) => {
      await programAccess(tx, actorId, organizationId);
      const prior = await tx.loyaltyOperation.findUnique({
        where: {
          organizationId_operationId: {
            organizationId: key.organizationId,
            operationId: key.operationId,
          },
        },
      });
      if (!prior) return null;
      if (
        prior.actorId !== actorId ||
        prior.action !== "LOGO_UPLOAD" ||
        prior.fingerprint !== fingerprint
      )
        throw new ProgramError("IDEMPOTENCY_CONFLICT");
      const asset = await tx.loyaltyAsset.findFirst({
        where: { id: prior.resultId, organizationId },
      });
      if (!asset) throw new ProgramError("NOT_FOUND");
      return { id: asset.id };
    }, programTransactionOptions);
  if (previous) return (await replay())!;
  const storageKey = await putLogoObject(
    new Uint8Array(normalized),
    organizationId,
    parsed.data,
    fingerprint,
  );
  if (!logoObjectKeySchema.safeParse(storageKey).success)
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  // Provider I/O stays outside transactions. Unreferenced private files are retained on ambiguous DB outcomes;
  // deleting here could destroy a successfully committed logo after a connection failure.
  return prisma.$transaction(async (tx) => {
    const context = await programAccess(tx, actorId, organizationId);
    const prior = await tx.loyaltyOperation.findUnique({
      where: {
        organizationId_operationId: {
          organizationId: key.organizationId,
          operationId: key.operationId,
        },
      },
    });
    if (prior) {
      if (
        prior.actorId !== actorId ||
        prior.action !== "LOGO_UPLOAD" ||
        prior.fingerprint !== fingerprint
      )
        throw new ProgramError("IDEMPOTENCY_CONFLICT");
      return { id: prior.resultId };
    }
    const asset = await tx.loyaltyAsset.create({
      data: { organizationId, storageKey },
    });
    await tx.loyaltyOperation.create({
      data: { ...key, action: "LOGO_UPLOAD", fingerprint, resultId: asset.id },
    });
    await tx.organizationAuditLog.create({
      data: {
        organizationId,
        actorId,
        actorMembershipId: context.membershipId,
        action: "LOGO_UPLOAD",
        targetId: asset.id,
        reason: "Normalized private logo stored",
      },
    });
    return { id: asset.id };
  }, programTransactionOptions);
}
export async function programLogo(
  actorId: string,
  organizationId: string,
  assetId: string,
) {
  if (!resourceId.safeParse(assetId).success)
    throw new ProgramError("INVALID_INPUT");
  const asset = await prisma.$transaction(async (tx) => {
    await programAccess(tx, actorId, organizationId);
    const row = await tx.loyaltyAsset.findFirst({
      where: {
        id: assetId,
        organizationId,
        purpose: "LOGO",
        mediaType: "image/png",
      },
    });
    if (!row) throw new ProgramError("NOT_FOUND");
    return row;
  }, programTransactionOptions);
  // Signed server-side R2 read after current tenant authorization; no client URL.
  if (!logoObjectKeySchema.safeParse(asset.storageKey).success)
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  const response = await getLogoObject(asset.storageKey);
  if (
    !response.ok ||
    response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
      "image/png"
  )
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  let bytes: Buffer;
  try {
    bytes = await boundedBody(response, 8 * 1024 * 1024);
  } catch {
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  }
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/png" },
  });
}
