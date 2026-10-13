import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

test(
  "server encrypted chats preserve access rules, retries, pagination and Owner read access",
  {
    skip:
      !process.env.CHAT_TEST_DATABASE_URL ||
      process.env.DATABASE_ENV !== "development",
  },
  async () => {
    // An explicit test-only connection is required; never use the ordinary app URL.
    process.env.DATABASE_URL = process.env.CHAT_TEST_DATABASE_URL;
    process.env.CHAT_MASTER_KEY = randomBytes(32).toString("base64");
    const { prisma } = await import("../src/lib/prisma");
    const {
      ChatError,
      createChatMessage,
      getConversationsForUser,
      getMessagePage,
      hideConversation,
      markConversationRead,
      openDirectConversation,
      removeChatMessage,
      updateChatMessage,
    } = await import("../src/lib/chat");
    const { getOwnerConversations, getOwnerMessagePage } =
      await import("../src/lib/owner-chat");
    const { acceptFriendshipRequest, removeFriendship, sendFriendshipRequest } =
      await import("../src/lib/friends");
    const ids = Array.from({ length: 4 }, () => randomUUID());
    const [alice, bob, outsider, owner] = ids;
    try {
      await prisma.user.createMany({
        data: ids.map((id, index) => ({
          id,
          name: "Chat test " + index,
          email: id + "@example.com",
          role: index === 3 ? "OWNER" : "INTERN",
        })),
      });
      await assert.rejects(openDirectConversation(alice, bob), ChatError);
      await assert.rejects(openDirectConversation(alice, alice), ChatError);
      const friendship = await sendFriendshipRequest(alice, bob);
      await acceptFriendshipRequest(bob, friendship.id);
      const opened = await Promise.all([
        openDirectConversation(alice, bob),
        openDirectConversation(bob, alice),
      ]);
      const id = opened[0];
      assert.equal(opened[1], id);
      const send = (sender: string, text: string, clientId = randomUUID()) =>
        createChatMessage(sender, id, text, clientId);
      await assert.rejects(getMessagePage(outsider, id), ChatError);
      await assert.rejects(send(outsider, "Access denied"), ChatError);
      await assert.rejects(markConversationRead(outsider, id, 1), ChatError);
      await assert.rejects(hideConversation(outsider, id), ChatError);
      const retryId = randomUUID();
      const message = await send(alice, "Hallo Bob 👋", retryId);
      assert.equal(message.text, null);
      assert.ok(!JSON.stringify(message.encrypted).includes("Hallo Bob"));
      assert.equal((message.encrypted as { version: number }).version, 2);
      assert.equal((await send(alice, "Hallo Bob 👋", retryId)).id, message.id);
      await assert.rejects(
        send(alice, "Different content", retryId),
        ChatError,
      );
      const page = await getMessagePage(bob, id);
      assert.equal(page.messages[0].text, "Hallo Bob 👋");
      assert.ok(!("encrypted" in page.messages[0]));
      assert.equal((await getConversationsForUser(bob))[0].unreadCount, 1);
      await assert.rejects(
        updateChatMessage(bob, id, message.id, "Other author"),
        ChatError,
      );
      await assert.rejects(removeChatMessage(bob, id, message.id), ChatError);
      await updateChatMessage(alice, id, message.id, "Hallo Bob 😊");
      assert.equal(
        (await getMessagePage(bob, id)).messages[0].text,
        "Hallo Bob 😊",
      );
      await assert.rejects(getOwnerConversations(outsider), ChatError);
      await assert.rejects(getOwnerMessagePage(outsider, id), ChatError);
      assert.ok(
        (await getOwnerConversations(owner)).conversations.some(
          (row) => row.id === id,
        ),
      );
      assert.equal(
        (await getOwnerMessagePage(owner, id)).messages[0].text,
        "Hallo Bob 😊",
      );
      assert.equal((await getConversationsForUser(bob))[0].unreadCount, 1);
      await prisma.user.update({
        where: { id: owner },
        data: { banned: true },
      });
      await assert.rejects(getOwnerMessagePage(owner, id), ChatError);
      await prisma.user.update({
        where: { id: owner },
        data: { banned: false },
      });
      await markConversationRead(bob, id, message.sequence);
      assert.equal((await getConversationsForUser(bob))[0].unreadCount, 0);
      await assert.rejects(markConversationRead(bob, id, 999999), ChatError);
      const duplicateId = randomUUID();
      const duplicates = await Promise.all([
        send(alice, "Retry", duplicateId),
        send(alice, "Retry", duplicateId),
      ]);
      assert.equal(duplicates[0].id, duplicates[1].id);
      const concurrent = await Promise.all([send(alice, "A"), send(bob, "B")]);
      assert.notEqual(concurrent[0].sequence, concurrent[1].sequence);
      await hideConversation(alice, id);
      assert.equal((await getConversationsForUser(alice)).length, 0);
      await send(bob, "Noch da?");
      assert.equal((await getConversationsForUser(alice))[0].id, id);
      await removeChatMessage(alice, id, message.id);
      assert.ok(
        !(await getMessagePage(bob, id)).messages.some(
          (row) => row.id === message.id,
        ),
      );
      await removeFriendship(bob, friendship.id);
      assert.equal((await getMessagePage(alice, id)).canSend, false);
      await assert.rejects(send(alice, "Not a contact"), ChatError);
      const renewed = await sendFriendshipRequest(alice, bob);
      await acceptFriendshipRequest(bob, renewed.id);
      for (let index = 0; index < 105; index++)
        await send(alice, "History " + index);
      const latest = await getMessagePage(bob, id);
      assert.equal(latest.messages.length, 100);
      assert.equal(latest.hasOlder, true);
      const older = await getMessagePage(bob, id, {
        before: latest.messages[0].sequence,
      });
      assert.ok(older.messages.at(-1)!.sequence < latest.messages[0].sequence);
      const all = await getMessagePage(bob, id, {
        from: older.messages[0].sequence,
      });
      assert.equal(
        all.messages.length,
        older.messages.length + latest.messages.length,
      );
      const ownerLatest = await getOwnerMessagePage(owner, id);
      assert.ok(ownerLatest.before);
      assert.ok(
        (await getOwnerMessagePage(owner, id, ownerLatest.before!)).messages
          .length > 0,
      );
    } finally {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
  },
);
