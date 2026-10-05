"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

type CreateAssignmentInput = {
  internId: string;
  weekOf: string;
  focus: string;
  description: string;
  acceptanceCriteria: string;
  checklistLabels: string[];
};

export async function createAssignmentAction(input: CreateAssignmentInput) {
  const owner = await requireRole(Role.OWNER);

  await prisma.weeklyAssignment.create({
    data: {
      internId: input.internId,
      createdById: owner.id,
      weekOf: new Date(input.weekOf),
      focus: input.focus,
      description: input.description,
      acceptanceCriteria: input.acceptanceCriteria,
      checklistItems: {
        create: input.checklistLabels
          .filter((label) => label.trim().length > 0)
          .map((label, index) => ({ label, order: index })),
      },
    },
  });
}

export async function toggleChecklistItemAction(
  itemId: string,
  completed: boolean,
) {
  const user = await requireUser();

  const item = await prisma.assignmentChecklistItem.findUnique({
    where: { id: itemId },
    include: { assignment: { select: { internId: true } } },
  });

  if (!item) {
    throw new Error("Checklist item not found.");
  }
  if (item.assignment.internId !== user.id && user.role !== Role.OWNER) {
    throw new Error("Not authorized to update this checklist item.");
  }

  await prisma.assignmentChecklistItem.update({
    where: { id: itemId },
    data: { completed, completedAt: completed ? new Date() : null },
  });
}

type ReflectionInput = {
  assignmentId: string;
  workDone: string;
  learning: string;
  blocker?: string;
  workLink?: string;
  nextStep: string;
};

export async function submitReflectionAction(input: ReflectionInput) {
  const user = await requireUser();

  const assignment = await prisma.weeklyAssignment.findUnique({
    where: { id: input.assignmentId },
    select: { internId: true },
  });

  if (!assignment || assignment.internId !== user.id) {
    throw new Error("Not authorized to reflect on this assignment.");
  }

  const existing = await prisma.reflection.findFirst({
    where: { assignmentId: input.assignmentId, internId: user.id },
  });

  const data = {
    workDone: input.workDone,
    learning: input.learning,
    blocker: input.blocker || null,
    workLink: input.workLink || null,
    nextStep: input.nextStep,
  };

  if (existing) {
    await prisma.reflection.update({ where: { id: existing.id }, data });
  } else {
    await prisma.reflection.create({
      data: { ...data, assignmentId: input.assignmentId, internId: user.id },
    });
  }
}

export async function addMentorFeedbackAction(
  reflectionId: string,
  message: string,
) {
  const owner = await requireRole(Role.OWNER);

  await prisma.mentorFeedback.create({
    data: { reflectionId, authorId: owner.id, message },
  });
}

export async function createTaskStageAction(
  checklistItemId: string,
  rawTitle: string,
) {
  const user = await requireUser();
  const title = rawTitle.trim();
  if (!title) {
    throw new Error("Stage title is required.");
  }

  const item = await prisma.assignmentChecklistItem.findUnique({
    where: { id: checklistItemId },
    include: { assignment: { select: { internId: true } } },
  });

  if (!item) {
    throw new Error("Checklist item not found.");
  }
  if (item.assignment.internId !== user.id) {
    throw new Error("Not authorized to add stages to this task.");
  }

  const stageCount = await prisma.taskStage.count({
    where: { checklistItemId },
  });

  await prisma.taskStage.create({
    data: {
      checklistItemId,
      title,
      order: stageCount,
    },
  });
}

export async function updateTaskStageAction(
  stageId: string,
  completed: boolean,
  documentation: string,
) {
  const user = await requireUser();

  const stage = await prisma.taskStage.findUnique({
    where: { id: stageId },
    include: {
      checklistItem: {
        include: { assignment: { select: { internId: true } } },
      },
    },
  });

  if (!stage) {
    throw new Error("Stage not found.");
  }
  if (stage.checklistItem.assignment.internId !== user.id) {
    throw new Error("Not authorized to update this stage.");
  }

  await prisma.taskStage.update({
    where: { id: stageId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
      documentation,
    },
  });
}

export async function deleteTaskStageAction(stageId: string) {
  const user = await requireUser();

  const stage = await prisma.taskStage.findUnique({
    where: { id: stageId },
    include: {
      checklistItem: {
        include: { assignment: { select: { internId: true } } },
      },
    },
  });

  if (!stage) {
    throw new Error("Stage not found.");
  }
  if (stage.checklistItem.assignment.internId !== user.id) {
    throw new Error("Not authorized to delete this stage.");
  }

  await prisma.taskStage.delete({ where: { id: stageId } });
}
export async function deleteChecklistItemAction(itemId: string) {
  const user = await requireRole(Role.OWNER);

  const item = await prisma.assignmentChecklistItem.findUnique({
    where: { id: itemId },
    include: { assignment: { select: { id: true } } },
  });

  if (!item) {
    throw new Error("Checklist item not found.");
  }

  await prisma.assignmentChecklistItem.delete({ where: { id: itemId } });
}

export async function updateChecklistItemAction(itemId: string, label: string) {
  const user = await requireRole(Role.OWNER);

  const item = await prisma.assignmentChecklistItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error("Checklist item not found.");
  }

  await prisma.assignmentChecklistItem.update({
    where: { id: itemId },
    data: { label },
  });
}

export async function updateAssignmentAction(
  assignmentId: string,
  data: {
    focus?: string;
    description?: string;
    acceptanceCriteria?: string;
  },
) {
  const user = await requireRole(Role.OWNER);

  const assignment = await prisma.weeklyAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  await prisma.weeklyAssignment.update({
    where: { id: assignmentId },
    data,
  });
}

export async function deleteAssignmentAction(assignmentId: string) {
  const user = await requireRole(Role.OWNER);

  const assignment = await prisma.weeklyAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  await prisma.weeklyAssignment.delete({ where: { id: assignmentId } });
}
