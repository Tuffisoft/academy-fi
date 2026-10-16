import { decryptStoredMessage } from "../server-encryption";

export class ChatError extends Error {}

export function toMessage(
  row: {
    id: string;
    clientId: string;
    sequence: number;
    encrypted: unknown;
    conversationId: string;
    senderId: string;
    createdAt: Date;
    editedAt: Date | null;
  },
  userId: string,
  senderName: string,
) {
  return {
    id: row.id,
    clientId: row.clientId,
    sequence: row.sequence,
    text: decryptStoredMessage(row.encrypted, row),
    senderId: row.senderId,
    senderName,
    own: row.senderId === userId,
    createdAt: row.createdAt.toISOString(),
    edited: row.editedAt !== null,
  };
}
