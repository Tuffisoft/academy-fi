import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getDepartments() {
  await requireAcademyUser();
  return prisma.department.findMany({
    include: { resources: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
}
