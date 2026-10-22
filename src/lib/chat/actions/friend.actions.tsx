"use server";

import { revalidatePath } from "next/cache";
import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/chat/realtime/server";
import {
  FriendshipError,
  getFriendsForUser,
  searchUsersForFriendship,
  sendFriendshipRequest,
  acceptFriendshipRequest,
  declineFriendshipRequest,
  cancelFriendshipRequest,
  removeFriendship,
} from "@/lib/chat/services/friends";
import type {
  FriendsResult,
  FriendsSnapshot,
  UserSearchResult,
} from "@/lib/chat/types/friends.types";

function failure(error: unknown): FriendsResult<never> {
  return {
    ok: false,
    error:
      error instanceof FriendshipError
        ? error.message
        : "Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es erneut.",
  };
}

async function changeRelationship(
  userId: string,
  relationshipId: string,
  action: () => Promise<unknown>,
) {
  const relationship = await prisma.friendship.findFirst({
    where: {
      id: relationshipId,
      OR: [{ requesterId: userId }, { recipientId: userId }],
    },
    select: { requesterId: true, recipientId: true },
  });
  await action();
  if (relationship) {
    const userIds = [relationship.requesterId, relationship.recipientId];
    await Promise.all([
      notifyUsers(userIds, "contacts.changed"),
      notifyUsers(userIds, "chat.changed"),
    ]);
  }
}

export async function getFriendsAction(): Promise<
  FriendsResult<FriendsSnapshot>
> {
  const user = await requireAcademyUser();
  try {
    return { ok: true, data: await getFriendsForUser(user.id) };
  } catch (error) {
    return failure(error);
  }
}

export async function removeContactAction(
  friendshipId: string,
): Promise<FriendsResult<FriendsSnapshot>> {
  const user = await requireAcademyUser();
  try {
    await changeRelationship(user.id, friendshipId, () =>
      removeFriendship(user.id, friendshipId),
    );
    revalidatePath("/[locale]/chat", "page");
    return { ok: true, data: await getFriendsForUser(user.id) };
  } catch (error) {
    return failure(error);
  }
}

export async function searchUsersAction(
  query: string,
): Promise<FriendsResult<UserSearchResult[]>> {
  const user = await requireAcademyUser();
  try {
    return { ok: true, data: await searchUsersForFriendship(user.id, query) };
  } catch (error) {
    return failure(error);
  }
}

export async function sendFriendRequestAction(
  recipientId: string,
): Promise<FriendsResult<FriendsSnapshot>> {
  const user = await requireAcademyUser();
  try {
    await sendFriendshipRequest(user.id, recipientId);
    await notifyUsers([user.id, recipientId], "contacts.changed");
    revalidatePath("/[locale]/chat", "page");
    return { ok: true, data: await getFriendsForUser(user.id) };
  } catch (error) {
    return failure(error);
  }
}

export async function respondToFriendRequestAction(
  requestId: string,
  decision: "accept" | "decline",
): Promise<FriendsResult<FriendsSnapshot>> {
  const user = await requireAcademyUser();
  try {
    await changeRelationship(user.id, requestId, async () => {
      if (decision === "accept")
        await acceptFriendshipRequest(user.id, requestId);
      else if (decision === "decline")
        await declineFriendshipRequest(user.id, requestId);
      else
        throw new FriendshipError(
          "Ungültige Antwort auf die Freundschaftsanfrage.",
        );
    });

    revalidatePath("/[locale]/chat", "page");
    return { ok: true, data: await getFriendsForUser(user.id) };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelFriendRequestAction(
  requestId: string,
): Promise<FriendsResult<FriendsSnapshot>> {
  const user = await requireAcademyUser();
  try {
    await changeRelationship(user.id, requestId, () =>
      cancelFriendshipRequest(user.id, requestId),
    );
    revalidatePath("/[locale]/chat", "page");
    return { ok: true, data: await getFriendsForUser(user.id) };
  } catch (error) {
    return failure(error);
  }
}
