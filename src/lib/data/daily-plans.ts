import { prisma } from "@/lib/prisma";

export function getDailyPlanArchive(
  userId: string,
  before: string,
  take: number,
) {
  return prisma.dailyPlan.findMany({
    where: { userId, date: { lt: before } },
    orderBy: { date: "desc" },
    take,
    select: {
      id: true,
      date: true,
      title: true,
      stages: { where: { parentId: null }, select: { completed: true } },
    },
  });
}

export function getDailyPlan(userId: string, date: string) {
  return prisma.dailyPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}
