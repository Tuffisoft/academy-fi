"use server";

import { requireUser } from "@/lib/session";
import { ChatError, getConversationsForUser, getMessagePage } from "@/lib/chat";
import type {
  ChatResult,
  ChatSnapshot,
  Conversation,
  MessagePage,
} from "@/lib/types/chat.types";

export async function getConversationsAction(): Promise<
  ChatResult<Conversation[]>
> {
  const user = await requireUser();
  try {
    return { ok: true, data: await getConversationsForUser(user.id) };
  } catch {
    return {
      ok: false,
      error: "Die Unterhaltungen konnten nicht geladen werden.",
    };
  }
}

export async function getChatSnapshotAction(
  conversationId: string,
  from?: number,
): Promise<ChatResult<ChatSnapshot>> {
  const user = await requireUser();
  try {
    const page = await getMessagePage(user.id, conversationId, { from });
    return {
      ok: true,
      data: { page },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ChatError
          ? error.message
          : "Die Nachrichten konnten nicht geladen werden.",
    };
  }
}

export async function getOlderMessagesAction(
  conversationId: string,
  before: number,
): Promise<ChatResult<MessagePage>> {
  const user = await requireUser();
  try {
    return {
      ok: true,
      data: await getMessagePage(user.id, conversationId, { before }),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ChatError
          ? error.message
          : "Ältere Nachrichten konnten nicht geladen werden.",
    };
  }
}
