import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getDailyPlanArchive(
  userId: string,
  before: string,
  take: number,
) {
  await requireAcademyUser();
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

export async function getDailyPlan(userId: string, date: string) {
  await requireAcademyUser();
  return prisma.dailyPlan.findUnique({
    where: { userId_date: { userId, date } },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}
