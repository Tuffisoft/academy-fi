"use server";

import { requireUser } from "@/lib/session";
import { after } from "next/server";
import {
  ChatError,
  openDirectConversation,
  hideConversation,
  markConversationRead,
} from "@/lib/chat/services/chat";
import { notifyConversation, notifyUsers } from "@/lib/chat/realtime/server";
import type { ChatResult } from "@/lib/chat/types/chat.types";

function failure(error: unknown): ChatResult<never> {
  return {
    ok: false,
    error:
      error instanceof ChatError
        ? error.message
        : "Die Unterhaltung konnte nicht aktualisiert werden.",
  };
}

export async function openConversationAction(
  contactId: string,
): Promise<ChatResult<string>> {
  const user = await requireUser();
  try {
    const id = await openDirectConversation(user.id, contactId);
    after(async () => {
      await notifyConversation(id);
    });
    return { ok: true, data: id };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteConversationAction(
  conversationId: string,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    await hideConversation(user.id, conversationId);
    after(async () => {
      await notifyUsers([user.id], "chat.changed");
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function markConversationReadAction(
  conversationId: string,
  sequence: number,
): Promise<ChatResult<null>> {
  const user = await requireUser();
  try {
    await markConversationRead(user.id, conversationId, sequence);
    after(async () => {
      await notifyUsers([user.id], "chat.changed");
    });
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
