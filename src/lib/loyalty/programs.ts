import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getOrganizationContext } from "./organizations";
import { programCommand, programReadRequest, resourceId, storedProgramConfig, type ProgramView } from "./program-input";
import { deleteLogoObject } from "./logo-storage";
import { logoObjectKeySchema } from "./logo-storage-config";

const pendingLogoDeletion = "LOGO_DELETE_PENDING";

export async function logoRetired(tx: Prisma.TransactionClient, organizationId: string, assetId: string) {
  return !!await tx.loyaltyOperation.findFirst({ where: { organizationId, resultId: assetId, action: { in: [pendingLogoDeletion, "LOGO_DELETED"] } } });
}

// Committed work items prevent reattachment. Keep completed items for replay protection.
export async function cleanupLogos(actorId: string, organizationId: string) {
  try {
    const jobs = await programTransaction(async tx => {
      await programAccess(tx, actorId, organizationId);
      return tx.loyaltyOperation.findMany({ where: { organizationId, action: pendingLogoDeletion }, orderBy: { createdAt: "asc" }, take: 20 });
    });
    for (const job of jobs) {
      const asset = await prisma.loyaltyAsset.findFirst({ where: { id: job.resultId, organizationId, purpose: "LOGO" } });
      if (!asset || createHash("sha256").update(asset.storageKey).digest("hex") !== job.fingerprint) return true;
      if (!logoObjectKeySchema.safeParse(asset.storageKey).success || !asset.storageKey.startsWith(`stempelfi/logos/${organizationId}/`)) return true;
      await deleteLogoObject(asset.storageKey);
      await prisma.loyaltyOperation.updateMany({ where: { id: job.id, organizationId, action: pendingLogoDeletion }, data: { action: "LOGO_DELETED" } });
    }
    return !!await prisma.loyaltyOperation.findFirst({ where: { organizationId, action: pendingLogoDeletion }, select: { id: true } });
  } catch {
    // Save already committed. Preserve the durable work item and disclose the failure.
    return true;
  }
}

// Match the existing membership workflow's bounded wait for 20-way DB contention.
export const programTransactionOptions = { maxWait: 60_000, timeout: 30_000 };

async function programTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, programTransactionOptions); }
    catch (error) {
      if (attempt < 2 && typeof error === "object" && error !== null && "code" in error && error.code === "P2034") continue;
      throw error;
    }
  }
}

export class ProgramError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "REVISION_CONFLICT" | "IDEMPOTENCY_CONFLICT" | "LOGO_TOO_LARGE" | "LOGO_UNSUPPORTED" | "LOGO_INVALID") { super(code); }
}
export async function programAccess(tx: Prisma.TransactionClient, actorId: string, organizationId: string) {
  if (!resourceId.safeParse(actorId).success || !resourceId.safeParse(organizationId).success) throw new ProgramError("INVALID_INPUT");
  // Same lock order as membership changes: organization, identity, membership.
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${actorId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "OrganizationMembership" WHERE "organizationId" = ${organizationId} AND "userId" = ${actorId} FOR UPDATE`;
  const context = await getOrganizationContext(actorId, organizationId, tx);
  if (context.role !== "OWNER" && context.role !== "ADMIN") throw new ProgramError("FORBIDDEN");
  return context;
}
const selection = { id: true, name: true, description: true, reward: true, target: true, backgroundColor: true,
  textColor: true, symbol: true, logoAssetId: true, revision: true } as const;
function view(row: { symbol: string } & Omit<ProgramView, "symbol">): ProgramView {
  // Preserve earlier stored targets for explicit correction; never relax writes.
  const parsed = storedProgramConfig.parse({ name: row.name, description: row.description, reward: row.reward,
    target: row.target, backgroundColor: row.backgroundColor, textColor: row.textColor, symbol: row.symbol, logoAssetId: row.logoAssetId });
  return { ...parsed, id: row.id, revision: row.revision };
}
export async function readPrograms(actorId: string, organizationId: string, programId?: string, after?: string) {
  if (!resourceId.safeParse(actorId).success || !programReadRequest.safeParse({ organizationId, programId, after }).success) throw new ProgramError("INVALID_INPUT");
  return programTransaction(async tx => {
    await programAccess(tx, actorId, organizationId);
    const rows = await tx.loyaltyProgram.findMany({ where: { organizationId, status: "DRAFT", ...(programId ? { id: programId } : {}), ...(after ? { id: { gt: after } } : {}) },
      select: selection, orderBy: { id: "asc" }, take: programId ? 1 : 51 });
    if (programId && !rows.length) throw new ProgramError("NOT_FOUND");
    const cleanupPending = !!await tx.loyaltyOperation.findFirst({ where: { organizationId, action: pendingLogoDeletion }, select: { id: true } });
    return { programs: rows.slice(0, 50).map(view), next: rows.length > 50 ? rows[49].id : null, cleanupPending };
  });
}
export async function saveProgram(actorId: string, raw: unknown) {
  const parsed = programCommand.safeParse(raw);
  if (!resourceId.safeParse(actorId).success || !parsed.success) throw new ProgramError("INVALID_INPUT");
  const input = parsed.data;
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const result = await programTransaction(async tx => {
    const context = await programAccess(tx, actorId, input.organizationId);
    const key = { organizationId: input.organizationId, actorId, operationId: input.operationId };
    const previous = await tx.loyaltyOperation.findUnique({ where: { organizationId_operationId: { organizationId: key.organizationId, operationId: key.operationId } } });
    if (previous) {
      if (previous.actorId !== actorId || previous.action !== "PROGRAM_SAVE" || previous.fingerprint !== fingerprint) throw new ProgramError("IDEMPOTENCY_CONFLICT");
      const row = await tx.loyaltyProgram.findFirst({ where: { id: previous.resultId, organizationId: input.organizationId, status: "DRAFT" }, select: selection });
      if (!row) throw new ProgramError("NOT_FOUND");
      return { program: view(row), replayed: true };
    }
    if (input.config.logoAssetId && !await tx.loyaltyAsset.findFirst({ where: { id: input.config.logoAssetId, organizationId: input.organizationId, purpose: "LOGO", mediaType: "image/png" } })) throw new ProgramError("INVALID_INPUT");
    if (input.config.logoAssetId && await logoRetired(tx, input.organizationId, input.config.logoAssetId)) throw new ProgramError("INVALID_INPUT");
    let oldLogo: string | null = null;
    if (input.programId) {
      const current = await tx.loyaltyProgram.findFirst({ where: { id: input.programId, organizationId: input.organizationId, status: "DRAFT" } });
      if (!current) throw new ProgramError("NOT_FOUND");
      if (current.revision !== input.expectedRevision) throw new ProgramError("REVISION_CONFLICT");
      oldLogo = current.logoAssetId;
    }
    const row = input.programId
      ? await tx.loyaltyProgram.update({ where: { id: input.programId }, data: { ...input.config, revision: { increment: 1 } }, select: selection })
      : await tx.loyaltyProgram.create({ data: { ...input.config, organizationId: input.organizationId }, select: selection });
    if (oldLogo && oldLogo !== row.logoAssetId && !await tx.loyaltyProgram.findFirst({ where: { organizationId: input.organizationId, logoAssetId: oldLogo } })) {
      const asset = await tx.loyaltyAsset.findFirst({ where: { id: oldLogo, organizationId: input.organizationId, purpose: "LOGO" } });
      if (!asset) throw new ProgramError("INVALID_INPUT");
      await tx.loyaltyOperation.create({ data: { organizationId: input.organizationId, actorId, operationId: randomUUID(), action: pendingLogoDeletion, resultId: oldLogo, fingerprint: createHash("sha256").update(asset.storageKey).digest("hex") } });
    }
    await tx.loyaltyOperation.create({ data: { ...key, action: "PROGRAM_SAVE", fingerprint, resultId: row.id } });
    await tx.organizationAuditLog.create({ data: { organizationId: input.organizationId, actorId, actorMembershipId: context.membershipId,
      action: "PROGRAM_SAVE", targetId: row.id, reason: "Program draft saved" } });
    return { program: view(row), replayed: false };
  });
  return { ...result, cleanupPending: await cleanupLogos(actorId, input.organizationId) };
}
