import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes } from "node:crypto";
import {
  decryptStoredMessage,
  encryptStoredMessage,
  isMasterKeyConfigured,
  MessageEncryptionError,
} from "../src/lib/server-encryption";

const previousKey = process.env.CHAT_MASTER_KEY;
const key = randomBytes(32).toString("base64");
const context = {
  conversationId: "chat-1",
  senderId: "alice",
  clientId: "retry-1",
};
before(() => {
  process.env.CHAT_MASTER_KEY = key;
});
after(() => {
  if (previousKey === undefined) delete process.env.CHAT_MASTER_KEY;
  else process.env.CHAT_MASTER_KEY = previousKey;
});

test("one server key encrypts different chats without persisting plaintext or the key", () => {
  for (const conversationId of ["chat-1", "chat-2"]) {
    const scope = { ...context, conversationId };
    const text = "Hallo 😊\nPrivate Nachricht";
    const stored = encryptStoredMessage(text, scope);
    assert.equal(decryptStoredMessage(stored, scope), text);
    assert.ok(!JSON.stringify(stored).includes(text));
    assert.ok(!JSON.stringify(stored).includes(key));
    assert.equal(stored.version, 2);
    assert.equal(Buffer.from(stored.tag, "base64").length, 16);
  }
});

test("each write and edit uses a fresh nonce", () => {
  const nonces = new Set(
    Array.from(
      { length: 200 },
      () => encryptStoredMessage("Identischer Text", context).iv,
    ),
  );
  assert.equal(nonces.size, 200);
});

test("tampering with ciphertext, IV or authentication tag is rejected", () => {
  const stored = encryptStoredMessage("Nicht verändern", context);
  for (const field of ["iv", "tag", "ciphertext"] as const) {
    const bytes = Buffer.from(stored[field], "base64");
    bytes[0] ^= 1;
    assert.throws(
      () =>
        decryptStoredMessage(
          { ...stored, [field]: bytes.toString("base64") },
          context,
        ),
      MessageEncryptionError,
    );
  }
});

test("moving a payload to another chat, author or retry ID is rejected", () => {
  const stored = encryptStoredMessage("Nur in dieser Nachricht", context);
  for (const field of ["conversationId", "senderId", "clientId"] as const)
    assert.throws(
      () => decryptStoredMessage(stored, { ...context, [field]: "different" }),
      MessageEncryptionError,
    );
});

test("missing, malformed or wrong keys fail closed without plaintext fallback", () => {
  const stored = encryptStoredMessage("Geschützt", context);
  for (const invalid of ["", "password", randomBytes(16).toString("base64")]) {
    process.env.CHAT_MASTER_KEY = invalid;
    assert.equal(isMasterKeyConfigured(), false);
    assert.throws(
      () => encryptStoredMessage("Text", context),
      MessageEncryptionError,
    );
    assert.throws(
      () => decryptStoredMessage(stored, context),
      MessageEncryptionError,
    );
  }
  process.env.CHAT_MASTER_KEY = randomBytes(32).toString("base64");
  assert.throws(
    () => decryptStoredMessage(stored, context),
    MessageEncryptionError,
  );
  process.env.CHAT_MASTER_KEY = key;
  assert.equal(decryptStoredMessage(stored, context), "Geschützt");
});

test("rejects oversized input, malformed Base64, unknown versions and added fields", () => {
  for (const text of ["", "  ", "a".repeat(4001)])
    assert.throws(
      () => encryptStoredMessage(text, context),
      MessageEncryptionError,
    );
  const stored = encryptStoredMessage("a".repeat(4000), context);
  assert.equal(decryptStoredMessage(stored, context).length, 4000);
  for (const invalid of [
    { ...stored, version: 1 },
    { ...stored, iv: "invalid" },
    { ...stored, text: "leak" },
  ])
    assert.throws(
      () => decryptStoredMessage(invalid, context),
      MessageEncryptionError,
    );
});
