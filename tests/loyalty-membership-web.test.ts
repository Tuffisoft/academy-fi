import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, mock, test } from "node:test";
import { membershipRequest, MembershipError, type MembershipDelivery } from "../src/lib/loyalty/memberships";
import { invitationMailContent, InvitationMailError } from "../src/lib/loyalty/invitation-mail";
import { isMembershipReply, type DeliveryState } from "../src/lib/loyalty/membership-reply";
import de from "../src/messages/de.json";
import en from "../src/messages/en.json";

let actor: string | null = "session-user", configured = true, replayed = false, stale = false, statusWriteFails = false;
let domainError: string | null = null, sendError: Error | null = null;
let calls: Array<{ actorId: string; command: unknown }> = [], sent = 0, updates = 0;
let persisted: DeliveryState = "NOT_SENT";
const delivery: MembershipDelivery = { invitationId: "invite", organizationId: "org", attemptId: randomUUID(), to: "target@example.invalid", token: "a".repeat(43), expiresAt: new Date("2026-11-02T12:00:00Z") };
mock.module("../src/lib/session.ts", { namedExports: { getCurrentSession: async () => actor ? { user: { id: actor, role: "OWNER" } } : null } });
mock.module("../src/lib/loyalty/memberships.ts", { namedExports: { membershipRequest, MembershipError, executeMembership: async (actorId: string, command: { action: string }) => {
  calls.push({ actorId, command });
  if (domainError) throw new MembershipError(domainError === "FORBIDDEN" ? "FORBIDDEN" : "CONFLICT");
  return { resultId: "invite", replayed, ...(!replayed && ["INVITE", "ROTATE_INVITATION"].includes(command.action) ? { delivery } : {}) };
} } });
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: { organizationInvitation: {
  findFirst: async () => ({ deliveryStatus: persisted }),
  updateMany: async ({ data }: { data: { deliveryStatus: DeliveryState } }) => {
    updates++; if (statusWriteFails && updates > 1) throw new Error("Write unavailable");
    if (stale) return { count: 0 };
    persisted = data.deliveryStatus; return { count: 1 };
  },
} } } });
mock.module("../src/lib/loyalty/invitation-mail.ts", { namedExports: { InvitationMailError, invitationMailConfigured: () => configured, sendInvitationMail: async () => { sent++; if (sendError) throw sendError; return "provider-reference"; } } });
let run: typeof import("../src/lib/loyalty/membership-workflow").runMembershipWorkflow;
let action: typeof import("../src/lib/loyalty/membership.actions").membershipAction;
let invitePost: typeof import("../src/app/api/loyalty/organizations/[organizationId]/invitations/route").POST;
let memberPost: typeof import("../src/app/api/loyalty/organizations/[organizationId]/memberships/route").POST;
before(async () => {
  ({ runMembershipWorkflow: run } = await import("../src/lib/loyalty/membership-workflow"));
  ({ membershipAction: action } = await import("../src/lib/loyalty/membership.actions"));
  ({ POST: invitePost } = await import("../src/app/api/loyalty/organizations/[organizationId]/invitations/route"));
  ({ POST: memberPost } = await import("../src/app/api/loyalty/organizations/[organizationId]/memberships/route"));
});
function reset() {
  actor = "session-user"; configured = true; replayed = false; stale = false; statusWriteFails = false; domainError = null; sendError = null;
  calls = []; sent = 0; updates = 0; persisted = "NOT_SENT";
  process.env.STEMPELFI_MEMBERS_ENABLED = "1"; process.env.DATABASE_ENV = "test"; process.env.BETTER_AUTH_URL = "http://localhost:3000";
}
const command = () => ({ action: "INVITE", organizationId: "org", operationId: randomUUID(), email: "target@example.invalid", role: "STAFF" });
const envelope = () => ({ locale: "de", command: command() });
const context = { params: Promise.resolve({ organizationId: "org" }) };
function request(body: unknown, origin = "http://localhost:3000") { return new Request("http://localhost:3000/api/loyalty/organizations/org/memberships", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) }); }

test("new adapters fail closed outside the explicit development/test pilot, before domain/provider I/O", async () => {
  reset(); delete process.env.STEMPELFI_MEMBERS_ENABLED;
  assert.equal((await action(envelope())).ok, false);
  assert.equal((await memberPost(request(envelope()), context)).status, 403);
  process.env.STEMPELFI_MEMBERS_ENABLED = "1"; process.env.DATABASE_ENV = "production";
  assert.equal((await action(envelope())).ok, false); assert.equal(calls.length, 0); assert.equal(sent, 0);
});

test("direct actions use only the authenticated identity; malformed/injected and unconfirmed ownership requests never reach the service", async () => {
  reset(); actor = null;
  assert.equal((await action(envelope())).ok, false); assert.equal(calls.length, 0);
  actor = "session-user";
  await action({ ...envelope(), actorId: "foreign" });
  await action({ ...envelope(), command: { ...command(), actorId: "foreign" } });
  await action({ locale: "de", command: { action: "TRANSFER_OWNER", organizationId: "org", userId: "target", operationId: randomUUID() } });
  assert.equal(calls.length, 0);
  const result = await action(envelope()); assert.equal(result.ok, true); assert.equal(calls[0].actorId, "session-user");
  assert.ok(!JSON.stringify(result).includes(delivery.token)); assert.ok(!JSON.stringify(result).includes(delivery.to));
});

test("HTTP adapters reject cross-origin, unauthenticated, foreign-path, malformed and oversized streamed input", async () => {
  reset();
  assert.equal((await memberPost(request(envelope(), "https://foreign.invalid"), context)).status, 403);
  actor = null; assert.equal((await memberPost(request(envelope()), context)).status, 401); actor = "session-user";
  assert.equal((await memberPost(request({ ...envelope(), command: { ...command(), organizationId: "foreign" } }), context)).status, 403);
  assert.equal((await memberPost(request({ ...envelope(), role: "OWNER" }), context)).status, 422);
  assert.equal((await memberPost(request("x".repeat(9000)), context)).status, 422);
  const response = await memberPost(new Request("http://localhost:3000/api", { method: "POST", headers: { origin: "http://localhost:3000", "Content-Type": "application/json" }, body: "{" }), context);
  assert.equal(response.status, 422); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(calls.length, 0); assert.equal(sent, 0);
});

test("dedicated invitation endpoint validates its own contract and both endpoints preserve current domain denials", async () => {
  reset();
  const operationId = randomUUID();
  const response = await invitePost(request({ locale: "en", operationId, email: "Target@Example.invalid", role: "STAFF" }), context);
  assert.equal(response.status, 200); assert.ok(isMembershipReply(await response.json()));
  assert.deepEqual(calls[0].command, { organizationId: "org", operationId, action: "INVITE", email: "target@example.invalid", role: "STAFF" });
  domainError = "FORBIDDEN";
  assert.equal((await memberPost(request(envelope()), context)).status, 403);
  assert.equal((await invitePost(request({ locale: "en", operationId: randomUUID(), email: "other@example.invalid", role: "STAFF" }), context)).status, 403);
  assert.equal(sent, 1);
});

test("committed invitations and provider acceptance are distinct and replay never sends again", async () => {
  reset(); const result = await run("actor", command(), "en"); assert.ok(result.ok);
  assert.equal(result.data.deliveryStatus, "PROVIDER_ACCEPTED"); assert.equal(sent, 1); assert.equal(persisted, "PROVIDER_ACCEPTED");
  replayed = true; const repeated = await run("actor", command(), "en"); assert.ok(repeated.ok); assert.equal(repeated.data.deliveryStatus, "PROVIDER_ACCEPTED"); assert.equal(sent, 1);
  assert.ok(!JSON.stringify(repeated).includes(delivery.token));
});

test("missing configuration, definite refusal and uncertain network/DB results never imply delivery", async () => {
  reset(); configured = false; let result = await run("actor", command(), "de"); assert.ok(result.ok); assert.equal(result.data.deliveryStatus, "NOT_SENT"); assert.equal(sent, 0);
  reset(); sendError = new InvitationMailError("FAILED"); result = await run("actor", command(), "de"); assert.ok(result.ok); assert.equal(result.data.deliveryStatus, "FAILED");
  reset(); sendError = new Error("Network timeout"); result = await run("actor", command(), "de"); assert.ok(result.ok); assert.equal(result.data.deliveryStatus, "UNKNOWN");
  reset(); statusWriteFails = true; result = await run("actor", command(), "de"); assert.ok(result.ok); assert.equal(result.data.deliveryStatus, "UNKNOWN"); assert.equal(persisted, "UNKNOWN");
  reset(); stale = true; result = await run("actor", command(), "de"); assert.ok(result.ok); assert.equal(result.data.deliveryStatus, "UNKNOWN"); assert.equal(sent, 0);
});

test("DE/EN invitation content uses a fixed URL and a fragment token, with no query credential and an explicit unchanged expiry", () => {
  for (const locale of ["de", "en"] as const) {
    const content = invitationMailContent(delivery, locale, "https://example.invalid");
    const link = content.text.split("\n").find(line => line.startsWith("https://")); assert.ok(link);
    const url = new URL(link); assert.equal(url.pathname, `/${locale}/tools/calem/stempelkarten/invitation`); assert.equal(url.search, ""); assert.ok(url.hash.includes(delivery.token)); assert.ok(content.text.includes("UTC"));
    assert.ok(content.text.includes(locale === "de" ? "sieben" : "seven"));
  }
  for (const url of ["http://public.invalid", "javascript:alert(1)", "https://user:secret@example.invalid"]) assert.throws(() => invitationMailContent(delivery, "en", url));
});

test("membership translations have identical keys and placeholders, including errors and delivery states", () => {
  function flatten(raw: object, prefix = ""): Record<string, string> {
    return Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => typeof value === "string" ? [[prefix + key, value]] : Object.entries(flatten(value, prefix + key + "."))));
  }
  const german = flatten(de.membership), english = flatten(en.membership);
  assert.deepEqual(Object.keys(german), Object.keys(english));
  for (const key of Object.keys(german)) assert.deepEqual(german[key].match(/\{\w+\}/g) ?? [], english[key].match(/\{\w+\}/g) ?? [], key);
  for (const invalid of [{ ok: true }, { ok: false, error: { code: "INVENTED", message: "x" } }, { ok: true, data: { resultId: "x", replayed: false, deliveryStatus: "DELIVERED" } }]) assert.equal(isMembershipReply(invalid), false);
});
