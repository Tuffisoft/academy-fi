"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

export async function createIdeaAction(input: {
  title: string;
  description?: string;
}) {
  const user = await requireUser();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  await prisma.idea.create({
    data: {
      title,
      description: input.description?.trim() || null,
      authorId: user.id,
    },
  });
}

export async function deleteIdeaAction(ideaId: string) {
  const user = await requireUser();

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true },
  });
  if (!idea) {
    throw new Error("Idea not found.");
  }
  // Owners can remove any idea; interns only their own
  if (user.role !== Role.OWNER && idea.authorId !== user.id) {
    throw new Error("Not authorized to delete this idea.");
  }

  await prisma.idea.delete({ where: { id: ideaId } });
}

export async function addIdeaNoteAction(ideaId: string, content: string) {
  const user = await requireUser();

  const text = content.trim();
  if (!text) {
    throw new Error("Note is required.");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { id: true },
  });
  if (!idea) {
    throw new Error("Idea not found.");
  }

  await prisma.ideaNote.create({
    data: { ideaId, content: text, authorId: user.id },
  });
}

export async function deleteIdeaNoteAction(noteId: string) {
  const user = await requireUser();

  const note = await prisma.ideaNote.findUnique({
    where: { id: noteId },
    select: { authorId: true },
  });
  if (!note) {
    throw new Error("Note not found.");
  }
  if (user.role !== Role.OWNER && note.authorId !== user.id) {
    throw new Error("Not authorized to delete this note.");
  }

  await prisma.ideaNote.delete({ where: { id: noteId } });
}
