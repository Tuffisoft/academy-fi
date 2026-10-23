import "server-only";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export class CustomerAccountError extends Error {
  constructor(public readonly code: "DISABLED" | "INVALID_INPUT" | "LIMIT_REACHED" | "INVALID_TOKEN" | "FORBIDDEN" | "CONFLICT") { super(code); }
}
export function customerRegistrationEnabled() {
  return process.env.STEMPELFI_REGISTRATION_ENABLED === "1" && ["development", "test"].includes(process.env.DATABASE_ENV ?? "");
}
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(128);
const locale = z.enum(["de", "en"]);
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const operation = z.string().uuid();
export const accountRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), name: z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/), email, password, locale, operationId: operation }).strict(),
  z.object({ action: z.enum(["resend", "requestReset"]), email, locale }).strict(),
  z.object({ action: z.literal("verify"), token, locale }).strict(),
  z.object({ action: z.literal("reset"), token, password, locale }).strict(),
]);
type AccountRequest = z.infer<typeof accountRequest>;
type Tx = Prisma.TransactionClient;
export type AccountMail = { to: string; locale: "de" | "en"; kind: "verify" | "reset"; token: string };
type Sender = (mail: AccountMail) => Promise<unknown>;
const markerId = (id: string) => "stempelfi:customer:" + id;
function digest(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Account secret unavailable");
  return createHmac("sha256", secret).update(value).digest("hex");
}
async function userLock(tx: Tx, id: string) {
  await tx.$queryRawUnsafe('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', id);
}
// Address keys are HMACs. Database locks serialize counters across instances.
export async function consumeAccountLimit(action: string, key: string, max: number, now = new Date()) {
  const window = Math.floor(now.getTime() / 3_600_000);
  const id = "stempelfi:limit:" + digest(action + ":" + key + ":" + window);
  const allowed = await prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text AS locked", id);
    const row = await tx.verification.findUnique({ where: { id } });
    const count = row ? Number(row.value) : 0;
    if (!Number.isSafeInteger(count) || count < 0 || count >= max) return false;
    await tx.verification.upsert({ where: { id }, create: { id, identifier: "stempelfi:limit", value: String(count + 1), expiresAt: new Date((window + 1) * 3_600_000) }, update: { value: String(count + 1) } });
    return true;
  }, { maxWait: 60_000, timeout: 30_000 });
  if (!allowed) throw new CustomerAccountError("LIMIT_REACHED");
}
async function issue(tx: Tx, userId: string, kind: "verify" | "reset") {
  const raw = randomBytes(32).toString("base64url");
  const identifier = "stempelfi:token:" + kind + ":" + userId;
  await tx.verification.deleteMany({ where: { identifier } });
  await tx.verification.create({ data: { id: "stempelfi:token:" + digest(raw), identifier, value: JSON.stringify({ userId, kind }), expiresAt: new Date(Date.now() + 3_600_000) } });
  return raw;
}
const registration = z.object({ userId: z.string(), fingerprint: z.string() });
const tokenData = z.object({ userId: z.string(), kind: z.enum(["verify", "reset"]) });
export async function handleCustomerAccount(raw: unknown, send: Sender, originKey: string) {
  if (!customerRegistrationEnabled()) throw new CustomerAccountError("DISABLED");
  const parsed = accountRequest.safeParse(raw);
  if (!parsed.success) throw new CustomerAccountError("INVALID_INPUT");
  const input: AccountRequest = parsed.data;
  // The fallback origin key is shared; untrusted forwarded headers cannot evade it.
  await consumeAccountLimit("origin:" + input.action, originKey, 20);
  await consumeAccountLimit(input.action, "email" in input ? input.email : digest(input.token), 5);
  if (input.action === "verify" || input.action === "reset") {
    const tokenId = "stempelfi:token:" + digest(input.token);
    const passwordHash = input.action === "reset" ? await hashPassword(input.password) : null;
    await prisma.$transaction(async tx => {
      const initial = await tx.verification.findUnique({ where: { id: tokenId } });
      if (!initial) throw new CustomerAccountError("INVALID_TOKEN");
      const data = tokenData.parse(JSON.parse(initial.value));
      await userLock(tx, data.userId);
      const current = await tx.verification.findUnique({ where: { id: tokenId } });
      const user = await tx.user.findUnique({ where: { id: data.userId } });
      if (!current || current.expiresAt <= new Date() || data.kind !== input.action || !user || user.role !== "CUSTOMER" || user.banned) throw new CustomerAccountError("INVALID_TOKEN");
      if (input.action === "verify") {
        if (!await tx.verification.findUnique({ where: { id: markerId(user.id) } })) throw new CustomerAccountError("INVALID_TOKEN");
        await tx.user.update({ where: { id: user.id }, data: { emailVerified: true } });
      } else {
        const updated = await tx.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: passwordHash } });
        if (updated.count !== 1) throw new CustomerAccountError("INVALID_TOKEN");
        await tx.session.deleteMany({ where: { userId: user.id } });
      }
      await tx.verification.deleteMany({ where: { identifier: current.identifier } });
    }, { maxWait: 60_000, timeout: 30_000 });
    return { status: input.action === "verify" ? "VERIFIED" as const : "RESET" as const };
  }
  let mail: AccountMail | null = null;
  if (input.action === "register") {
    // Hash even duplicate registrations; never adopt or change an existing account.
    const passwordHash = await hashPassword(input.password);
    const fingerprint = digest(JSON.stringify([input.name, input.email, input.password, input.locale]));
    const id = "stempelfi:register:" + digest(input.operationId);
    mail = await prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text AS locked", id);
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text AS locked", "stempelfi:email:" + digest(input.email));
      const previous = await tx.verification.findUnique({ where: { id } });
      let userId: string;
      if (previous) {
        const prior = registration.parse(JSON.parse(previous.value));
        if (prior.fingerprint !== fingerprint) throw new CustomerAccountError("CONFLICT");
        userId = prior.userId;
      } else {
        if (await tx.user.findUnique({ where: { email: input.email } })) return null;
        userId = randomUUID();
        await tx.user.create({ data: { id: userId, email: input.email, name: input.name, locale: input.locale, role: "CUSTOMER", emailVerified: false } });
        await tx.account.create({ data: { id: randomUUID(), accountId: userId, userId, providerId: "credential", password: passwordHash } });
        await tx.verification.create({ data: { id, identifier: "stempelfi:registration:" + userId, value: JSON.stringify({ userId, fingerprint }), expiresAt: new Date(Date.now() + 86_400_000) } });
        await tx.verification.create({ data: { id: markerId(userId), identifier: "stempelfi:customer:" + userId, value: "pending", expiresAt: new Date("9999-01-01") } });
      }
      await userLock(tx, userId);
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.banned || user.role !== "CUSTOMER" || user.emailVerified) return null;
      return { to: user.email, locale: input.locale, kind: "verify" as const, token: await issue(tx, userId, "verify") };
    }, { maxWait: 60_000, timeout: 30_000 });
  } else {
    mail = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({ where: { email: input.email } });
      if (!user) return null;
      await userLock(tx, user.id);
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || current.banned || current.role !== "CUSTOMER") return null;
      const kind = input.action === "requestReset" ? "reset" as const : "verify" as const;
      if (kind === "verify" && (current.emailVerified || !await tx.verification.findUnique({ where: { id: markerId(user.id) } }))) return null;
      return { to: current.email, locale: input.locale, kind, token: await issue(tx, current.id, kind) };
    });
  }
  if (mail) await send(mail);
  return { status: "CHECK_EMAIL" as const };
}

export async function getCustomerSetup(actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true, banned: true, emailVerified: true } });
  if (!user || user.banned || user.role !== "CUSTOMER") return null;
  const marker = await prisma.verification.findUnique({ where: { id: markerId(actorId) } });
  return marker?.value === "pending" ? { verified: user.emailVerified } : null;
}

export async function createCustomerOrganization(actorId: string, name: string, operationId: string) {
  if (!customerRegistrationEnabled()) throw new CustomerAccountError("DISABLED");
  const parsed = z.object({ name: z.string().trim().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/), operationId: operation }).safeParse({ name, operationId });
  if (!parsed.success) throw new CustomerAccountError("INVALID_INPUT");
  const fingerprint = digest(JSON.stringify([parsed.data.name, operationId.toLowerCase()]));
  const id = "org_" + digest("customer-company:" + actorId);
  return prisma.$transaction(async tx => {
    await userLock(tx, actorId);
    const user = await tx.user.findUnique({ where: { id: actorId } });
    const marker = await tx.verification.findUnique({ where: { id: markerId(actorId) } });
    if (!user || user.banned || user.role !== "CUSTOMER" || !user.emailVerified || !marker) throw new CustomerAccountError("FORBIDDEN");
    const previous = await tx.organization.findUnique({ where: { id }, include: { memberships: { where: { userId: actorId, role: "OWNER", status: "ACTIVE" } } } });
    if (previous) {
      if (previous.status !== "ACTIVE" || previous.memberships.length !== 1) throw new CustomerAccountError("FORBIDDEN");
      if (marker.value !== fingerprint) throw new CustomerAccountError("CONFLICT");
      return { slug: previous.slug };
    }
    if (marker.value !== "pending") throw new CustomerAccountError("FORBIDDEN");
    const organization = await tx.organization.create({ data: { id, name: parsed.data.name, slug: "business-" + digest(actorId), status: "ACTIVE", entitlement: { create: { plan: "FREE" } } } });
    const member = await tx.organizationMembership.create({ data: { organizationId: id, userId: actorId, role: "OWNER" } });
    await tx.organizationAuditLog.create({ data: { organizationId: id, actorId, actorMembershipId: member.id, action: "CUSTOMER_ONBOARDED", targetId: id, reason: fingerprint } });
    await tx.verification.update({ where: { id: marker.id }, data: { value: fingerprint } });
    return { slug: organization.slug };
  }, { maxWait: 60_000, timeout: 30_000 });
}
