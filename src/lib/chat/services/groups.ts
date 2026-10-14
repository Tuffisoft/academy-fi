import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ChatError, toMessage } from "./chat-message";
import {
  decryptStoredMessage,
  encryptStoredMessage,
  validateMessageText,
} from "../server-encryption";
import type {
  Conversation,
  GroupInvitation,
  MessagePage,
} from "../types/chat.types";

type Database = typeof prisma | Prisma.TransactionClient;
const MAX_MEMBERS = 50;
const PAGE_SIZE = 100;

// Group IDs route through the existing chat API without querying direct-chat tables.
export function isGroupConversationId(id: string) {
  return typeof id === "string" && id.startsWith("group_");
}

function validateId(id: string) {
  if (typeof id !== "string" || !id || id.length > 200)
    throw new ChatError("Ungültige Gruppe oder Mitgliedschaft.");
}

function groupName(name: string) {
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  )
    throw new ChatError("Der Gruppenname benötigt 2 bis 80 Zeichen.");
  return name.trim();
}

async function requireAvailableUser(db: Database, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { banned: true },
  });
  if (!user || user.banned)
    throw new ChatError("Dein Konto ist derzeit nicht verfügbar.");
}

async function requireMember(
  db: Database,
  userId: string,
  conversationId: string,
  admin = false,
) {
  validateId(conversationId);
  await requireAvailableUser(db, userId);
  const member = await db.groupMembership.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: true },
  });
  if (!member || member.status !== "ACTIVE" || member.conversation.archivedAt)
    throw new ChatError("Du bist kein Mitglied dieser Gruppe.");
  if (admin && member.role !== "ADMIN")
    throw new ChatError("Nur Gruppenadmins können diese Aktion ausführen.");
  return member;
}

async function lockGroup(db: Database, conversationId: string) {
  validateId(conversationId);
  // Serialize membership changes and sends so removal cannot race a message write.
  const result = await db.groupConversation.updateMany({
    where: { id: conversationId, archivedAt: null },
    data: { updatedAt: new Date() },
  });
  if (!result.count)
    throw new ChatError("Diese Gruppe ist nicht mehr verfügbar.");
}

async function requireContacts(db: Database, userId: string, ids: string[]) {
  if (!Array.isArray(ids) || ids.length > MAX_MEMBERS - 1)
    throw new ChatError(
      "Eine Gruppe kann höchstens 50 Mitglieder und Einladungen enthalten.",
    );
  ids.forEach(validateId);
  const unique = [...new Set(ids)];
  if (unique.includes(userId))
    throw new ChatError("Du bist bereits Mitglied der Gruppe.");
  if (!unique.length) return unique;
  const relationships = await db.friendship.findMany({
    where: {
      pairKey: { in: unique.map((id) => JSON.stringify([userId, id].sort())) },
      status: "ACCEPTED",
      requester: { OR: [{ banned: false }, { banned: null }] },
      recipient: { OR: [{ banned: false }, { banned: null }] },
    },
    select: { id: true },
  });
  if (relationships.length !== unique.length)
    throw new ChatError(
      "Du kannst nur bestätigte, verfügbare Kontakte einladen.",
    );
  return unique;
}

async function affectedUsers(db: Database, conversationId: string) {
  const rows = await db.groupMembership.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function createGroup(
  userId: string,
  name: string,
  contactIds: string[],
) {
  const validName = groupName(name);
  return prisma.$transaction(async (db) => {
    await requireAvailableUser(db, userId);
    const ids = await requireContacts(db, userId, contactIds);
    const group = await db.groupConversation.create({
      data: {
        id: `group_${randomUUID()}`,
        name: validName,
        members: {
          create: [
            { userId, role: "ADMIN", status: "ACTIVE" },
            ...ids.map((id) => ({
              userId: id,
              role: "MEMBER" as const,
              status: "INVITED" as const,
            })),
          ],
        },
      },
    });
    return { id: group.id, userIds: [userId, ...ids] };
  });
}

export async function getGroupInvitations(
  userId: string,
): Promise<GroupInvitation[]> {
  await requireAvailableUser(prisma, userId);
  const invitations = await prisma.groupMembership.findMany({
    where: { userId, status: "INVITED", conversation: { archivedAt: null } },
    select: { conversation: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "desc" },
  });
  return invitations.map(({ conversation }) => ({
    conversationId: conversation.id,
    name: conversation.name,
  }));
}

export async function inviteGroupContacts(
  userId: string,
  conversationId: string,
  contactIds: string[],
) {
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    await requireMember(db, userId, conversationId, true);
    const ids = await requireContacts(db, userId, contactIds);
    const members = await db.groupMembership.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const existing = new Set(members.map((row) => row.userId));
    const fresh = ids.filter((id) => !existing.has(id));
    if (members.length + fresh.length > MAX_MEMBERS)
      throw new ChatError(
        "Diese Gruppe hat bereits 50 Mitglieder und Einladungen.",
      );
    await db.groupMembership.createMany({
      data: fresh.map((id) => ({ conversationId, userId: id })),
      skipDuplicates: true,
    });
    return [...existing, ...fresh];
  });
}

export async function respondToGroupInvitation(
  userId: string,
  conversationId: string,
  accept: boolean,
) {
  if (typeof accept !== "boolean")
    throw new ChatError("Ungültige Antwort auf die Einladung.");
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    await requireAvailableUser(db, userId);
    const member = await db.groupMembership.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: { conversation: true },
    });
    if (!member || member.status !== "INVITED")
      throw new ChatError("Diese Einladung ist nicht mehr verfügbar.");
    const userIds = await affectedUsers(db, conversationId);
    if (accept) {
      await db.groupMembership.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: {
          status: "ACTIVE",
          joinedSequence: member.conversation.nextSequence,
          lastReadSequence: member.conversation.nextSequence,
          joinedAt: new Date(),
        },
      });
    } else {
      await db.groupMembership.delete({
        where: { conversationId_userId: { conversationId, userId } },
      });
    }
    return userIds;
  });
}

export async function renameGroup(
  userId: string,
  conversationId: string,
  name: string,
) {
  const validName = groupName(name);
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    await requireMember(db, userId, conversationId, true);
    await db.groupConversation.update({
      where: { id: conversationId },
      data: { name: validName },
    });
    return affectedUsers(db, conversationId);
  });
}

export async function changeGroupRole(
  userId: string,
  conversationId: string,
  targetId: string,
  role: "ADMIN" | "MEMBER",
) {
  validateId(targetId);
  if (role !== "ADMIN" && role !== "MEMBER")
    throw new ChatError("Ungültige Gruppenrolle.");
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    await requireMember(db, userId, conversationId, true);
    const target = await requireMember(db, targetId, conversationId);
    if (target.role === "ADMIN" && role === "MEMBER") {
      const count = await db.groupMembership.count({
        where: {
          conversationId,
          status: "ACTIVE",
          role: "ADMIN",
          user: { OR: [{ banned: false }, { banned: null }] },
        },
      });
      if (count <= 1)
        throw new ChatError(
          "Die Gruppe benötigt mindestens einen verfügbaren Admin.",
        );
    }
    await db.groupMembership.update({
      where: { conversationId_userId: { conversationId, userId: targetId } },
      data: { role },
    });
    return affectedUsers(db, conversationId);
  });
}

export async function removeGroupMember(
  userId: string,
  conversationId: string,
  targetId: string,
) {
  validateId(targetId);
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    const actor = await requireMember(
      db,
      userId,
      conversationId,
      targetId !== userId,
    );
    const target = await db.groupMembership.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetId } },
    });
    if (!target)
      throw new ChatError("Dieses Mitglied ist nicht mehr verfügbar.");
    const userIds = await affectedUsers(db, conversationId);
    if (target.status === "ACTIVE" && target.role === "ADMIN") {
      const otherAdmins = await db.groupMembership.count({
        where: {
          conversationId,
          userId: { not: targetId },
          status: "ACTIVE",
          role: "ADMIN",
          user: { OR: [{ banned: false }, { banned: null }] },
        },
      });
      if (!otherAdmins) {
        const successor = await db.groupMembership.findFirst({
          where: {
            conversationId,
            userId: { not: targetId },
            status: "ACTIVE",
            user: { OR: [{ banned: false }, { banned: null }] },
          },
          orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
        });
        if (successor)
          await db.groupMembership.update({
            where: {
              conversationId_userId: {
                conversationId,
                userId: successor.userId,
              },
            },
            data: { role: "ADMIN" },
          });
        else {
          await db.groupConversation.update({
            where: { id: conversationId },
            data: { archivedAt: new Date() },
          });
          await db.groupMembership.deleteMany({ where: { conversationId } });
          return userIds;
        }
      }
    }
    // A normal member can only leave; removing anyone else requires an admin.
    if (actor.role !== "ADMIN" && targetId !== userId)
      throw new ChatError("Nur Gruppenadmins können Mitglieder entfernen.");
    await db.groupMembership.delete({
      where: { conversationId_userId: { conversationId, userId: targetId } },
    });
    return userIds;
  });
}

export async function getGroupConversations(
  userId: string,
): Promise<Conversation[]> {
  const memberships = await prisma.groupMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      conversation: { archivedAt: null },
      user: { OR: [{ banned: false }, { banned: null }] },
    },
    include: {
      conversation: {
        include: { messages: { orderBy: { sequence: "desc" }, take: 1 } },
      },
    },
  });
  if (!memberships.length) return [];
  const unread = await prisma.groupMessage.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: userId },
      OR: memberships.map((member) => ({
        conversationId: member.conversationId,
        sequence: {
          gt: Math.max(member.joinedSequence, member.lastReadSequence),
        },
      })),
    },
    _count: { _all: true },
  });
  return memberships.map(({ conversation, joinedSequence }) => {
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      name: conversation.name,
      initials: "",
      group: true,
      unreadCount:
        unread.find((row) => row.conversationId === conversation.id)?._count
          ._all ?? 0,
      lastMessage:
        last && last.sequence > joinedSequence
          ? decryptStoredMessage(last.encrypted, last).slice(0, 80)
          : null,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  });
}

export async function getGroupMessagePage(
  userId: string,
  conversationId: string,
  options: { before?: number; from?: number } = {},
): Promise<MessagePage> {
  for (const value of [options.before, options.from])
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1))
      throw new ChatError("Ungültige Nachrichtenposition.");
  const member = await requireMember(prisma, userId, conversationId);
  const [rows, members] = await Promise.all([
    prisma.groupMessage.findMany({
      where: {
        conversationId,
        sequence: {
          gt: member.joinedSequence,
          ...(options.before ? { lt: options.before } : {}),
          ...(options.from ? { gte: options.from } : {}),
        },
      },
      include: { sender: { select: { name: true } } },
      orderBy: { sequence: "desc" },
      take: options.from ? undefined : PAGE_SIZE,
    }),
    prisma.groupMembership.findMany({
      where: {
        conversationId,
        ...(member.role !== "ADMIN" ? { status: "ACTIVE" as const } : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { joinedAt: "asc" }],
    }),
  ]);
  rows.reverse();
  const first = rows[0]?.sequence;
  const hasOlder =
    first !== undefined &&
    Boolean(
      await prisma.groupMessage.findFirst({
        where: {
          conversationId,
          sequence: { gt: member.joinedSequence, lt: first },
        },
        select: { id: true },
      }),
    );
  return {
    conversationId,
    messages: rows.map((row) => toMessage(row, userId, row.sender.name)),
    hasOlder,
    canSend: true,
    group: {
      name: member.conversation.name,
      canManage: member.role === "ADMIN",
      members: members.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        role: row.role,
        status: row.status,
      })),
    },
  };
}

export async function createGroupMessage(
  userId: string,
  conversationId: string,
  text: string,
  clientId: string,
) {
  validateMessageText(text);
  validateId(clientId);
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    const member = await requireMember(db, userId, conversationId);
    const previous = await db.groupMessage.findUnique({
      where: { senderId_clientId: { senderId: userId, clientId } },
    });
    if (previous) {
      if (previous.sequence <= member.joinedSequence)
        throw new ChatError(
          "Diese Nachricht ist nach deinem erneuten Beitritt nicht mehr sichtbar.",
        );
      if (
        previous.conversationId !== conversationId ||
        decryptStoredMessage(previous.encrypted, previous) !== text
      )
        throw new ChatError("Diese Nachricht wurde bereits verarbeitet.");
      return previous;
    }
    const conversation = await db.groupConversation.update({
      where: { id: conversationId },
      data: { nextSequence: { increment: 1 } },
    });
    return db.groupMessage.create({
      data: {
        conversationId,
        senderId: userId,
        clientId,
        sequence: conversation.nextSequence,
        encrypted: encryptStoredMessage(text, {
          conversationId,
          senderId: userId,
          clientId,
        }),
      },
    });
  });
}

export async function editGroupMessage(
  userId: string,
  conversationId: string,
  messageId: string,
  text: string,
) {
  validateMessageText(text);
  validateId(messageId);
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    const member = await requireMember(db, userId, conversationId);
    const message = await db.groupMessage.findFirst({
      where: {
        id: messageId,
        conversationId,
        senderId: userId,
        sequence: { gt: member.joinedSequence },
      },
    });
    if (!message)
      throw new ChatError(
        "Du kannst nur deine eigenen sichtbaren Nachrichten bearbeiten.",
      );
    await db.groupMessage.update({
      where: { id: messageId },
      data: {
        encrypted: encryptStoredMessage(text, message),
        editedAt: new Date(),
      },
    });
  });
}

export async function deleteGroupMessage(
  userId: string,
  conversationId: string,
  messageId: string,
) {
  validateId(messageId);
  return prisma.$transaction(async (db) => {
    await lockGroup(db, conversationId);
    const member = await requireMember(db, userId, conversationId);
    const result = await db.groupMessage.deleteMany({
      where: {
        id: messageId,
        conversationId,
        senderId: userId,
        sequence: { gt: member.joinedSequence },
      },
    });
    if (result.count !== 1)
      throw new ChatError(
        "Du kannst nur deine eigenen sichtbaren Nachrichten löschen.",
      );
  });
}

export async function markGroupRead(
  userId: string,
  conversationId: string,
  sequence: number,
) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new ChatError("Ungültiger Lesestand.");
  return prisma.$transaction(async (db) => {
    const member = await requireMember(db, userId, conversationId);
    if (
      sequence > member.conversation.nextSequence ||
      sequence <= member.joinedSequence
    )
      throw new ChatError("Ungültiger Lesestand.");
    await db.groupMembership.updateMany({
      where: {
        conversationId,
        userId,
        status: "ACTIVE",
        joinedAt: member.joinedAt,
        lastReadSequence: { lt: sequence },
      },
      data: { lastReadSequence: sequence },
    });
  });
}

export async function getGroupParticipants(conversationId: string) {
  const members = await prisma.groupMembership.findMany({
    where: {
      conversationId,
      status: "ACTIVE",
      conversation: { archivedAt: null },
      user: { OR: [{ banned: false }, { banned: null }] },
    },
    select: { userId: true },
  });
  return members.map((row) => row.userId);
}
