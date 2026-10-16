import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { ChatError, getMessagePage, updateChatMessage } from "../src/lib/chat/services/chat";
import { getOwnerMessagePage } from "../src/lib/chat/services/owner-chat";
import {
  decryptStoredMessage,
  encryptStoredMessage,
} from "../src/lib/chat/server-encryption";

const previousKey = process.env.CHAT_MASTER_KEY;
const context = {
  conversationId: "chat-1",
  senderId: "alice",
  clientId: "retry-1",
};
let stored: ReturnType<typeof encryptStoredMessage>;
let edits = 0;
const originals: Array<{ target: object; name: string; value: unknown }> = [];
const mock = {
  method(target: object, name: string, replacement: unknown) {
    originals.push({ target, name, value: Reflect.get(target, name) });
    Reflect.set(target, name, replacement);
    assert.equal(Reflect.get(target, name), replacement);
  },
  restoreAll() {
    for (const { target, name, value } of originals.reverse())
      Reflect.set(target, name, value);
  },
};

before(() => {
  process.env.CHAT_MASTER_KEY = randomBytes(32).toString("base64");
  stored = encryptStoredMessage("Nur berechtigte Leser", context);
  // Mock only database I/O; authorization and encryption use the production services.
  mock.method(
    prisma,
    "$transaction",
    async (work: (db: typeof prisma) => unknown) => work(prisma),
  );
  mock.method(
    prisma.user,
    "findUnique",
    async ({ where }: { where: { id: string } }) => ({
      role:
        where.id === "owner" || where.id === "banned-owner"
          ? "OWNER"
          : "INTERN",
      banned: where.id === "banned-owner",
    }),
  );
  mock.method(
    prisma.chatMembership,
    "findUnique",
    async ({
      where,
    }: {
      where: {
        conversationId_userId: { userId: string; conversationId: string };
      };
    }) => {
      const id = where.conversationId_userId;
      return ["alice", "bob"].includes(id.userId) &&
        id.conversationId === "chat-1"
        ? {
            conversation: {
              firstUserId: "alice",
              secondUserId: "bob",
              nextSequence: 1,
            },
          }
        : null;
    },
  );
  mock.method(prisma.friendship, "findUnique", async () => ({
    status: "ACCEPTED",
    requester: { banned: false },
    recipient: { banned: false },
  }));
  mock.method(prisma.chatMessage, "findMany", async () => [
    {
      ...context,
      id: "message-1",
      sequence: 1,
      text: null,
      encrypted: stored,
      createdAt: new Date("2026-10-12T10:00:00Z"),
      editedAt: null,
      sender: { name: "Alice" },
    },
  ]);
  mock.method(
    prisma.chatMessage,
    "findFirst",
    async ({ where }: { where: { id?: string; senderId?: string } }) =>
      where.id === "message-1" && where.senderId === "alice"
        ? { clientId: context.clientId }
        : null,
  );
  mock.method(
    prisma.chatMessage,
    "updateMany",
    async ({ data }: { data: { text: null; encrypted: typeof stored } }) => {
      assert.equal(data.text, null);
      stored = data.encrypted;
      edits++;
      return { count: 1 };
    },
  );
  mock.method(prisma.directConversation, "findUnique", async () => ({
    firstUser: { name: "Alice" },
    secondUser: { name: "Bob" },
  }));
  mock.method(prisma.directConversation, "update", async () => ({}));
});
after(() => {
  mock.restoreAll();
  if (previousKey === undefined) delete process.env.CHAT_MASTER_KEY;
  else process.env.CHAT_MASTER_KEY = previousKey;
});

test("participants receive plaintext only after membership checks; outsiders and nonparticipant Owners are denied on the ordinary endpoint", async () => {
  assert.equal(
    (await getMessagePage("bob", "chat-1")).messages[0].text,
    "Nur berechtigte Leser",
  );
  assert.ok(
    !("encrypted" in (await getMessagePage("alice", "chat-1")).messages[0]),
  );
  for (const user of ["outsider", "owner"])
    await assert.rejects(getMessagePage(user, "chat-1"), ChatError);
});

test("the dedicated Owner reader checks the current database role and ban state", async () => {
  assert.equal(
    (await getOwnerMessagePage("owner", "chat-1")).messages[0].text,
    "Nur berechtigte Leser",
  );
  for (const user of ["alice", "bob", "former-owner", "banned-owner"])
    await assert.rejects(getOwnerMessagePage(user, "chat-1"), ChatError);
});

test("recipients and Owners cannot edit another author's message; the author's edit remains encrypted", async () => {
  for (const user of ["bob", "outsider", "owner"])
    await assert.rejects(
      updateChatMessage(user, "chat-1", "message-1", "Unbefugte Änderung"),
      ChatError,
    );
  assert.equal(edits, 0);
  await updateChatMessage(
    "alice",
    "chat-1",
    "message-1",
    "Berechtigte Änderung",
  );
  assert.equal(edits, 1);
  assert.equal(decryptStoredMessage(stored, context), "Berechtigte Änderung");
  assert.ok(!JSON.stringify(stored).includes("Berechtigte Änderung"));
});
