"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isValidPlanDate } from "@/lib/daily-plan-date";

function requireTitle(value: string, message: string) {
  const title = value.trim();
  if (!title) {
    throw new Error(message);
  }
  return title;
}

// Plans are private: only the owning user may touch a plan or its stages.
async function requireOwnPlan(userId: string, planId: string) {
  const plan = await prisma.dailyPlan.findUnique({
    where: { id: planId },
    select: { userId: true },
  });
  if (!plan || plan.userId !== userId) {
    throw new Error("Plan not found.");
  }
}

async function requireOwnStage(userId: string, stageId: string) {
  const stage = await prisma.dailyPlanStage.findUnique({
    where: { id: stageId },
    select: { plan: { select: { userId: true } } },
  });
  if (!stage || stage.plan.userId !== userId) {
    throw new Error("Stage not found.");
  }
}

export async function upsertDailyPlanAction(input: {
  date: string;
  title: string;
}) {
  const user = await requireUser();

  if (!isValidPlanDate(input.date)) {
    throw new Error("Invalid date.");
  }
  const title = requireTitle(input.title, "Title is required.");

  await prisma.dailyPlan.upsert({
    where: { userId_date: { userId: user.id, date: input.date } },
    update: { title },
    create: { userId: user.id, date: input.date, title },
  });
}

export async function deleteDailyPlanAction(planId: string) {
  const user = await requireUser();
  await requireOwnPlan(user.id, planId);

  await prisma.dailyPlan.delete({ where: { id: planId } });
}

export async function addDailyPlanStageAction(
  planId: string,
  title: string,
  parentId: string | null = null,
) {
  const user = await requireUser();
  await requireOwnPlan(user.id, planId);
  const text = requireTitle(title, "Stage title is required.");

  // Subsections may only hang off a top-level stage of the same plan
  if (parentId) {
    const parent = await prisma.dailyPlanStage.findUnique({
      where: { id: parentId },
      select: { planId: true, parentId: true },
    });
    if (!parent || parent.planId !== planId || parent.parentId !== null) {
      throw new Error("Stage not found.");
    }
  }

  // Append after the current last sibling
  const last = await prisma.dailyPlanStage.findFirst({
    where: { planId, parentId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.dailyPlanStage.create({
    data: { planId, parentId, title: text, order: (last?.order ?? -1) + 1 },
  });
}

// Persists a new order for one sibling list (top-level stages or one stage's subsections)
export async function reorderDailyPlanStagesAction(
  planId: string,
  parentId: string | null,
  orderedIds: string[],
) {
  const user = await requireUser();
  await requireOwnPlan(user.id, planId);

  const siblings = await prisma.dailyPlanStage.findMany({
    where: { planId, parentId },
    select: { id: true },
  });
  const known = new Set(siblings.map((s) => s.id));
  if (
    orderedIds.length !== known.size ||
    new Set(orderedIds).size !== known.size ||
    !orderedIds.every((id) => known.has(id))
  ) {
    throw new Error("Stages do not match.");
  }

  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.dailyPlanStage.update({ where: { id }, data: { order } }),
    ),
  );
}

export async function toggleDailyPlanStageAction(
  stageId: string,
  completed: boolean,
) {
  const user = await requireUser();
  await requireOwnStage(user.id, stageId);

  await prisma.dailyPlanStage.update({
    where: { id: stageId },
    data: { completed, completedAt: completed ? new Date() : null },
  });
}

export async function renameDailyPlanStageAction(
  stageId: string,
  title: string,
) {
  const user = await requireUser();
  await requireOwnStage(user.id, stageId);
  const text = requireTitle(title, "Stage title is required.");

  await prisma.dailyPlanStage.update({
    where: { id: stageId },
    data: { title: text },
  });
}

export async function deleteDailyPlanStageAction(stageId: string) {
  const user = await requireUser();
  await requireOwnStage(user.id, stageId);

  await prisma.dailyPlanStage.delete({ where: { id: stageId } });
}
