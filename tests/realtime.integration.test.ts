import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Rest, Realtime } from "ably";
import { userChannel } from "../src/lib/realtime-channel";

test("user channels escape capability wildcards", () => {
  assert.ok(!userChannel("unsafe:*id").includes("*"));
  assert.notEqual(userChannel("a:b"), userChannel("a%3Ab"));
});

test(
  "Ably delivers via WebSocket and rejects other user channels and client publishing",
  { skip: !process.env.ABLY_API_KEY, timeout: 30000 },
  async () => {
    const userId = `integration-${randomUUID()}`;
    const channelName = userChannel(userId);
    const server = new Rest({ key: process.env.ABLY_API_KEY, logLevel: 0 });
    const token = await server.auth.requestToken({
      clientId: userId,
      ttl: 60_000,
      capability: JSON.stringify({ [channelName]: ["subscribe"] }),
    });
    assert.deepEqual(JSON.parse(token.capability), {
      [channelName]: ["subscribe"],
    });
    const client = new Realtime({
      token: token.token,
      transports: ["web_socket"],
      logLevel: 0,
    });
    const channel = client.channels.get(channelName);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const received = new Promise<void>((resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("WebSocket event timed out")),
          15000,
        );
        void channel.subscribe("chat.changed", () => resolve()).catch(reject);
      });
      await channel.attach();
      await server.channels.get(channelName).publish("chat.changed", {});
      await received;
      await assert.rejects(
        client.channels.get(userChannel(`other-${randomUUID()}`)).attach(),
      );
      await assert.rejects(channel.publish("chat.changed", {}));
    } finally {
      if (timer) clearTimeout(timer);
      channel.unsubscribe();
      client.close();
    }
  },
);
