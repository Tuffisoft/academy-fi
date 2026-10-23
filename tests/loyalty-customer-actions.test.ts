import assert from "node:assert/strict";
import { before, mock, test } from "node:test";

let actor: string | null = null;
let role = "CUSTOMER", banned = false;
let fail = false;
const calls: unknown[][] = [];
mock.module("../src/lib/session.ts", { namedExports: { getCurrentSession: async () => actor ? { user: { id: actor, role: "OWNER" } } : null } });
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { user: { findUnique: async () => ({ role, banned }) } } } });
mock.module("next-intl/server", { namedExports: { getLocale: async () => "de" } });
mock.module("next/navigation", { namedExports: { notFound: () => { throw new Error("notFound"); } } });
mock.module("../src/i18n/navigation.ts", { namedExports: { redirect: ({ href }: { href: string }) => { throw new Error("redirect:" + href); } } });
mock.module("../src/lib/loyalty/customer-account.ts", { namedExports: { CustomerAccountError: class extends Error {}, createCustomerOrganization: async (...args: unknown[]) => { calls.push(args); if (fail) throw new Error("uncertain storage"); return { slug: "owned-business" }; } } });
let create: typeof import("../src/lib/loyalty/customer-onboarding.actions").createCustomerOrganizationAction;
let nextPage: typeof import("../src/app/[locale]/auth/continue/page").default;
before(async () => { create = (await import("../src/lib/loyalty/customer-onboarding.actions")).createCustomerOrganizationAction; nextPage = (await import("../src/app/[locale]/auth/continue/page")).default; });
test("customer action uses authenticated actor and preserves uncertain writes as errors", async () => {
  const form = new FormData(); form.set("actorId", "foreign"); form.set("role", "OWNER"); form.set("name", "Business"); form.set("operationId", "stable-key");
  assert.deepEqual(await create({ error: null }, form), { error: "UNAUTHENTICATED" });
  assert.equal(calls.length, 0);
  actor = "session-customer";
  assert.deepEqual(await create({ error: null }, form), { error: null, slug: "owned-business" });
  assert.deepEqual(calls[0], [actor, "Business", "stable-key"]);
  fail = true;
  assert.deepEqual(await create({ error: null }, form), { error: "UNAVAILABLE" });
  assert.deepEqual(calls[1], calls[0]);
});
test("login continuation resolves current DB roles and ignores arbitrary redirect targets", async () => {
  actor = "session-customer"; role = "CUSTOMER";
  await assert.rejects(nextPage({ searchParams: Promise.resolve({ destination: "https://foreign.invalid" }) }), /redirect:\/tools\/calem\/stempelkarten\/app/);
  role = "OWNER";
  await assert.rejects(nextPage({ searchParams: Promise.resolve({ destination: "https://foreign.invalid" }) }), /redirect:\/dashboard/);
  await assert.rejects(nextPage({ searchParams: Promise.resolve({ destination: "stempelfi" }) }), /redirect:\/tools\/calem\/stempelkarten\/app/);
  for (const value of ["CUSTOMER,OWNER", "ADMIN", ""]) {
    role = value; await assert.rejects(nextPage({ searchParams: Promise.resolve({}) }), /notFound/);
  }
  role = "OWNER"; banned = true;
  await assert.rejects(nextPage({ searchParams: Promise.resolve({}) }), /notFound/);
});
