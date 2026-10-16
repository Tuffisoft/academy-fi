import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const MAX_MESSAGE_LENGTH = 4000;
export type MessageContext = {
  conversationId: string;
  senderId: string;
  clientId: string;
};
export type StoredMessage = {
  version: 2;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export class MessageEncryptionError extends Error {}

function decode(value: unknown, min: number, max = min): Buffer {
  if (typeof value !== "string" || value.length > Math.ceil(max / 3) * 4)
    throw new MessageEncryptionError("Ungültige Verschlüsselungsdaten.");
  const bytes = Buffer.from(value, "base64");
  if (
    bytes.length < min ||
    bytes.length > max ||
    bytes.toString("base64") !== value
  )
    throw new MessageEncryptionError("Ungültige Verschlüsselungsdaten.");
  return bytes;
}

function masterKey() {
  try {
    return decode(process.env.CHAT_MASTER_KEY, 32);
  } catch {
    throw new MessageEncryptionError(
      "Der Nachrichtenversand ist derzeit nicht verfügbar.",
    );
  }
}

export function isMasterKeyConfigured() {
  try {
    const key = masterKey();
    key.fill(0);
    return true;
  } catch {
    return false;
  }
}

export function validateMessageText(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > MAX_MESSAGE_LENGTH
  )
    throw new MessageEncryptionError(
      "Verwende eine Nachricht mit 1 bis 4000 Zeichen.",
    );
  return value;
}

function associatedData(context: MessageContext) {
  if (
    [context.conversationId, context.senderId, context.clientId].some(
      (value) => typeof value !== "string" || !value || value.length > 200,
    )
  )
    throw new MessageEncryptionError("Ungültiger Nachrichtenkontext.");
  return Buffer.from(
    JSON.stringify([
      "academy-fi-server-message",
      2,
      context.conversationId,
      context.senderId,
      context.clientId,
    ]),
  );
}

// This module uses node:crypto. Production consumers additionally import server-only.
// Nonces are public per-message values, not additional encryption keys.
export function encryptStoredMessage(
  text: string,
  context: MessageContext,
): StoredMessage {
  validateMessageText(text);
  const key = masterKey();
  const plaintext = Buffer.from(text, "utf8");
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv, {
      authTagLength: 16,
    });
    cipher.setAAD(associatedData(context));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    return {
      version: 2,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  } finally {
    key.fill(0);
    plaintext.fill(0);
  }
}

export function decryptStoredMessage(
  value: unknown,
  context: MessageContext,
): string {
  const key = masterKey();
  let plaintext: Buffer | undefined;
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    const payload = value as Record<string, unknown>;
    if (
      payload.version !== 2 ||
      payload.algorithm !== "aes-256-gcm" ||
      Object.keys(payload).length !== 5
    )
      throw new Error();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      decode(payload.iv, 12),
      { authTagLength: 16 },
    );
    decipher.setAAD(associatedData(context));
    decipher.setAuthTag(decode(payload.tag, 16));
    const first = decipher.update(
      decode(payload.ciphertext, 1, MAX_MESSAGE_LENGTH * 4),
    );
    try {
      // Only return plaintext once the authentication tag has been verified.
      plaintext = Buffer.concat([first, decipher.final()]);
    } finally {
      first.fill(0);
    }
    return validateMessageText(plaintext.toString("utf8"));
  } catch {
    throw new MessageEncryptionError(
      "Die gespeicherte Nachricht konnte nicht geladen werden.",
    );
  } finally {
    key.fill(0);
    plaintext?.fill(0);
  }
}
