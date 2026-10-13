import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  decryptStoredMessage,
  encryptStoredMessage,
  validateMessageText,
} from "./server-encryption";
import type {
  Conversation,
  MessagePage,
} from "@/lib/types/chat.types";

export class ChatError extends Error {}
const PAGE_SIZE = 100;
export { MAX_MESSAGE_LENGTH } from "./server-encryption";
type Database = typeof prisma | Prisma.TransactionClient;

function pairKey(first: string, second: string) {
  return JSON.stringify([first, second].sort());
}

function validateId(value: string) {
  if (typeof value !== "string" || !value || value.length > 200) {
    throw new ChatError("Ungültige Unterhaltung oder Nachricht.");
  }
}

function validateSequence(value: number | undefined) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
    throw new ChatError("Ungültige Nachrichtenposition.");
  }
}

function messageText(row: {
  encrypted: unknown;
  conversationId: string;
  senderId: string;
  clientId: string;
}) {
  return decryptStoredMessage(row.encrypted, row);
}

export function toMessage(
  row: {
    id: string;
    clientId: string;
    sequence: number;
    encrypted: unknown;
    conversationId: string;
    senderId: string;
    createdAt: Date;
    editedAt: Date | null;
  },
  userId: string,
  senderName: string,
) {
  return {
    id: row.id,
    clientId: row.clientId,
    sequence: row.sequence,
    text: messageText(row),
    storageProtection: "server" as const,
    senderId: row.senderId,
    senderName,
    own: row.senderId === userId,
    createdAt: row.createdAt.toISOString(),
    edited: row.editedAt !== null,
  };
}

async function requireMembership(
  db: Database,
  userId: string,
  conversationId: string,
) {
  validateId(conversationId);
  const member = await db.chatMembership.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        select: { firstUserId: true, secondUserId: true, nextSequence: true },
      },
    },
  });
  if (!member) throw new ChatError("Diese Unterhaltung ist nicht verfügbar.");
  return member;
}

async function canMessage(db: Database, first: string, second: string) {
  const friendship = await db.friendship.findUnique({
    where: { pairKey: pairKey(first, second) },
    select: {
      status: true,
      requester: { select: { banned: true } },
      recipient: { select: { banned: true } },
    },
  });
  return (
    friendship?.status === "ACCEPTED" &&
    !friendship.requester.banned &&
    !friendship.recipient.banned
  );
}

export async function openDirectConversation(
  userId: string,
  contactId: string,
) {
  validateId(contactId);
  if (contactId === userId)
    throw new ChatError("Wähle einen anderen Kontakt aus.");
  return prisma.$transaction(async (db) => {
    if (!(await canMessage(db, userId, contactId))) {
      throw new ChatError(
        "Unterhaltungen sind nur mit bestätigten Kontakten möglich.",
      );
    }
    const [firstUserId, secondUserId] = [userId, contactId].sort();
    const conversation = await db.directConversation.upsert({
      where: { pairKey: pairKey(userId, contactId) },
      create: {
        pairKey: pairKey(userId, contactId),
        firstUserId,
        secondUserId,
      },
      update: { pairKey: pairKey(userId, contactId) },
      select: { id: true },
    });
    await db.chatMembership.createMany({
      data: [userId, contactId].map((id) => ({
        conversationId: conversation.id,
        userId: id,
      })),
      skipDuplicates: true,
    });
    await db.chatMembership.update({
      where: {
        conversationId_userId: { conversationId: conversation.id, userId },
      },
      data: { hiddenAt: null },
    });
    return conversation.id;
  });
}

export async function getConversationsForUser(
  userId: string,
): Promise<Conversation[]> {
  const memberships = await prisma.chatMembership.findMany({
    where: { userId, hiddenAt: null },
    include: {
      conversation: {
        include: {
          firstUser: { select: { id: true, name: true } },
          secondUser: { select: { id: true, name: true } },
          messages: {
            orderBy: { sequence: "desc" },
            take: 1,
            select: {
              conversationId: true,
              senderId: true,
              clientId: true,
              encrypted: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });
  if (memberships.length === 0) return [];
  const unread = await prisma.chatMessage.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: userId },
      OR: memberships.map((member) => ({
        conversationId: member.conversationId,
        sequence: { gt: member.lastReadSequence },
      })),
    },
    _count: { _all: true },
  });
  return memberships.map(({ conversation }) => {
    const other =
      conversation.firstUser.id === userId
        ? conversation.secondUser
        : conversation.firstUser;
    return {
      id: conversation.id,
      name: other.name,
      initials:
        other.name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase() || "?",
      group: false,
      unreadCount:
        unread.find((row) => row.conversationId === conversation.id)?._count
          ._all ?? 0,
      lastMessage: conversation.messages[0]
        ? messageText(conversation.messages[0]).slice(0, 80)
        : null,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  });
}

export async function getMessagePage(
  userId: string,
  conversationId: string,
  options: { before?: number; from?: number } = {},
): Promise<MessagePage> {
  validateSequence(options.before);
  validateSequence(options.from);
  const member = await requireMembership(prisma, userId, conversationId);
  const otherId =
    member.conversation.firstUserId === userId
      ? member.conversation.secondUserId
      : member.conversation.firstUserId;
  const [rows, canSend] = await Promise.all([
    prisma.chatMessage.findMany({
      where: {
        conversationId,
        sequence: options.before
          ? { lt: options.before }
          : options.from
            ? { gte: options.from }
            : undefined,
      },
      include: { sender: { select: { name: true } } },
      orderBy: { sequence: "desc" },
      take: options.from ? undefined : PAGE_SIZE,
    }),
    canMessage(
      prisma,
      member.conversation.firstUserId,
      member.conversation.secondUserId,
    ),
  ]);
  rows.reverse();
  const first = rows[0]?.sequence;
  const hasOlder =
    first !== undefined &&
    Boolean(
      await prisma.chatMessage.findFirst({
        where: { conversationId, sequence: { lt: first } },
        select: { id: true },
      }),
    );
  return {
    conversationId,
    peer: { userId: otherId },
    messages: rows.map((row) => toMessage(row, userId, row.sender.name)),
    hasOlder,
    canSend,
  };
}

export async function createChatMessage(
  userId: string,
  conversationId: string,
  text: string,
  clientId: string,
) {
  validateMessageText(text);
  validateId(clientId);
  try {
    return await prisma.$transaction(async (db) => {
      const member = await requireMembership(db, userId, conversationId);
      if (
        !(await canMessage(
          db,
          member.conversation.firstUserId,
          member.conversation.secondUserId,
        ))
      ) {
        throw new ChatError(
          "Nachrichten sind nur zwischen bestätigten Kontakten möglich.",
        );
      }
      const previous = await db.chatMessage.findUnique({
        where: { senderId_clientId: { senderId: userId, clientId } },
      });
      if (previous) {
        if (
          previous.conversationId !== conversationId ||
          messageText(previous) !== text
        )
          throw new ChatError("Diese Nachricht wurde bereits verarbeitet.");
        return previous;
      }
      const payload = encryptStoredMessage(text, {
        conversationId,
        senderId: userId,
        clientId,
      });
      const conversation = await db.directConversation.update({
        where: { id: conversationId },
        data: { nextSequence: { increment: 1 }, updatedAt: new Date() },
      });
      const message = await db.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          text: null,
          encrypted: payload,
          clientId,
          sequence: conversation.nextSequence,
        },
      });
      await db.chatMembership.updateMany({
        where: { conversationId },
        data: { hiddenAt: null },
      });
      return message;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const previous = await prisma.chatMessage.findUnique({
        where: { senderId_clientId: { senderId: userId, clientId } },
      });
      if (
        previous?.conversationId === conversationId &&
        messageText(previous) === text
      )
        return previous;
    }
    throw error;
  }
}

export async function updateChatMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  text: string,
) {
  validateMessageText(text);
  validateId(messageId);
  return prisma.$transaction(async (db) => {
    await requireMembership(db, userId, conversationId);
    const previous = await db.chatMessage.findFirst({
      where: { id: messageId, conversationId, senderId: userId },
      select: { clientId: true },
    });
    if (!previous)
      throw new ChatError(
        "Du kannst nur deine eigenen Nachrichten bearbeiten.",
      );
    const payload = encryptStoredMessage(text, {
      conversationId,
      senderId: userId,
      clientId: previous.clientId,
    });
    const result = await db.chatMessage.updateMany({
      where: { id: messageId, conversationId, senderId: userId },
      data: { text: null, encrypted: payload, editedAt: new Date() },
    });
    if (result.count !== 1)
      throw new ChatError(
        "Du kannst nur deine eigenen Nachrichten bearbeiten.",
      );
    await db.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  });
}

export async function removeChatMessage(
  userId: string,
  conversationId: string,
  messageId: string,
) {
  validateId(messageId);
  return prisma.$transaction(async (db) => {
    await requireMembership(db, userId, conversationId);
    const result = await db.chatMessage.deleteMany({
      where: { id: messageId, conversationId, senderId: userId },
    });
    if (result.count !== 1)
      throw new ChatError("Du kannst nur deine eigenen Nachrichten löschen.");
    await db.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  });
}

export async function hideConversation(userId: string, conversationId: string) {
  await requireMembership(prisma, userId, conversationId);
  await prisma.chatMembership.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { hiddenAt: new Date() },
  });
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
  sequence: number,
) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new ChatError("Ungültiger Lesestand.");
  validateSequence(sequence);
  const member = await requireMembership(prisma, userId, conversationId);
  if (sequence > member.conversation.nextSequence)
    throw new ChatError("Ungültiger Lesestand.");
  await prisma.chatMembership.updateMany({
    where: { conversationId, userId, lastReadSequence: { lt: sequence } },
    data: { lastReadSequence: sequence },
  });
}

export async function getConversationParticipants(conversationId: string) {
  const conversation = await prisma.directConversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { firstUserId: true, secondUserId: true },
  });
  return [conversation.firstUserId, conversation.secondUserId];
}
