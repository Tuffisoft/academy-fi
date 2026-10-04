import { prisma } from "@/lib/prisma";

export function getCurrentAssignmentForIntern(internId: string) {
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

export function getAssignmentsOverview() {
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

export function getInterns() {
  return prisma.user.findMany({
    where: { role: "INTERN" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function getAllAssignmentsForIntern(internId: string) {
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
