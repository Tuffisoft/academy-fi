import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getCurrentAssignmentForIntern(internId: string) {
  await requireAcademyUser();
  return prisma.weeklyAssignment.findFirst({
    where: { internId },
    orderBy: { weekOf: "desc" },
    include: {
      checklistItems: {
        orderBy: { order: "asc" },
        include: {
          stages: { orderBy: { order: "asc" } },
        },
      },
      reflections: {
        orderBy: { createdAt: "desc" },
        include: {
          feedback: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function getAssignmentsOverview() {
  await requireAcademyUser();
  return prisma.weeklyAssignment.findMany({
    orderBy: [{ weekOf: "desc" }],
    include: {
      intern: { select: { id: true, name: true } },
      checklistItems: {
        include: {
          stages: true,
        },
      },
      reflections: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { feedback: true },
      },
    },
  });
}

export async function getInterns(includeUserId?: string) {
  await requireAcademyUser();
  return prisma.user.findMany({
    where: {
      OR: [
        { role: "INTERN" },
        ...(includeUserId ? [{ id: includeUserId }] : []),
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllAssignmentsForIntern(internId: string) {
  await requireAcademyUser();
  return prisma.weeklyAssignment.findMany({
    where: { internId },
    orderBy: { weekOf: "desc" },
    include: {
      checklistItems: {
        orderBy: { order: "asc" },
        include: {
          stages: { orderBy: { order: "asc" } },
        },
      },
      reflections: {
        orderBy: { createdAt: "desc" },
        include: {
          feedback: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
        },
      },
    },
  });
}
