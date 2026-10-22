import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getIdeas() {
  await requireAcademyUser();
  return prisma.idea.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
}
