"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function getDiscussionNoteAction() {
  const user = await requireUser();

  const note = await prisma.discussionNote.findUnique({
    where: { userId: user.id },
  });

  return note?.content ?? "";
}

export async function saveDiscussionNoteAction(content: string) {
  const user = await requireUser();

  await prisma.discussionNote.upsert({
    where: { userId: user.id },
    create: { userId: user.id, content },
    update: { content },
  });
}
