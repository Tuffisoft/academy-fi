import assert from "node:assert/strict";
import test from "node:test";
import {
  unconfirmedMessages,
  visibleMessages,
} from "../src/components/fi/chat/utils/message-delivery";
import type { Message } from "@/lib/chat/types/chat.types";

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
