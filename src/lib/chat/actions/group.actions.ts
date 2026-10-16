"use server";

import { after } from "next/server";
import { requireUser } from "@/lib/session";
import { ChatError } from "@/lib/chat/services/chat-message";
import { notifyUsers } from "@/lib/chat/realtime/server";
import {
  changeGroupRole,
  createGroup,
  inviteGroupContacts,
  removeGroupMember,
  renameGroup,
  respondToGroupInvitation,
} from "@/lib/chat/services/groups";
import type { ChatResult } from "@/lib/chat/types/chat.types";

function failure(error: unknown): ChatResult<never> {
  return {
    ok: false,
    error:
      error instanceof ChatError
        ? error.message
        : "Die Gruppe konnte nicht aktualisiert werden.",
  };
}

function notify(userIds: string[]) {
  after(async () => {
    await notifyUsers(userIds, "chat.changed");
  });
}

export async function createGroupAction(
  name: string,
  contactIds: string[],
): Promise<ChatResult<string>> {
  const user = await requireUser();
  try {
    const group = await createGroup(user.id, name, contactIds);
    notify(group.userIds);
    return { ok: true, data: group.id };
  } catch (error) {
    return failure(error);
  }
}

export async function inviteGroupContactsAction(
  conversationId: string,
  contactIds: string[],
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await inviteGroupContacts(user.id, conversationId, contactIds));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function respondToGroupInvitationAction(
  conversationId: string,
  accept: boolean,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await respondToGroupInvitation(user.id, conversationId, accept));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function renameGroupAction(
  conversationId: string,
  name: string,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await renameGroup(user.id, conversationId, name));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function changeGroupRoleAction(
  conversationId: string,
  targetId: string,
  role: "ADMIN" | "MEMBER",
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await changeGroupRole(user.id, conversationId, targetId, role));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function removeGroupMemberAction(
  conversationId: string,
  targetId: string,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await removeGroupMember(user.id, conversationId, targetId));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function leaveGroupAction(
  conversationId: string,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    notify(await removeGroupMember(user.id, conversationId, user.id));
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
