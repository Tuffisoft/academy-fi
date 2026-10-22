import assert from "node:assert/strict";
import { after, afterEach, beforeEach, test } from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { ChatError } from "../src/lib/chat/services/chat-message";
import {
  getConversationParticipants,
  getConversationsForUser,
  getMessagePage,
} from "../src/lib/chat/services/chat";
import {
  changeGroupRole,
  createGroup,
  createGroupMessage,
  deleteGroupMessage,
  editGroupMessage,
  getGroupMessagePage,
  getGroupInvitations,
  inviteGroupContacts,
  markGroupRead,
  removeGroupMember,
  renameGroup,
  respondToGroupInvitation,
} from "../src/lib/chat/services/groups";
import { encryptStoredMessage } from "../src/lib/chat/server-encryption";

const previousKey = process.env.CHAT_MASTER_KEY;
const groupId = "group_test";
type Member = {
  conversationId: string;
  userId: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED";
  joinedSequence: number;
  lastReadSequence: number;
  joinedAt: Date;
};
const originals: Array<{ target: object; name: string; value: unknown }> = [];
function mock(target: object, name: string, replacement: unknown) {
  originals.push({ target, name, value: Reflect.get(target, name) });
  Reflect.set(target, name, replacement);
}

let group: {
  id: string;
  name: string;
  nextSequence: number;
  archivedAt: Date | null;
  updatedAt: Date;
};
let members: Map<string, Member>;
let writes: number;
let messageQuery: { gt: number; lt?: number; gte?: number };
let saved: ReturnType<typeof message> | null;
let banned: Set<string>;
let validContacts: number;

function message(sequence: number, senderId = "alice") {
  const context = {
    conversationId: groupId,
    senderId,
    clientId: `retry-${sequence}`,
  };
  return {
    ...context,
    id: `message-${sequence}`,
    sequence,
    encrypted: encryptStoredMessage(`Message ${sequence}`, context),
    createdAt: new Date("2026-10-14T10:00:00Z"),
    editedAt: null as Date | null,
    sender: { name: senderId },
  };
}

function member(
  userId: string,
  role: Member["role"],
  status: Member["status"],
  joinedSequence = 0,
): Member {
  return {
    conversationId: groupId,
    userId,
    role,
    status,
    joinedSequence,
    lastReadSequence: joinedSequence,
    joinedAt: new Date("2026-10-14T09:00:00Z"),
  };
}

beforeEach(() => {
  process.env.CHAT_MASTER_KEY = randomBytes(32).toString("base64");
  group = {
    id: groupId,
    name: "Team",
    nextSequence: 7,
    archivedAt: null,
    updatedAt: new Date("2026-10-14T10:00:00Z"),
  };
  members = new Map([
    ["alice", member("alice", "ADMIN", "ACTIVE")],
    ["bob", member("bob", "MEMBER", "INVITED")],
    ["carol", member("carol", "MEMBER", "ACTIVE", 5)],
  ]);
  writes = 0;
  saved = null;
  banned = new Set();
  validContacts = 1;
  mock(prisma, "$transaction", async (work: (db: typeof prisma) => unknown) =>
    work(prisma),
  );
  mock(
    prisma.user,
    "findUnique",
    async ({ where }: { where: { id: string } }) =>
      where.id === "missing" ? null : { banned: banned.has(where.id) },
  );
  mock(prisma.friendship, "findMany", async () =>
    Array.from({ length: validContacts }, (_, id) => ({ id: String(id) })),
  );
  mock(prisma.groupConversation, "updateMany", async () => ({
    count: group.archivedAt ? 0 : 1,
  }));
  mock(
    prisma.groupConversation,
    "update",
    async ({
      data,
    }: {
      data: {
        name?: string;
        archivedAt?: Date;
        nextSequence?: { increment: number };
      };
    }) => {
      if (data.name) group.name = data.name;
      if (data.archivedAt) group.archivedAt = data.archivedAt;
      if (data.nextSequence) group.nextSequence += data.nextSequence.increment;
      return { ...group };
    },
  );
  mock(
    prisma.groupConversation,
    "create",
    async ({
      data,
    }: {
      data: {
        id: string;
        name: string;
        members: {
          create: Array<{
            userId: string;
            role: Member["role"];
            status: Member["status"];
          }>;
        };
      };
    }) => {
      members.clear();
      for (const row of data.members.create)
        members.set(row.userId, member(row.userId, row.role, row.status));
      return { id: data.id, name: data.name };
    },
  );
  mock(
    prisma.groupMembership,
    "findUnique",
    async ({
      where,
    }: {
      where: {
        conversationId_userId: { userId: string; conversationId: string };
      };
    }) => {
      const key = where.conversationId_userId;
      const row =
        key.conversationId === groupId ? members.get(key.userId) : undefined;
      return row ? { ...row, conversation: { ...group } } : null;
    },
  );
  mock(
    prisma.groupMembership,
    "findMany",
    async ({
      where,
    }: {
      where: { status?: Member["status"]; userId?: string; user?: unknown };
    }) =>
      [...members.values()]
        .filter(
          (row) =>
            (!where.status || row.status === where.status) &&
            (!where.userId || row.userId === where.userId) &&
            (!where.user || !banned.has(row.userId)),
        )
        .map((row) => ({
          ...row,
          user: { name: row.userId },
          conversation: { ...group, messages: [message(7)] },
        })),
  );
  mock(prisma.chatMembership, "findMany", async () => []);
  mock(prisma.groupMessage, "groupBy", async () => [
    { conversationId: groupId, _count: { _all: 2 } },
  ]);
  mock(
    prisma.groupMembership,
    "count",
    async ({
      where,
    }: {
      where: {
        userId?: { not: string };
        role?: Member["role"];
        status?: Member["status"];
      };
    }) =>
      [...members.values()].filter(
        (row) =>
          row.userId !== where.userId?.not &&
          (!where.role || row.role === where.role) &&
          (!where.status || row.status === where.status) &&
          !banned.has(row.userId),
      ).length,
  );
  mock(
    prisma.groupMembership,
    "findFirst",
    async ({ where }: { where: { userId: { not: string } } }) =>
      [...members.values()].find(
        (row) =>
          row.userId !== where.userId.not &&
          row.status === "ACTIVE" &&
          !banned.has(row.userId),
      ) ?? null,
  );
  mock(
    prisma.groupMembership,
    "update",
    async ({
      where,
      data,
    }: {
      where: { conversationId_userId: { userId: string } };
      data: Partial<Member>;
    }) => {
      const row = members.get(where.conversationId_userId.userId)!;
      Object.assign(row, data);
      return row;
    },
  );
  mock(
    prisma.groupMembership,
    "updateMany",
    async ({
      where,
      data,
    }: {
      where: { userId: string };
      data: Partial<Member>;
    }) => {
      const row = members.get(where.userId);
      if (row) Object.assign(row, data);
      return { count: row ? 1 : 0 };
    },
  );
  mock(
    prisma.groupMembership,
    "delete",
    async ({
      where,
    }: {
      where: { conversationId_userId: { userId: string } };
    }) => members.delete(where.conversationId_userId.userId),
  );
  mock(prisma.groupMembership, "deleteMany", async () => {
    members.clear();
    return { count: 1 };
  });
  mock(
    prisma.groupMembership,
    "createMany",
    async ({ data }: { data: Array<{ userId: string }> }) => {
      for (const row of data)
        members.set(row.userId, member(row.userId, "MEMBER", "INVITED"));
      return { count: data.length };
    },
  );
  mock(
    prisma.groupMessage,
    "findMany",
    async ({ where }: { where: { sequence: typeof messageQuery } }) => {
      messageQuery = where.sequence;
      return [message(7), message(6)].filter(
        (row) =>
          row.sequence > where.sequence.gt &&
          (!where.sequence.lt || row.sequence < where.sequence.lt) &&
          (!where.sequence.gte || row.sequence >= where.sequence.gte),
      );
    },
  );
  mock(prisma.groupMessage, "findUnique", async () => saved);
  mock(
    prisma.groupMessage,
    "findFirst",
    async ({
      where,
    }: {
      where: { id?: string; senderId?: string; sequence: { gt: number } };
    }) => {
      const row = message(6);
      return where.id === row.id &&
        where.senderId === row.senderId &&
        row.sequence > where.sequence.gt
        ? row
        : null;
    },
  );
  mock(
    prisma.groupMessage,
    "create",
    async ({ data }: { data: ReturnType<typeof message> }) => {
      writes++;
      saved = { ...message(data.sequence, data.senderId), ...data };
      return saved;
    },
  );
  mock(prisma.groupMessage, "update", async () => {
    writes++;
  });
  mock(
    prisma.groupMessage,
    "deleteMany",
    async ({
      where,
    }: {
      where: { id: string; senderId: string; sequence: { gt: number } };
    }) => {
      const allowed =
        where.id === "message-6" &&
        where.senderId === "alice" &&
        where.sequence.gt < 6;
      if (allowed) writes++;
      return { count: allowed ? 1 : 0 };
    },
  );
});

afterEach(() => {
  for (const { target, name, value } of originals.splice(0).reverse())
    Reflect.set(target, name, value);
});

after(() => {
  if (previousKey === undefined) delete process.env.CHAT_MASTER_KEY;
  else process.env.CHAT_MASTER_KEY = previousKey;
});

test("invited users, outsiders and banned members cannot read or send group messages", async () => {
  banned.add("alice");
  for (const userId of ["bob", "outsider", "alice", "missing"]) {
    await assert.rejects(getGroupMessagePage(userId, groupId), ChatError);
    await assert.rejects(
      createGroupMessage(userId, groupId, "Forbidden", "retry"),
      ChatError,
    );
  }
  assert.equal(writes, 0);
});

test("ordinary members cannot invite, rename, promote or remove someone else", async () => {
  await assert.rejects(
    inviteGroupContacts("carol", groupId, ["outsider"]),
    ChatError,
  );
  await assert.rejects(renameGroup("carol", groupId, "New team"), ChatError);
  await assert.rejects(
    changeGroupRole("carol", groupId, "carol", "ADMIN"),
    ChatError,
  );
  await assert.rejects(removeGroupMember("carol", groupId, "alice"), ChatError);
  assert.equal(members.get("carol")!.role, "MEMBER");
  assert.ok(members.has("alice"));
});

test("acceptance starts history and unread counters at the current group sequence", async () => {
  await assert.rejects(
    respondToGroupInvitation("outsider", groupId, true),
    ChatError,
  );
  await respondToGroupInvitation("bob", groupId, true);
  assert.equal(members.get("bob")!.joinedSequence, 7);
  assert.equal(members.get("bob")!.lastReadSequence, 7);
  assert.equal((await getGroupMessagePage("bob", groupId)).messages.length, 0);
  assert.equal(messageQuery.gt, 7);
  await assert.rejects(
    respondToGroupInvitation("bob", groupId, true),
    ChatError,
  );
});

test("history pagination always respects the join boundary; only admins see invitations", async () => {
  const page = await getGroupMessagePage("carol", groupId, {
    before: 7,
    from: 1,
  });
  assert.deepEqual(messageQuery, { gt: 5, lt: 7, gte: 1 });
  assert.deepEqual(
    page.messages.map((row) => row.sequence),
    [6],
  );
  assert.equal(page.group!.canManage, false);
  assert.ok(page.group!.members.every((row) => row.status === "ACTIVE"));
  assert.ok(
    (await getGroupMessagePage("alice", groupId)).group!.members.some(
      (row) => row.status === "INVITED",
    ),
  );
});

test("retries reuse a persisted message but cannot retrieve a message from before rejoining", async () => {
  const first = await createGroupMessage("carol", groupId, "Hello", "retry");
  const second = await createGroupMessage("carol", groupId, "Hello", "retry");
  assert.equal(first.id, second.id);
  assert.equal(writes, 1);
  await assert.rejects(
    createGroupMessage("carol", groupId, "Different", "retry"),
    ChatError,
  );
  members.get("carol")!.joinedSequence = first.sequence;
  await assert.rejects(
    createGroupMessage("carol", groupId, "Hello", "retry"),
    ChatError,
  );
});

test("only authors can edit or delete visible messages; membership revocation removes access", async () => {
  await assert.rejects(
    editGroupMessage("carol", groupId, "message-6", "Changed"),
    ChatError,
  );
  await assert.rejects(
    deleteGroupMessage("carol", groupId, "message-6"),
    ChatError,
  );
  await editGroupMessage("alice", groupId, "message-6", "Changed");
  await deleteGroupMessage("alice", groupId, "message-6");
  assert.equal(writes, 2);
  const affected = await removeGroupMember("alice", groupId, "carol");
  assert.ok(affected.includes("carol"));
  await assert.rejects(getGroupMessagePage("carol", groupId), ChatError);
  await assert.rejects(markGroupRead("carol", groupId, 7), ChatError);
});

test("the last admin cannot be demoted; leaving transfers administration to a remaining member", async () => {
  await assert.rejects(
    changeGroupRole("alice", groupId, "alice", "MEMBER"),
    ChatError,
  );
  await removeGroupMember("alice", groupId, "alice");
  assert.equal(members.has("alice"), false);
  assert.equal(members.get("carol")!.role, "ADMIN");
});

test("the final available member leaving archives the group and revokes pending invitations", async () => {
  members.delete("carol");
  const affected = await removeGroupMember("alice", groupId, "alice");
  assert.deepEqual(affected.sort(), ["alice", "bob"]);
  assert.ok(group.archivedAt);
  assert.equal(members.size, 0);
});

test("creation and invitations validate names, confirmed contacts, account status and capacity", async () => {
  await assert.rejects(createGroup("alice", " ", []), ChatError);
  await assert.rejects(createGroup("alice", "Team", ["alice"]), ChatError);
  validContacts = 0;
  await assert.rejects(
    inviteGroupContacts("alice", groupId, ["outsider"]),
    ChatError,
  );
  await assert.rejects(
    createGroup(
      "alice",
      "Team",
      Array.from({ length: 50 }, (_, index) => `user-${index}`),
    ),
    ChatError,
  );
  validContacts = 1;
  const created = await createGroup("alice", "  New team  ", ["bob", "bob"]);
  assert.ok(created.id.startsWith("group_"));
  assert.equal(members.get("alice")!.role, "ADMIN");
  assert.equal(members.get("alice")!.status, "ACTIVE");
  assert.equal(members.get("bob")!.status, "INVITED");
  assert.equal(members.size, 2);
});

test("read counters reject invalid sequences and cannot advance beyond the group's latest message", async () => {
  for (const sequence of [0, -1, 1.5, Number.NaN, 8, 5])
    await assert.rejects(markGroupRead("carol", groupId, sequence), ChatError);
  await markGroupRead("carol", groupId, 7);
  assert.equal(members.get("carol")!.lastReadSequence, 7);
});

test("the shared chat API routes groups and distinguishes invitations from active conversations", async () => {
  assert.equal((await getConversationsForUser("bob")).length, 0);
  assert.deepEqual(await getGroupInvitations("bob"), [
    { conversationId: groupId, name: "Team" },
  ]);
  const conversations = await getConversationsForUser("carol");
  assert.equal(conversations[0].group, true);
  assert.equal(conversations[0].lastMessage, "Message 7");
  assert.equal(conversations[0].unreadCount, 2);
  assert.equal((await getMessagePage("carol", groupId)).group!.name, "Team");
  members.get("carol")!.joinedSequence = 7;
  assert.equal((await getConversationsForUser("carol"))[0].lastMessage, null);
});

test("realtime recipients include all active members and exclude invitations, removals and banned accounts", async () => {
  await respondToGroupInvitation("bob", groupId, true);
  assert.deepEqual((await getConversationParticipants(groupId)).sort(), [
    "alice",
    "bob",
    "carol",
  ]);
  banned.add("carol");
  assert.deepEqual((await getConversationParticipants(groupId)).sort(), [
    "alice",
    "bob",
  ]);
  await removeGroupMember("alice", groupId, "bob");
  assert.deepEqual(await getConversationParticipants(groupId), ["alice"]);
});

test("invitations cannot exceed the combined limit of active and pending members", async () => {
  for (let index = 0; index < 47; index++)
    members.set(
      `user-${index}`,
      member(`user-${index}`, "MEMBER", index % 2 ? "ACTIVE" : "INVITED"),
    );
  await assert.rejects(
    inviteGroupContacts("alice", groupId, ["outsider"]),
    ChatError,
  );
  assert.equal(members.size, 50);
});
