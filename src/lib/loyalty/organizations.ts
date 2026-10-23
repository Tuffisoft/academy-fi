import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrganizationRole } from "@/generated/prisma/client";
import { freeEntitlement } from "./plans";

export class OrganizationAccessError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "INVALID_INPUT" | "LIMIT_REACHED") {
    super(code);
    this.name = "OrganizationAccessError";
  }
}

type Database = Prisma.TransactionClient;
const roles: readonly OrganizationRole[] = ["OWNER", "ADMIN", "STAFF"];

function identifier(value: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(value)) {
    throw new OrganizationAccessError("INVALID_INPUT");
  }
}

async function identity(db: Database, actorId: string) {
  identifier(actorId);
  const user = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, banned: true } });
  if (!user || user.banned || !["CUSTOMER", "OWNER", "INTERN"].includes(user.role)) {
    throw new OrganizationAccessError("FORBIDDEN");
  }
  return user;
}

// actorId must come from the authenticated server session, never request data.
// Contexts are resolved per operation and are not accepted as client capabilities.
export async function getOrganizationContext(actorId: string, organizationId: string, db: Database = prisma) {
  identifier(organizationId);
  const user = await identity(db, actorId);
  const member = await db.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId: user.id } },
    include: { organization: { include: { entitlement: true } } },
  });
  if (!member || member.status !== "ACTIVE" || !roles.includes(member.role) || member.organization.status !== "ACTIVE" || !member.organization.entitlement) {
    throw new OrganizationAccessError("FORBIDDEN");
  }
  return {
    kind: "member" as const,
    actorId: user.id,
    organizationId,
    membershipId: member.id,
    role: member.role,
    limits: freeEntitlement(member.organization.entitlement.plan),
  };
}

async function internalContext(db: Database, actorId: string, organizationId: string) {
  identifier(organizationId);
  const user = await identity(db, actorId);
  if (user.role !== "OWNER") throw new OrganizationAccessError("FORBIDDEN");
  return { kind: "internal" as const, actorId: user.id, organizationId };
}

export async function getInternalOrganizationDetail(actorId: string, organizationId: string) {
  return prisma.$transaction(async (tx) => {
    // No tenant lookup before the current global identity is authorized.
    await internalContext(tx, actorId, organizationId);
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${actorId} FOR UPDATE`;
    await internalContext(tx, actorId, organizationId);
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true, name: true, slug: true, status: true,
        entitlement: { select: { plan: true } },
        _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
      },
    });
    if (organization) await tx.organizationAuditLog.create({ data: {
      organizationId, actorId, action: "INTERNAL_DETAIL_READ", targetId: organizationId,
      reason: "Explicit internal organization detail selection",
    } });
    return organization;
  });
}

/** Internal foundation for later membership workflows; no public mutation endpoint.
 * Locks serialize capacity checks. Authorizations are read again inside the transaction.
 * Only STAFF additions are allowed here; invitation/ownership workflows come later.
 */
export async function addStaffMembership(actorId: string, organizationId: string, userId: string, reason: string) {
  identifier(organizationId);
  identifier(userId);
  identifier(actorId);
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 500) {
    throw new OrganizationAccessError("INVALID_INPUT");
  }
  const initial = await getOrganizationContext(actorId, organizationId);
  if (initial.role !== "OWNER" && initial.role !== "ADMIN") throw new OrganizationAccessError("FORBIDDEN");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    const context = await getOrganizationContext(actorId, organizationId, tx);
    if (context.role !== "OWNER" && context.role !== "ADMIN") throw new OrganizationAccessError("FORBIDDEN");
    // Lock account and membership rows so concurrent revocation cannot race this write.
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" IN (${actorId}, ${userId}) ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "OrganizationMembership" WHERE "organizationId" = ${organizationId} AND "userId" = ${actorId} FOR UPDATE`;
    const current = await getOrganizationContext(actorId, organizationId, tx);
    if (current.role !== "OWNER" && current.role !== "ADMIN") throw new OrganizationAccessError("FORBIDDEN");
    const target = await identity(tx, userId);
    if (target.role !== "CUSTOMER") throw new OrganizationAccessError("FORBIDDEN");
    const existing = await tx.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
    if (existing?.status === "ACTIVE") return existing;
    const count = await tx.organizationMembership.count({ where: { organizationId, status: "ACTIVE" } });
    if (count >= current.limits.users) throw new OrganizationAccessError("LIMIT_REACHED");
    const member = await tx.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: { organizationId, userId, role: "STAFF" },
      update: { role: "STAFF", status: "ACTIVE" },
    });
    await tx.organizationAuditLog.create({ data: {
      organizationId, actorId, actorMembershipId: current.membershipId,
      action: "MEMBERSHIP_ADDED", targetId: member.id, reason: reason.trim(),
    } });
    return member;
  }, { maxWait: 60_000, timeout: 30_000 });
}
