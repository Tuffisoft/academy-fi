import assert from "node:assert/strict";
import test from "node:test";
import {
  unconfirmedMessages,
  visibleMessages,
} from "../src/components/fi/chat/utils/message-delivery";
import type { Message } from "@/lib/chat/types/chat.types";
import { createMessageId } from "../src/components/fi/chat/utils/message-id";

const queued: Message = {
  id: "pending-local",
  clientId: "retry-key",
  sequence: 0,
  text: "Hallo 😊",
  own: true,
  senderId: "alice",
  senderName: "Alice",
  createdAt: "2026-10-09T12:00:00.000Z",
  edited: false,
  delivery: "sending",
};

test("message IDs use the native UUID method when available", () => {
  const expected = "36b8f84d-df4e-4d49-b662-bcde71a8764f";
  const source = {
    randomUUID() {
      assert.equal(this, source);
      return expected;
    },
    getRandomValues(): Uint8Array {
      throw new Error("The fallback must not run when randomUUID is available");
    },
  };
  assert.equal(createMessageId(source), expected);
});

test("HTTP origins without randomUUID generate valid v4 message IDs using random bytes", () => {
  const source = {
    getRandomValues(bytes: Uint8Array) {
      assert.equal(this, source);
      assert.equal(bytes.length, 16);
      return bytes.fill(0xff);
    },
  };
  assert.equal(createMessageId(source), "ffffffff-ffff-4fff-bfff-ffffffffffff");

  const insecureSource = {
    getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
  };
  const ids = Array.from({ length: 1000 }, () =>
    createMessageId(insecureSource),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
});

test("an unconfirmed message is visible immediately", () => {
  assert.deepEqual(visibleMessages([], [queued]), [queued]);
});

test("websocket confirmation replaces the local message without a duplicate", () => {
  const saved = {
    ...queued,
    id: "database-id",
    sequence: 1,
    delivery: undefined,
  };
  assert.deepEqual(visibleMessages([saved], [queued]), [saved]);
  assert.deepEqual(unconfirmedMessages([saved], [queued]), []);
});

test("failed messages keep their retry key and reconcile after a lost response", () => {
  const failed: Message = { ...queued, delivery: "failed" };
  assert.equal(visibleMessages([], [failed])[0].clientId, queued.clientId);
  const saved = {
    ...queued,
    id: "database-id",
    sequence: 1,
    delivery: undefined,
  };
  assert.deepEqual(unconfirmedMessages([saved], [failed]), []);
});
