"use server";

import { prisma } from "@/lib/prisma";
import { requireAcademyUser } from "@/lib/session";

export async function getDiscussionNoteAction() {
  const user = await requireAcademyUser();

  const note = await prisma.discussionNote.findUnique({
    where: { userId: user.id },
  });

  return note?.content ?? "";
}

export async function saveDiscussionNoteAction(content: string) {
  const user = await requireAcademyUser();

  await prisma.discussionNote.upsert({
    where: { userId: user.id },
    create: { userId: user.id, content },
    update: { content },
  });
}
