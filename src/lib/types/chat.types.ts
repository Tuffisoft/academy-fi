export type Message = {
  id: string;
  clientId: string;
  sequence: number;
  text: string;
  own: boolean;
  senderId: string;
  senderName: string;
  createdAt: string;
  edited: boolean;
  storageProtection?: "server";
  delivery?: "sending" | "failed";
};
export type Conversation = {
  id: string;
  name: string;
  initials: string;
  group: false;
  unreadCount: number;
  lastMessage: string | null;
  updatedAt: string;
};
export type ChatSection = "chats" | "contacts" | "groups";
export type ChatUser = { id: string; name: string };

export type MessagePage = {
  conversationId: string;
  peer: { userId: string };
  messages: Message[];
  hasOlder: boolean;
  canSend: boolean;
};
export type ChatSnapshot = {
  page: MessagePage | null;
};
export type ChatResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
