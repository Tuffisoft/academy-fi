"use client";

import type {
  ChatResult,
  Conversation,
  MessagePage,
  GroupInvitation,
} from "@/lib/chat/types/chat.types";

async function read<T>(params: URLSearchParams): Promise<ChatResult<T>> {
  const response = await fetch("/api/chat?" + params, {
    cache: "no-store",
    credentials: "same-origin",
  });
  return response.json();
}

export const readConversations = () =>
  read<Conversation[]>(new URLSearchParams());
export const readGroupInvitations = () =>
  read<GroupInvitation[]>(new URLSearchParams({ view: "group-invitations" }));
export function readMessages(
  conversationId: string,
  position: { from?: number; before?: number } = {},
) {
  const params = new URLSearchParams({ conversationId });
  if (position.from !== undefined) params.set("from", String(position.from));
  if (position.before !== undefined)
    params.set("before", String(position.before));
  return read<MessagePage>(params);
}
