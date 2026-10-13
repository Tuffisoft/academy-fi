import "server-only";
import { Rest } from "ably";
import { getConversationParticipants } from "@/lib/chat";
import { userChannel } from "@/lib/realtime-channel";

let client: Rest | undefined;

export function isRealtimeConfigured() {
  return Boolean(process.env.ABLY_API_KEY);
}

export function getRealtimeServer() {
  if (!process.env.ABLY_API_KEY)
    throw new Error("Ably ist noch nicht eingerichtet.");
  client ??= new Rest({ key: process.env.ABLY_API_KEY });
  return client;
}

export async function notifyUsers(
  userIds: string[],
  event: "chat.changed" | "contacts.changed",
) {
  if (!isRealtimeConfigured()) return false;
  try {
    const results = await Promise.allSettled(
      [...new Set(userIds)].map((id) =>
        getRealtimeServer().channels.get(userChannel(id)).publish(event, {}),
      ),
    );
    const delivered = results.every((result) => result.status === "fulfilled");
    if (!delivered)
      console.error(
        "Realtime-Benachrichtigung konnte nicht zugestellt werden.",
      );
    return delivered;
  } catch {
    console.error("Realtime-Benachrichtigung konnte nicht zugestellt werden.");
    return false;
  }
}

export async function notifyConversation(conversationId: string) {
  try {
    return await notifyUsers(
      await getConversationParticipants(conversationId),
      "chat.changed",
    );
  } catch {
    console.error("Realtime-Benachrichtigung konnte nicht vorbereitet werden.");
    return false;
  }
}
