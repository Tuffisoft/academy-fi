import { prisma } from "@/lib/prisma";

export function getUsers() {
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
