import { prisma } from "@/lib/prisma";

export function getIdeas() {
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
