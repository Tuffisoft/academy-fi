import { prisma } from "@/lib/prisma";
import type {
  FriendsSnapshot,
  UserSearchResult,
} from "@/lib/chat/types/friends.types";

export class FriendshipError extends Error {}

export async function removeFriendship(userId: string, friendshipId: string) {
  const result = await prisma.friendship.deleteMany({
    where: {
      id: friendshipId,
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
  });
  if (result.count !== 1) {
    throw new FriendshipError(
      "Dieser Kontakt ist nicht mehr verfügbar oder gehört nicht zu deinen Kontakten.",
    );
  }
}

function pairKey(firstId: string, secondId: string) {
  return JSON.stringify([firstId, secondId].sort());
}

export async function getFriendsForUser(
  userId: string,
): Promise<FriendsSnapshot> {
  const relationships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
    select: {
      id: true,
      status: true,
      requesterId: true,
      requester: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const snapshot: FriendsSnapshot = { friends: [], incoming: [], outgoing: [] };

  for (const relationship of relationships) {
    const sentByUser = relationship.requesterId === userId;
    const other = sentByUser ? relationship.recipient : relationship.requester;
    const contact = { id: relationship.id, userId: other.id, name: other.name };

    if (relationship.status === "ACCEPTED") snapshot.friends.push(contact);
    else if (sentByUser) snapshot.outgoing.push(contact);
    else snapshot.incoming.push(contact);
  }

  snapshot.friends.sort((first, second) =>
    first.name.localeCompare(second.name, "de"),
  );
  return snapshot;
}

export async function searchUsersForFriendship(
  userId: string,
  query: string,
): Promise<UserSearchResult[]> {
  const name = query.trim();
  if (name.length < 2 || name.length > 80) {
    throw new FriendshipError(
      "Bitte gib einen Namen mit 2 bis 80 Zeichen ein.",
    );
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      name: { contains: name, mode: "insensitive" },
      OR: [{ banned: false }, { banned: null }],
    },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 20,
  });

  const relationships = await prisma.friendship.findMany({
    where: { pairKey: { in: users.map((user) => pairKey(userId, user.id)) } },
    select: { pairKey: true, requesterId: true, status: true },
  });

  return users.map((user) => {
    const relationship = relationships.find(
      (item) => item.pairKey === pairKey(userId, user.id),
    );
    let state: UserSearchResult["relationship"] = "none";

    if (relationship?.status === "ACCEPTED") state = "friends";
    else if (relationship)
      state = relationship.requesterId === userId ? "outgoing" : "incoming";

    return { ...user, relationship: state };
  });
}

export async function sendFriendshipRequest(
  userId: string,
  recipientId: string,
) {
  if (!recipientId || recipientId === userId) {
    throw new FriendshipError(
      "Du kannst dir selbst keine Freundschaftsanfrage senden.",
    );
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, banned: true },
  });
  if (!recipient || recipient.banned) {
    throw new FriendshipError("Dieser Nutzer ist derzeit nicht verfügbar.");
  }

  try {
    return await prisma.friendship.create({
      data: {
        pairKey: pairKey(userId, recipientId),
        requesterId: userId,
        recipientId,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new FriendshipError(
        "Es besteht bereits eine Anfrage oder Freundschaft. Aktualisiere die Liste.",
      );
    }
    throw error;
  }
}

export async function acceptFriendshipRequest(
  userId: string,
  requestId: string,
) {
  const result = await prisma.friendship.updateMany({
    where: { id: requestId, recipientId: userId, status: "PENDING" },
    data: { status: "ACCEPTED" },
  });
  if (result.count !== 1) {
    throw new FriendshipError(
      "Diese Anfrage ist nicht mehr verfügbar oder nicht an dich gerichtet.",
    );
  }
}

export async function declineFriendshipRequest(
  userId: string,
  requestId: string,
) {
  const result = await prisma.friendship.deleteMany({
    where: { id: requestId, recipientId: userId, status: "PENDING" },
  });
  if (result.count !== 1) {
    throw new FriendshipError(
      "Diese Anfrage ist nicht mehr verfügbar oder nicht an dich gerichtet.",
    );
  }
}

export async function cancelFriendshipRequest(
  userId: string,
  requestId: string,
) {
  const result = await prisma.friendship.deleteMany({
    where: { id: requestId, requesterId: userId, status: "PENDING" },
  });
  if (result.count !== 1) {
    throw new FriendshipError(
      "Diese Anfrage ist nicht mehr verfügbar oder wurde bereits angenommen.",
    );
  }
}
