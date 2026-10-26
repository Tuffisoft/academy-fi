import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationContext,
  OrganizationAccessError,
} from "./organizations";

export async function getMembershipOverview(
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${actorId} FOR UPDATE`;
    const context = await getOrganizationContext(actorId, organizationId, tx);
    if (context.role !== "OWNER" && context.role !== "ADMIN")
      throw new OrganizationAccessError("FORBIDDEN");
    const [clock] = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp() AS "now"`;
    if (!clock || !(clock.now instanceof Date))
      throw new Error("Database clock unavailable");
    const organization = await tx.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });
    const members = await tx.organizationMembership.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const selection = {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        deliveryStatus: true,
    } as const;
    // All live reservations remain manageable, regardless of recent history.
    const pending = await tx.organizationInvitation.findMany({ where: { organizationId, status: "PENDING", expiresAt: { gt: clock.now } }, select: selection, orderBy: { createdAt: "desc" } });
    const history = await tx.organizationInvitation.findMany({ where: { organizationId, OR: [{ status: { not: "PENDING" } }, { expiresAt: { lte: clock.now } }] }, select: selection, orderBy: { createdAt: "desc" }, take: 50 });
    const invitations = [...pending, ...history], reserved = pending.length;
    return {
      organization,
      role: context.role,
      actorId,
      active: members.length,
      reserved,
      limit: context.limits.users,
      members,
      invitations: invitations.map((row) => ({
        ...row,
        status:
          row.status === "PENDING" && row.expiresAt <= clock.now
            ? "EXPIRED"
            : row.status,
        expiresAt: row.expiresAt.toISOString(),
      })),
    };
  });
}
export type MembershipOverview = Awaited<
  ReturnType<typeof getMembershipOverview>
>;
