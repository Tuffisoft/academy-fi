import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { createServer as createProxy, request as forwardRequest } from "node:http";
import test from "node:test";
import { z } from "zod";
import { makeSignature } from "better-auth/crypto";
import {
  databaseIntegrationEnvironment,
  isolatedEnvironment,
} from "../../scripts/quality-environment.mjs";
import {
  defaultProgram,
  resourceId,
} from "../../src/lib/loyalty/program-input";

// Real HTTP, authentication, page rendering and DB; no browser/device claim.
test(
  "isolated portal: authenticated pages, API replay, revision conflict and revoked rights",
  { timeout: 180_000 },
  async () => {
    const env = databaseIntegrationEnvironment(
      { ...process.env, DATABASE_URL: "" },
      undefined,
      "LOYALTY_TEST_DATABASE_URL",
    );
    process.env.DATABASE_URL = env.DATABASE_URL;
    const { prisma } = await import("../../src/lib/prisma");
    const actor = randomUUID(),
      org = randomUUID(),
      foreign = randomUUID(),
      token = randomBytes(32).toString("hex");
    const secret = randomBytes(48).toString("hex");
    const socket = createServer();
    socket.listen(0, "127.0.0.1");
    await once(socket, "listening");
    const address = socket.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve, reject) =>
      socket.close((error) => (error ? reject(error) : resolve())),
    );
    let dropNextWrite = false, droppedResponses = 0;
    const proxy = createProxy((incoming, outgoing) => {
      const drop = dropNextWrite && ["POST", "PATCH"].includes(incoming.method ?? "");
      if (drop) dropNextWrite = false;
      const upstream = forwardRequest({ hostname: "127.0.0.1", port, path: incoming.url, method: incoming.method, headers: incoming.headers }, response => {
        if (drop) {
          // Fully drain the real server response (after commit), then lose it at
          // the transport boundary. No service/transaction mocks or product hook.
          response.resume();
          response.once("end", () => { droppedResponses++; outgoing.destroy(); });
        } else {
          outgoing.writeHead(response.statusCode ?? 502, response.headers);
          response.pipe(outgoing);
        }
        response.on("error", () => outgoing.destroy());
      });
      upstream.on("error", () => { outgoing.writeHead(503); outgoing.end(); });
      incoming.pipe(upstream);
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const proxyAddress = proxy.address();
    assert.ok(proxyAddress && typeof proxyAddress === "object");
    const base = `http://127.0.0.1:${proxyAddress.port}`;
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...isolatedEnvironment(),
          DATABASE_URL: env.DATABASE_URL,
          DATABASE_ENV: "development",
          NODE_ENV: "production",
          BETTER_AUTH_URL: base,
          BETTER_AUTH_SECRET: secret,
        },
        stdio: "ignore",
      },
    );
    const exited = once(child, "exit");
    const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${await makeSignature(token, secret)}`)}`;
    const path = `/api/loyalty/organizations/${org}/programs`;
    const portal = `/de/tools/calem/stempelkarten/app/${org}`;
    const request = (
      url: string,
      method = "GET",
      body?: unknown,
      authenticated = true,
    ) =>
      fetch(base + url, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(30_000),
        headers: {
          origin: base,
          ...(authenticated ? { cookie } : {}),
          "content-type": "application/json",
          "accept-language": "de",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const ready = await fetch(`${base}/de/tools/calem/stempelkarten/preview`, {
            signal: AbortSignal.timeout(1000),
          });
          if (!ready.ok) throw new Error("ISOLATED_SERVER_NOT_READY");
          break;
        } catch {
          if (attempt >= 50 || child.exitCode !== null)
            throw new Error("ISOLATED_SERVER_NOT_READY");
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      await prisma.user.create({
        data: {
          id: actor,
          name: "Isolated portal test",
          email: `${actor}@example.invalid`,
          role: "CUSTOMER",
          emailVerified: true,
        },
      });
      await prisma.session.create({
        data: {
          id: randomUUID(),
          userId: actor,
          token,
          expiresAt: new Date(Date.now() + 600_000),
        },
      });
      for (const id of [org, foreign])
        await prisma.organization.create({
          data: {
            id,
            slug: id,
            name: "Isolated portal test",
            status: "ACTIVE",
            entitlement: { create: { plan: "FREE" } },
            memberships: { create: { userId: actor, role: "OWNER" } },
          },
        });
      assert.equal((await request(path, "POST", {}, false)).status, 401);
      const overview = await request(portal);
      assert.equal(overview.status, 200);
      assert.match(await overview.text(), /Noch keine Entwürfe vorhanden/);
      const newDraftPage = await request(`${portal}/programs/new`);
      assert.equal(newDraftPage.status, 200);
      assert.match(await newDraftPage.text(), /role="status"[^>]*>Nicht gespeichert<\/p>/);
      const input = {
        operationId: randomUUID(),
        config: { ...defaultProgram, name: "Portal proof", reward: "Coffee" },
      };
      dropNextWrite = true;
      await assert.rejects(request(path, "POST", input), TypeError);
      assert.equal(droppedResponses, 1);
      assert.equal(await prisma.loyaltyProgram.count({ where: { organizationId: org } }), 1);
      assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org } }), 1);
      assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "PROGRAM_SAVE" } }), 1);
      const created = await request(path, "POST", input);
      assert.equal(created.status, 200);
      const parsed = z
        .object({
          ok: z.literal(true),
          data: z.object({
            program: z.object({ id: resourceId, revision: z.literal(1) }),
          }),
        })
        .parse(await created.json());
      const id = parsed.data.program.id;
      assert.equal((await request(path, "POST", input)).status, 200);
      assert.equal(
        await prisma.loyaltyProgram.count({ where: { organizationId: org } }),
        1,
      );
      assert.equal(
        (
          await request(path, "POST", {
            ...input,
            config: { ...input.config, name: "Other" },
          })
        ).status,
        409,
      );
      const update = {
        ...input,
        operationId: randomUUID(),
        expectedRevision: 1,
        config: { ...input.config, name: "Updated portal proof" },
      };
      dropNextWrite = true;
      await assert.rejects(request(`${path}/${id}`, "PATCH", update), TypeError);
      assert.equal(droppedResponses, 2);
      assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id } })).revision, 2);
      assert.equal(
        (await request(`${path}/${id}`, "PATCH", update)).status,
        200,
      );
      assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id } })).revision, 2);
      assert.equal(await prisma.loyaltyOperation.count({ where: { organizationId: org } }), 2);
      assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "PROGRAM_SAVE" } }), 2);
      assert.equal(
        (
          await request(`${path}/${id}`, "PATCH", {
            ...update,
            operationId: randomUUID(),
          })
        ).status,
        409,
      );
      const reopened = await request(`${portal}/programs/${id}`);
      assert.equal(reopened.status, 200);
      assert.match(await reopened.text(), /Updated portal proof/);
      const english = await request(
        `/en/tools/calem/stempelkarten/app/${org}/programs/${id}`,
      );
      assert.equal(english.status, 200);
      assert.match(await english.text(), /role="status"[^>]*>Saved<\/p>/);
      assert.equal(
        (
          await request(
            `/api/loyalty/organizations/${foreign}/programs/${id}`,
            "PATCH",
            update,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await request(path, "POST", {
            ...input,
            operationId: randomUUID(),
            config: { ...input.config, name: "x".repeat(41) },
          })
        ).status,
        422,
      );
      // Exercise the actual lifecycle route with real authentication and commit loss.
      const lifecyclePath = `${path}/${id}/lifecycle`;
      const publish = { action: "PUBLISH", expectedRevision: 2, operationId: randomUUID() };
      assert.equal((await request(lifecyclePath)).status, 405);
      assert.equal((await request(lifecyclePath, "POST", publish, false)).status, 401);
      assert.equal((await request(lifecyclePath, "POST", { ...publish, actorId: actor })).status, 422);
      assert.equal((await request(lifecyclePath, "POST", { ...publish, organizationId: foreign })).status, 422);
      assert.equal((await request(`/api/loyalty/organizations/${foreign}/programs/${id}/lifecycle`, "POST", publish)).status, 404);
      dropNextWrite = true;
      await assert.rejects(request(lifecyclePath, "POST", publish), TypeError);
      assert.equal(droppedResponses, 3);
      assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id } })).status, "PUBLISHED");
      const lifecycleReplay = await request(lifecyclePath, "POST", publish);
      assert.equal(lifecycleReplay.status, 200);
      assert.equal(lifecycleReplay.headers.get("cache-control"), "private, no-store");
      const lifecycleData = z.object({ ok: z.literal(true), data: z.object({ replayed: z.boolean(), program: z.object({ status: z.literal("PUBLISHED"), revision: z.literal(3) }) }) }).parse(await lifecycleReplay.json());
      assert.equal(lifecycleData.data.replayed, true);
      assert.equal(await prisma.organizationAuditLog.count({ where: { organizationId: org, action: "PROGRAM_PUBLISH" } }), 1);
      assert.equal((await request(lifecyclePath, "POST", { ...publish, action: "BLOCK" })).status, 409);
      assert.equal((await request(lifecyclePath, "POST", { ...publish, operationId: randomUUID() })).status, 409);
      for (const [action, expectedRevision] of [["BLOCK", 3], ["ARCHIVE", 4], ["REACTIVATE", 5], ["UNBLOCK", 6]] as const) {
        assert.equal((await request(lifecyclePath, "POST", { action, expectedRevision, operationId: randomUUID() })).status, 200);
      }
      assert.equal((await prisma.loyaltyProgram.findUniqueOrThrow({ where: { id } })).revision, 7);
      await prisma.organization.update({
        where: { id: org },
        data: { status: "SUSPENDED" },
      });
      assert.equal((await request(path, "POST", input)).status, 403);
      assert.equal((await request(lifecyclePath, "POST", publish)).status, 403);
      const forbiddenPage = await request(`${portal}/programs/${id}`);
      // Next may already have streamed the layout (200) before notFound().
      // Require its explicit 404 boundary as well as absence of tenant data.
      assert.ok([200, 404].includes(forbiddenPage.status));
      const deniedHtml = await forbiddenPage.text();
      assert.match(deniedHtml, /NEXT_HTTP_ERROR_FALLBACK;404/);
      assert.doesNotMatch(deniedHtml, /Updated portal proof/);
    } finally {
      child.kill();
      await exited;
      proxy.closeAllConnections();
      await new Promise<void>((resolve, reject) => proxy.close(error => error ? reject(error) : resolve()));
      try {
        await prisma.$transaction(
          async (tx) => {
            await tx.loyaltyProgram.deleteMany({
              where: { organizationId: { in: [org, foreign] } },
            });
            await tx.organizationAuditLog.deleteMany({
              where: { organizationId: { in: [org, foreign] } },
            });
            await tx.loyaltyOperation.deleteMany({
              where: { organizationId: { in: [org, foreign] } },
            });
            await tx.organizationMembership.deleteMany({
              where: { organizationId: { in: [org, foreign] } },
            });
            await tx.organizationEntitlement.deleteMany({
              where: { organizationId: { in: [org, foreign] } },
            });
            await tx.organization.deleteMany({
              where: { id: { in: [org, foreign] } },
            });
            await tx.session.deleteMany({ where: { userId: actor } });
            await tx.user.deleteMany({ where: { id: actor } });
          },
          { maxWait: 60_000, timeout: 30_000 },
        );
      } finally {
        await prisma.$disconnect();
      }
    }
  },
);
