import { databaseIntegrationEnvironment } from "../scripts/quality-environment.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("friendship lifecycle and permissions", { timeout: 120_000 }, async () => {
  databaseIntegrationEnvironment({ ...process.env, DATABASE_URL: "" });
  process.env.DATABASE_URL = process.env.CHAT_TEST_DATABASE_URL;
  const { prisma } = await import("../src/lib/prisma");
  const {
    FriendshipError, acceptFriendshipRequest, cancelFriendshipRequest,
    declineFriendshipRequest, getFriendsForUser, removeFriendship,
    searchUsersForFriendship, sendFriendshipRequest,
  } = await import("../src/lib/chat/services/friends");
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const [sender, recipient, outsider] = ids;
  const marker = `FriendTest${randomUUID()}`;

  try {
    await prisma.user.createMany({
      data: ids.map((id, index) => ({
        id,
        name: `${marker} ${index}`,
        email: `${id}@example.com`,
      })),
    });
    const matches = await searchUsersForFriendship(
      sender,
      marker.toLowerCase(),
    );
    assert.equal(matches.length, 2);
    assert.ok(matches.every((user) => user.id !== sender));
    await assert.rejects(
      sendFriendshipRequest(sender, sender),
      FriendshipError,
    );

    const request = await sendFriendshipRequest(sender, recipient);
    assert.equal((await getFriendsForUser(sender)).outgoing[0].id, request.id);
    assert.equal(
      (await getFriendsForUser(recipient)).incoming[0].id,
      request.id,
    );
    assert.deepEqual(await getFriendsForUser(outsider), {
      friends: [],
      incoming: [],
      outgoing: [],
    });
    await assert.rejects(
      sendFriendshipRequest(recipient, sender),
      FriendshipError,
    );
    await assert.rejects(
      acceptFriendshipRequest(outsider, request.id),
      FriendshipError,
    );
    await assert.rejects(
      acceptFriendshipRequest(sender, request.id),
      FriendshipError,
    );
    await assert.rejects(
      declineFriendshipRequest(outsider, request.id),
      FriendshipError,
    );
    await assert.rejects(
      cancelFriendshipRequest(recipient, request.id),
      FriendshipError,
    );

    await acceptFriendshipRequest(recipient, request.id);
    assert.equal(
      (await getFriendsForUser(sender)).friends[0].userId,
      recipient,
    );
    assert.equal(
      (await getFriendsForUser(recipient)).friends[0].userId,
      sender,
    );
    assert.equal((await getFriendsForUser(recipient)).incoming.length, 0);
    await assert.rejects(
      cancelFriendshipRequest(sender, request.id),
      FriendshipError,
    );
    await assert.rejects(
      acceptFriendshipRequest(recipient, request.id),
      FriendshipError,
    );

    await assert.rejects(
      removeFriendship(outsider, request.id),
      FriendshipError,
    );
    await removeFriendship(recipient, request.id);
    assert.equal((await getFriendsForUser(sender)).friends.length, 0);
    assert.equal((await getFriendsForUser(recipient)).friends.length, 0);
    const renewed = await sendFriendshipRequest(sender, recipient);
    await assert.rejects(removeFriendship(sender, renewed.id), FriendshipError);
    await acceptFriendshipRequest(recipient, renewed.id);
    await removeFriendship(sender, renewed.id);

    const declined = await sendFriendshipRequest(sender, outsider);
    await declineFriendshipRequest(outsider, declined.id);
    assert.equal((await getFriendsForUser(sender)).outgoing.length, 0);
    const canceled = await sendFriendshipRequest(sender, outsider);
    await cancelFriendshipRequest(sender, canceled.id);
    assert.equal((await getFriendsForUser(outsider)).incoming.length, 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
