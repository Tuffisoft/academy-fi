import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma, OrganizationRole } from "@/generated/prisma/client";
import { freeEntitlement } from "./plans";
import { membershipCapacity } from "./membership-capacity";

export class OrganizationAccessError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "INVALID_INPUT" | "LIMIT_REACHED" | "CONFLICT") {
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
  const user = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, banned: true, emailVerified: true, email: true } });
  if (!user || user.banned || !["CUSTOMER", "OWNER", "INTERN"].includes(user.role)) {
    throw new OrganizationAccessError("FORBIDDEN");
  }
  return user;
}

const portalSelection = { id: true, name: true, slug: true, status: true } as const;

export async function getPortalOrganizations(actorId: string, after?: string) {
  const actor = await identity(prisma, actorId);
  if (after) identifier(after);
  const internal = actor.role === "OWNER";
  const organizations = await prisma.organization.findMany({
    where: {
      ...(after ? { id: { gt: after } } : {}),
      ...(!internal ? { status: "ACTIVE", memberships: { some: { userId: actor.id, status: "ACTIVE", role: { in: [...roles] } } } } : {}),
    },
    select: portalSelection,
    orderBy: { id: "asc" },
    take: 51,
  });
  return { internal, canCreate: actor.role === "INTERN", organizations: organizations.slice(0, 50), next: organizations.length > 50 ? organizations[49].id : null };
}

export async function getPortalOrganization(actorId: string, slug: string) {
  if (typeof slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) throw new OrganizationAccessError("INVALID_INPUT");
  const actor = await identity(prisma, actorId);
  const organization = await prisma.organization.findFirst({
    where: { slug, ...(actor.role === "OWNER" ? {} : { status: "ACTIVE", memberships: { some: { userId: actor.id, status: "ACTIVE", role: { in: [...roles] } } } }) },
    select: portalSelection,
  });
  if (!organization) throw new OrganizationAccessError("FORBIDDEN");
  if (actor.role === "OWNER") {
    const detail = await getInternalOrganizationDetail(actorId, organization.id);
    if (!detail) throw new OrganizationAccessError("FORBIDDEN");
    return { ...detail, internal: true, role: null };
  }
  const context = await getOrganizationContext(actorId, organization.id);
  const detail = await prisma.organization.findUnique({
    where: { id: context.organizationId },
    select: { ...portalSelection, entitlement: { select: { plan: true } }, _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
  });
  if (!detail) throw new OrganizationAccessError("FORBIDDEN");
  return { ...detail, internal: false, role: context.role };
}

/** INTERN may found multiple companies. The same actor/request key commits at most one. */
export async function createOrganization(actorId: string, name: string, operationId: string) {
  identifier(actorId);
  if (typeof name !== "string" || !name.trim() || name.trim().length > 160 || /[\u0000-\u001f\u007f]/.test(name)) throw new OrganizationAccessError("INVALID_INPUT");
  if (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) throw new OrganizationAccessError("INVALID_INPUT");
  const digest = createHash("sha256").update(`${actorId}\0${operationId.toLowerCase()}`).digest("hex");
  const id = `org_${digest}`;
  const fingerprint = createHash("sha256").update(name.trim()).digest("hex");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${actorId} FOR UPDATE`;
    const actor = await identity(tx, actorId);
    if (actor.role !== "INTERN") throw new OrganizationAccessError("FORBIDDEN");
    const previous = await tx.organization.findUnique({ where: { id }, include: { memberships: { where: { userId: actor.id, status: "ACTIVE", role: "OWNER" } }, auditEntries: { where: { actorId: actor.id, action: "ORGANIZATION_CREATED" }, select: { reason: true } } } });
    if (previous) {
      if (previous.status !== "ACTIVE" || previous.memberships.length !== 1) throw new OrganizationAccessError("FORBIDDEN");
      if (previous.auditEntries.length !== 1 || previous.auditEntries[0].reason !== fingerprint) throw new OrganizationAccessError("CONFLICT");
      return { id: previous.id, slug: previous.slug };
    }
    const organization = await tx.organization.create({ data: { id, name: name.trim(), slug: `company-${digest}`, status: "ACTIVE", entitlement: { create: { plan: "FREE" } } } });
    const membership = await tx.organizationMembership.create({ data: { organizationId: organization.id, userId: actor.id, role: "OWNER" } });
    await tx.organizationAuditLog.create({ data: { organizationId: organization.id, actorId: actor.id, actorMembershipId: membership.id, action: "ORGANIZATION_CREATED", targetId: organization.id, reason: fingerprint } });
    return { id: organization.id, slug: organization.slug };
  }, { maxWait: 60_000, timeout: 30_000 });
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
 * Only new STAFF additions are allowed here; invitations use the membership workflow.
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
    // Revoked users must go through a fresh invitation; do not bypass its token/verification.
    if (existing) throw new OrganizationAccessError("FORBIDDEN");
    const capacity = await membershipCapacity(tx, organizationId);
    if (await tx.organizationInvitation.findFirst({ where: { organizationId, email: target.email.trim().toLowerCase(), status: "PENDING", expiresAt: { gt: capacity.now } } })) throw new OrganizationAccessError("CONFLICT");
    if (capacity.occupied >= current.limits.users) throw new OrganizationAccessError("LIMIT_REACHED");
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
