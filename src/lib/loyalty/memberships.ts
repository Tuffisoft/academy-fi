import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getOrganizationContext, OrganizationAccessError } from "./organizations";
import { membershipCapacity } from "./membership-capacity";

type Tx = Prisma.TransactionClient;
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/);
const operation = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).transform(value => value.toLowerCase());
const base = { organizationId: id, operationId: operation };
const role = z.enum(["ADMIN", "STAFF"]);
export const membershipRequest = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("INVITE"), email: z.string().trim().toLowerCase().email().max(254), role }).strict(),
  z.object({ ...base, action: z.literal("ACCEPT"), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict(),
  z.object({ ...base, action: z.literal("REVOKE_INVITATION"), invitationId: id }).strict(),
  z.object({ ...base, action: z.literal("ROTATE_INVITATION"), invitationId: id }).strict(),
  z.object({ ...base, action: z.literal("CHANGE_ROLE"), userId: id, role }).strict(),
  z.object({ ...base, action: z.literal("REMOVE_MEMBER"), userId: id }).strict(),
  z.object({ ...base, action: z.literal("TRANSFER_OWNER"), userId: id }).strict(),
]);
type Request = z.infer<typeof membershipRequest>;
export type MembershipDelivery = { invitationId: string; organizationId: string; attemptId: string; to: string; token: string; expiresAt: Date };
// Server-only result. Delivery material must never be returned by an action/HTTP endpoint.
export type MembershipResult = { resultId: string; replayed: boolean; delivery?: MembershipDelivery };
export class MembershipError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "INVALID_INVITATION" | "FORBIDDEN" | "LIMIT_REACHED" | "CONFLICT" | "RATE_LIMITED") { super(code); }
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const forbidden = () => { throw new MembershipError("FORBIDDEN"); };
const invalidInvitation = () => { throw new MembershipError("INVALID_INVITATION"); };
function manage(actorRole: string, targetRole: string) {
  if (actorRole !== "OWNER" && !(actorRole === "ADMIN" && targetRole === "STAFF")) forbidden();
}

async function account(tx: Tx, actorId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, banned: true, email: true, emailVerified: true } });
  if (!actor || actor.banned || !["OWNER", "INTERN", "CUSTOMER"].includes(actor.role)) return forbidden();
  return actor;
}
async function locks(tx: Tx, actorId: string, input: Request) {
  await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${input.organizationId} FOR UPDATE`;
  const targetId = "userId" in input ? input.userId : actorId;
  await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" IN (${actorId}, ${targetId}) ORDER BY "id" FOR UPDATE`;
  await tx.$queryRaw`SELECT "id" FROM "OrganizationMembership" WHERE "organizationId" = ${input.organizationId} ORDER BY "id" FOR UPDATE`;
}
async function audit(tx: Tx, actorId: string, input: Request, resultId: string, membershipId?: string) {
  await tx.organizationAuditLog.create({ data: {
    organizationId: input.organizationId, actorId, actorMembershipId: membershipId,
    action: input.action, targetId: resultId, reason: "Membership workflow: " + input.action,
  } });
}
async function mailLimit(tx: Tx, actorId: string, input: Request, now: Date, invitationId?: string) {
  const since = new Date(now.getTime() - 3_600_000);
  const where = { organizationId: input.organizationId, action: { in: ["INVITE", "ROTATE_INVITATION"] }, createdAt: { gte: since } };
  if (await tx.organizationOperation.count({ where }) >= 50 ||
      await tx.organizationOperation.count({ where: { ...where, actorId } }) >= 20) throw new MembershipError("RATE_LIMITED");
  if (input.action === "INVITE" && await tx.organizationInvitation.count({ where: { organizationId: input.organizationId, email: input.email, createdAt: { gte: since } } }) >= 5) throw new MembershipError("RATE_LIMITED");
  if (invitationId && await tx.organizationOperation.count({ where: { ...where, resultId: invitationId } }) >= 5) throw new MembershipError("RATE_LIMITED");
}

async function perform(tx: Tx, actorId: string, input: Request): Promise<MembershipResult> {
  await locks(tx, actorId, input);
  const actor = await account(tx, actorId);
  const organization = await tx.organization.findUnique({ where: { id: input.organizationId }, select: { status: true } });
  if (!organization || organization.status !== "ACTIVE") return forbidden();
  // A prospective recipient has no membership yet. Every management path requires one.
  const context = input.action === "ACCEPT" ? null : await getOrganizationContext(actorId, input.organizationId, tx);
  const manager = () => { if (!context) return forbidden(); return context; };
  const fingerprint = digest(JSON.stringify(input));
  const key = { organizationId: input.organizationId, actorId, operationId: input.operationId };
  const previous = await tx.organizationOperation.findUnique({ where: { organizationId_actorId_operationId: key } });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new MembershipError("CONFLICT");
    if (input.action === "ACCEPT") {
      // Token replay cannot restore an access revoked since the original acceptance.
      const accepted = await tx.organizationInvitation.findFirst({ where: { id: previous.resultId, organizationId: input.organizationId, acceptedById: actorId, tokenHash: digest(input.token), status: "ACCEPTED" } });
      const active = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: input.organizationId, userId: actorId } } });
      if (!accepted || !actor.emailVerified || actor.email.trim().toLowerCase() !== accepted.email || active?.status !== "ACTIVE") return invalidInvitation();
    }
    return { resultId: previous.resultId, replayed: true };
  }
  const capacity = await membershipCapacity(tx, input.organizationId);
  let resultId: string;
  let delivery: MembershipDelivery | undefined;

  if (input.action === "INVITE") {
    manage(manager().role, input.role);
    const existing = await tx.organizationMembership.findFirst({ where: { organizationId: input.organizationId, status: "ACTIVE", user: { email: { equals: input.email, mode: "insensitive" } } } });
    if (existing || await tx.organizationInvitation.findFirst({ where: { organizationId: input.organizationId, email: input.email, status: "PENDING" } })) throw new MembershipError("CONFLICT");
    if (capacity.occupied >= manager().limits.users) throw new MembershipError("LIMIT_REACHED");
    await mailLimit(tx, actorId, input, capacity.now);
    const token = randomBytes(32).toString("base64url"), attemptId = randomUUID();
    const invitation = await tx.organizationInvitation.create({ data: {
      organizationId: input.organizationId, email: input.email, role: input.role,
      tokenHash: digest(token), createdById: actorId, deliveryAttemptId: attemptId,
      createdAt: capacity.now, expiresAt: new Date(capacity.now.getTime() + 7 * 86_400_000),
    } });
    resultId = invitation.id;
    delivery = { organizationId: input.organizationId, invitationId: resultId, attemptId, to: input.email, token, expiresAt: invitation.expiresAt };
  } else if (input.action === "ACCEPT") {
    const invitation = await tx.organizationInvitation.findFirst({ where: { organizationId: input.organizationId, tokenHash: digest(input.token) } });
    if (!invitation || !actor.emailVerified || actor.email.trim().toLowerCase() !== invitation.email) return invalidInvitation();
    if (invitation.status === "ACCEPTED") {
      const current = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: input.organizationId, userId: actorId } } });
      if (invitation.acceptedById !== actorId || current?.status !== "ACTIVE") return invalidInvitation();
    } else {
      if (invitation.status !== "PENDING" || invitation.expiresAt <= capacity.now) return invalidInvitation();
      const current = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: input.organizationId, userId: actorId } } });
      if (current?.status !== "ACTIVE") await tx.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: input.organizationId, userId: actorId } },
        create: { organizationId: input.organizationId, userId: actorId, role: invitation.role },
        update: { status: "ACTIVE", role: invitation.role },
      });
      await tx.organizationInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedById: actorId, acceptedAt: capacity.now } });
    }
    resultId = invitation.id;
  } else if (input.action === "REVOKE_INVITATION" || input.action === "ROTATE_INVITATION") {
    await tx.$queryRaw`SELECT "id" FROM "OrganizationInvitation" WHERE "organizationId" = ${input.organizationId} AND "id" = ${input.invitationId} FOR UPDATE`;
    const invitation = await tx.organizationInvitation.findFirst({ where: { organizationId: input.organizationId, id: input.invitationId } });
    if (!invitation) return invalidInvitation();
    manage(manager().role, invitation.role);
    if (invitation.status !== "PENDING" || invitation.expiresAt <= capacity.now) return invalidInvitation();
    resultId = invitation.id;
    if (input.action === "REVOKE_INVITATION") {
      await tx.organizationInvitation.update({ where: { id: resultId }, data: { status: "REVOKED" } });
    } else {
      await mailLimit(tx, actorId, input, capacity.now, resultId);
      const token = randomBytes(32).toString("base64url"), attemptId = randomUUID();
      await tx.organizationInvitation.update({ where: { id: resultId }, data: {
        tokenHash: digest(token), deliveryAttemptId: attemptId, deliveryStatus: "NOT_SENT", providerId: null, deliveryUpdatedAt: null,
      } });
      delivery = { organizationId: input.organizationId, invitationId: resultId, attemptId, to: invitation.email, token, expiresAt: invitation.expiresAt };
    }
  } else {
    const target = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } } });
    if (!target || target.status !== "ACTIVE") return forbidden();
    resultId = target.id;
    if (input.action === "TRANSFER_OWNER") {
      if (manager().role !== "OWNER" || input.userId === actorId) return forbidden();
      await account(tx, input.userId);
      await tx.organizationMembership.update({ where: { id: manager().membershipId }, data: { role: "ADMIN" } });
      await tx.organizationMembership.update({ where: { id: target.id }, data: { role: "OWNER" } });
    } else {
      if (target.role === "OWNER") return forbidden();
      manage(manager().role, target.role);
      if (input.action === "CHANGE_ROLE") {
        manage(manager().role, input.role);
        await tx.organizationMembership.update({ where: { id: target.id }, data: { role: input.role } });
      } else await tx.organizationMembership.update({ where: { id: target.id }, data: { status: "REVOKED" } });
    }
  }
  await audit(tx, actorId, input, resultId, context?.membershipId);
  await tx.organizationOperation.create({ data: { ...key, action: input.action, fingerprint, resultId, createdAt: capacity.now } });
  return { resultId, replayed: false, ...(delivery ? { delivery } : {}) };
}

/** actorId is supplied by the authenticated server adapter, never client fields. No provider I/O. */
export async function executeMembership(actorId: string, raw: unknown): Promise<MembershipResult> {
  const parsed = membershipRequest.safeParse(raw);
  if (!id.safeParse(actorId).success || !parsed.success) throw new MembershipError("INVALID_INPUT");
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(tx => perform(tx, actorId, parsed.data), { maxWait: 60_000, timeout: 30_000 }); }
    catch (error) {
      if (error instanceof OrganizationAccessError) throw new MembershipError(error.code);
      if (attempt < 2 && typeof error === "object" && error !== null && "code" in error && error.code === "P2034") continue;
      throw error;
    }
  }
}
