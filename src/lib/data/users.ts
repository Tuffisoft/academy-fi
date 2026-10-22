import { prisma } from "@/lib/prisma";
import { requirePlatformOwner } from "@/lib/session";

export async function getUsers() {
  await requirePlatformOwner();
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}
