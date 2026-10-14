"use server";

import { requireUser } from "@/lib/session";
import { after } from "next/server";
import {
  ChatError,
  createChatMessage,
  updateChatMessage,
  removeChatMessage,
  toMessage,
} from "@/lib/chat/services/chat";
import { notifyConversation } from "@/lib/chat/realtime/server";
import type { ChatResult, Message } from "@/lib/chat/types/chat.types";
import { MessageEncryptionError } from "@/lib/chat/server-encryption";

type MutationResult = ChatResult<{ realtimeDelivered: boolean }>;

function failure(error: unknown): ChatResult<never> {
  return {
    ok: false,
    error:
      error instanceof ChatError || error instanceof MessageEncryptionError
        ? error.message
        : "Die Nachricht konnte nicht verarbeitet werden.",
  };
}

export async function sendMessageAction(
  conversationId: string,
  text: string,
  clientId: string,
): Promise<ChatResult<Message>> {
  const user = await requireUser();
  try {
    const message = await createChatMessage(
      user.id,
      conversationId,
      text,
      clientId,
    );
    after(async () => {
      await notifyConversation(conversationId);
    });
    return {
      ok: true,
      data: toMessage(message, user.id, user.name),
    };
  } catch (error) {
    return failure(error);
  }
}

export async function editMessageAction(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<MutationResult> {
  const user = await requireUser();
  try {
    await updateChatMessage(user.id, conversationId, messageId, text);
    return {
      ok: true,
      data: { realtimeDelivered: await notifyConversation(conversationId) },
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMessageAction(
  conversationId: string,
  messageId: string,
): Promise<MutationResult> {
  const user = await requireUser();
  try {
    await removeChatMessage(user.id, conversationId, messageId);
    return {
      ok: true,
      data: { realtimeDelivered: await notifyConversation(conversationId) },
    };
  } catch (error) {
    return failure(error);
  }
}
