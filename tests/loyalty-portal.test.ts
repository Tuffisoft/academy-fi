import assert from "node:assert/strict";
import { before, mock, test } from "node:test";

let actorId: string | null = null;
let calls: unknown[][] = [];
let fail = false;
mock.module("../src/lib/session.ts", { namedExports: { getCurrentSession: async () => actorId ? { user: { id: actorId, role: "OWNER" } } : null } });
mock.module("next-intl/server", { namedExports: { getLocale: async () => "de" } });
mock.module("../src/i18n/navigation.ts", { namedExports: { redirect: ({ href }: { href: string }) => { throw new Error(`redirect:${href}`); } } });
mock.module("../src/lib/loyalty/organizations.ts", { namedExports: {
  OrganizationAccessError: class extends Error {},
  createOrganization: async (...args: unknown[]) => { calls.push(args); if (fail) throw new Error("Database unavailable"); return { slug: "own-company" }; },
} });

let createOrganizationAction: typeof import("../src/lib/loyalty/portal.actions").createOrganizationAction;
let requirePortalActor: typeof import("../src/lib/loyalty/portal-session").requirePortalActor;
before(async () => {
  ({ createOrganizationAction } = await import("../src/lib/loyalty/portal.actions"));
  ({ requirePortalActor } = await import("../src/lib/loyalty/portal-session"));
});

test("direct company action and portal entry require the existing Better Auth session", async () => {
  actorId = null; calls = [];
  assert.deepEqual(await createOrganizationAction({ error: null }, new FormData()), { error: "UNAUTHENTICATED" });
  await assert.rejects(requirePortalActor(), /redirect:\/sign-in\?destination=stempelfi/);
  assert.equal(calls.length, 0);
});

test("direct action ignores injected identity and returns a destination only after service success", async () => {
  actorId = "session-actor"; calls = []; fail = false;
  assert.equal(await requirePortalActor(), "session-actor");
  const form = new FormData();
  form.set("name", "Own business"); form.set("operationId", "stable-operation"); form.set("actorId", "foreign-actor"); form.set("role", "OWNER"); form.set("returnTo", "https://foreign.invalid");
  assert.deepEqual(await createOrganizationAction({ error: null }, form), { error: null, slug: "own-company" });
  assert.deepEqual(calls, [["session-actor", "Own business", "stable-operation"]]);
  fail = true;
  assert.deepEqual(await createOrganizationAction({ error: null }, form), { error: "UNAVAILABLE" });
  assert.deepEqual(calls[1], calls[0]);
});
