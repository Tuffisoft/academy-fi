import type { Message } from "@/lib/types/chat.types";

export function unconfirmedMessages(
  serverMessages: Message[],
  outgoing: Message[],
) {
  const confirmed = new Set(serverMessages.map((message) => message.clientId));
  return outgoing.filter((message) => !confirmed.has(message.clientId));
}

export function visibleMessages(
  serverMessages: Message[],
  outgoing: Message[],
) {
  return [...serverMessages, ...unconfirmedMessages(serverMessages, outgoing)];
}
