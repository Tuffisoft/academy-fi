import { prisma } from "@/lib/prisma";

export function getDailyPlan(userId: string, date: string) {
  return prisma.dailyPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}
