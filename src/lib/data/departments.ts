import { prisma } from "@/lib/prisma";

export function getDepartments() {
  return prisma.department.findMany({
    include: { resources: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
}
