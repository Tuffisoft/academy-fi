import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/** Call only while holding the organization row lock. Never use transaction-start time. */
export async function membershipCapacity(db: Prisma.TransactionClient, organizationId: string) {
  const [clock] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS "now"`;
  if (!clock || !(clock.now instanceof Date)) throw new Error("Database clock unavailable");
  await db.organizationInvitation.updateMany({
    where: { organizationId, status: "PENDING", expiresAt: { lte: clock.now } },
    data: { status: "EXPIRED" },
  });
  const active = await db.organizationMembership.count({ where: { organizationId, status: "ACTIVE" } });
  const reserved = await db.organizationInvitation.count({ where: { organizationId, status: "PENDING", expiresAt: { gt: clock.now } } });
  return { now: clock.now, active, reserved, occupied: active + reserved };
}
