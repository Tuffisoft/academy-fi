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
  delivery?: "sending" | "failed";
};
export type Conversation = {
  id: string;
  name: string;
  initials: string;
  group: boolean;
  unreadCount: number;
  lastMessage: string | null;
  updatedAt: string;
};
export type ChatSection = "chats" | "contacts" | "groups";
export type ChatUser = { id: string; name: string };

export type MessagePage = {
  conversationId: string;
  group?: GroupDetails;
  messages: Message[];
  hasOlder: boolean;
  canSend: boolean;
};
export type GroupMember = {
  userId: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  status: "INVITED" | "ACTIVE";
};
export type GroupDetails = {
  name: string;
  canManage: boolean;
  members: GroupMember[];
};
export type GroupInvitation = { conversationId: string; name: string };
export type ChatResult<T> =
  { ok: true; data: T } | { ok: false; error: string };
