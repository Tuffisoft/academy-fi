import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getOrganizationContext } from "./organizations";
import { programCommand, programConfig, programLifecycleCommand, programReadRequest, programStatus, resourceId, storedProgramConfig, type ProgramView, type ProgramStateView } from "./program-input";
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
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "REVISION_CONFLICT" | "IDEMPOTENCY_CONFLICT" | "LOGO_TOO_LARGE" | "LOGO_UNSUPPORTED" | "LOGO_INVALID" | "PROGRAM_LIMIT" | "STATE_CONFLICT" | "CONDITIONS_BOUND") { super(code); }
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
  textColor: true, symbol: true, logoAssetId: true, revision: true, status: true, blockedAt: true, conditionsBoundAt: true } as const;
function view(row: { symbol: string; status: string; blockedAt: Date | null; conditionsBoundAt: Date | null } & Omit<ProgramView, "symbol">): ProgramStateView {
  // Preserve earlier stored targets for explicit correction; never relax writes.
  const parsed = storedProgramConfig.parse({ name: row.name, description: row.description, reward: row.reward,
    target: row.target, backgroundColor: row.backgroundColor, textColor: row.textColor, symbol: row.symbol, logoAssetId: row.logoAssetId });
  return { ...parsed, id: row.id, revision: row.revision, status: programStatus.parse(row.status),
    blockedAt: row.blockedAt?.toISOString() ?? null, conditionsBoundAt: row.conditionsBoundAt?.toISOString() ?? null };
}
export async function readPrograms(actorId: string, organizationId: string, programId?: string, after?: string) {
  if (!resourceId.safeParse(actorId).success || !programReadRequest.safeParse({ organizationId, programId, after }).success) throw new ProgramError("INVALID_INPUT");
  return programTransaction(async tx => {
    await programAccess(tx, actorId, organizationId);
    const rows = await tx.loyaltyProgram.findMany({ where: { organizationId, ...(programId ? { id: programId } : {}), ...(after ? { id: { gt: after } } : {}) },
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
      const row = await tx.loyaltyProgram.findFirst({ where: { id: previous.resultId, organizationId: input.organizationId }, select: selection });
      if (!row) throw new ProgramError("NOT_FOUND");
      return { program: view(row), replayed: true };
    }
    if (input.config.logoAssetId && !await tx.loyaltyAsset.findFirst({ where: { id: input.config.logoAssetId, organizationId: input.organizationId, purpose: "LOGO", mediaType: "image/png" } })) throw new ProgramError("INVALID_INPUT");
    if (input.config.logoAssetId && await logoRetired(tx, input.organizationId, input.config.logoAssetId)) throw new ProgramError("INVALID_INPUT");
    let oldLogo: string | null = null;
    if (input.programId) {
      await tx.$queryRaw`SELECT "id" FROM "LoyaltyProgram" WHERE "id" = ${input.programId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
      const current = await tx.loyaltyProgram.findFirst({ where: { id: input.programId, organizationId: input.organizationId } });
      if (!current) throw new ProgramError("NOT_FOUND");
      if (current.revision !== input.expectedRevision) throw new ProgramError("REVISION_CONFLICT");
      if (current.conditionsBoundAt && (current.target !== input.config.target || current.reward !== input.config.reward)) throw new ProgramError("CONDITIONS_BOUND");
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
      action: "PROGRAM_SAVE", targetId: row.id, reason: "Program configuration saved" } });
    return { program: view(row), replayed: false };
  });
  return { ...result, cleanupPending: await cleanupLogos(actorId, input.organizationId) };
}

/** Explicit lifecycle writes; adapters must obtain actorId from the server session. */
export async function changeProgramLifecycle(actorId: string, raw: unknown) {
  const parsed = programLifecycleCommand.safeParse(raw);
  if (!resourceId.safeParse(actorId).success || !parsed.success) throw new ProgramError("INVALID_INPUT");
  const input = parsed.data;
  const action = `PROGRAM_${input.action}`;
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return programTransaction(async tx => {
    const context = await programAccess(tx, actorId, input.organizationId);
    await tx.$queryRaw`SELECT "id" FROM "LoyaltyProgram" WHERE "id" = ${input.programId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
    const current = await tx.loyaltyProgram.findFirst({ where: { id: input.programId, organizationId: input.organizationId }, select: selection });
    if (!current) throw new ProgramError("NOT_FOUND");
    const previous = await tx.loyaltyOperation.findUnique({ where: { organizationId_operationId: { organizationId: input.organizationId, operationId: input.operationId } } });
    if (previous) {
      if (previous.actorId !== actorId || previous.action !== action || previous.fingerprint !== fingerprint) throw new ProgramError("IDEMPOTENCY_CONFLICT");
      return { program: view(current), replayed: true };
    }
    if (current.revision !== input.expectedRevision) throw new ProgramError("REVISION_CONFLICT");
    const status = programStatus.parse(current.status);
    const activating = input.action === "PUBLISH" || input.action === "REACTIVATE";
    if ((input.action === "PUBLISH" && status !== "DRAFT") ||
        (input.action === "REACTIVATE" && status !== "ARCHIVED") ||
        (input.action === "ARCHIVE" && status === "ARCHIVED")) throw new ProgramError("STATE_CONFLICT");
    if (activating) {
      // Validate the persisted configuration, never unsaved client input.
      const config = { name: current.name, description: current.description, reward: current.reward,
        target: current.target, backgroundColor: current.backgroundColor, textColor: current.textColor,
        symbol: current.symbol, logoAssetId: current.logoAssetId };
      if (!programConfig.safeParse(config).success) throw new ProgramError("INVALID_INPUT");
      if (current.logoAssetId && (await logoRetired(tx, input.organizationId, current.logoAssetId) ||
          !await tx.loyaltyAsset.findFirst({ where: { id: current.logoAssetId, organizationId: input.organizationId, purpose: "LOGO", mediaType: "image/png" } }))) throw new ProgramError("INVALID_INPUT");
      const count = await tx.loyaltyProgram.count({ where: { organizationId: input.organizationId, status: "PUBLISHED" } });
      if (context.limits.programs !== null && count >= context.limits.programs) throw new ProgramError("PROGRAM_LIMIT");
    }
    const unchanged = (input.action === "BLOCK" && current.blockedAt !== null) || (input.action === "UNBLOCK" && current.blockedAt === null);
    const row = unchanged ? current : await tx.loyaltyProgram.update({ where: { id: current.id }, data: {
      ...(activating ? { status: "PUBLISHED" } : input.action === "ARCHIVE" ? { status: "ARCHIVED" } : {}),
      ...(input.action === "BLOCK" ? { blockedAt: new Date() } : input.action === "UNBLOCK" ? { blockedAt: null } : {}),
      revision: { increment: 1 },
    }, select: selection });
    await tx.loyaltyOperation.create({ data: { organizationId: input.organizationId, actorId, operationId: input.operationId, action, fingerprint, resultId: row.id } });
    if (!unchanged) await tx.organizationAuditLog.create({ data: { organizationId: input.organizationId, actorId, actorMembershipId: context.membershipId,
      action, targetId: row.id, reason: `Program lifecycle: ${input.action}` } });
    return { program: view(row), replayed: false, unchanged };
  });
}

/** Server-internal issuance primitive. Caller owns the organization lock and issuance transaction. */
export async function bindProgramConditions(tx: Prisma.TransactionClient, organizationId: string, programId: string) {
  if (!resourceId.safeParse(organizationId).success || !resourceId.safeParse(programId).success) throw new ProgramError("INVALID_INPUT");
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "LoyaltyProgram" WHERE "id" = ${programId} AND "organizationId" = ${organizationId} FOR UPDATE`;
  const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { status: true } });
  const current = await tx.loyaltyProgram.findFirst({ where: { id: programId, organizationId }, select: selection });
  if (!current) throw new ProgramError("NOT_FOUND");
  if (organization?.status !== "ACTIVE" || current.status !== "PUBLISHED" || current.blockedAt) throw new ProgramError("STATE_CONFLICT");
  if (current.conditionsBoundAt) return view(current);
  return view(await tx.loyaltyProgram.update({ where: { id: current.id }, data: { conditionsBoundAt: new Date(), revision: { increment: 1 } }, select: selection }));
}
