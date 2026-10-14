import "server-only";
import { prisma } from "@/lib/prisma";
import { ChatError, toMessage } from "@/lib/chat/services/chat";

async function requireOwner(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true },
  });
  if (user?.role !== "OWNER" || user.banned)
    throw new ChatError(
      "Für die Chat-Verwaltung fehlen dir die Berechtigungen.",
    );
}

export async function getOwnerConversations(ownerId: string, cursor?: string) {
  await requireOwner(ownerId);
  if (cursor && cursor.length > 200)
    throw new ChatError("Ungültige Nachrichtenposition.");
  const rows = await prisma.directConversation.findMany({
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      updatedAt: true,
      firstUser: { select: { name: true } },
      secondUser: { select: { name: true } },
    },
  });
  const visible = rows.slice(0, 50);
  return {
    conversations: visible.map((row) => ({
      id: row.id,
      name: `${row.firstUser.name} · ${row.secondUser.name}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
    nextCursor: rows.length > 50 ? visible.at(-1)!.id : null,
  };
}

export async function getOwnerMessagePage(
  ownerId: string,
  conversationId: string,
  before?: number,
) {
  await requireOwner(ownerId);
  if (
    !conversationId ||
    conversationId.length > 200 ||
    (before !== undefined && (!Number.isSafeInteger(before) || before < 1))
  )
    throw new ChatError("Ungültige Unterhaltung oder Nachrichtenposition.");
  const conversation = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    select: {
      firstUser: { select: { name: true } },
      secondUser: { select: { name: true } },
    },
  });
  if (!conversation)
    throw new ChatError("Diese Unterhaltung ist nicht verfügbar.");
  const rows = await prisma.chatMessage.findMany({
    where: { conversationId, ...(before ? { sequence: { lt: before } } : {}) },
    orderBy: { sequence: "desc" },
    take: 101,
    include: { sender: { select: { name: true } } },
  });
  const visible = rows.slice(0, 100).reverse();
  return {
    name: `${conversation.firstUser.name} · ${conversation.secondUser.name}`,
    messages: visible.map((row) => toMessage(row, ownerId, row.sender.name)),
    before: rows.length > 100 ? visible[0].sequence : null,
  };
}
