import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { notFound } from "next/navigation";
import { AcademyAccessError, getAcademyIdentity } from "@/lib/academy-access";

export function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

export async function getCurrentSession() {
  if (!isAuthConfigured()) return null;
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getCurrentSession();

  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/sign-in", locale });
    throw new Error("Unreachable: redirect() should have thrown");
  }

  return session.user;
}

export async function requireRole(role: Role) {
  const user = await requireAcademyUser();

  if (user.role !== role) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  return user;
}

export async function getAcademySession() {
  const session = await getCurrentSession();
  if (!session) return null;
  const identity = await getAcademyIdentity(session.user.id);
  return { ...session, user: { ...session.user, ...identity } };
}

export async function requireAcademyUser() {
  try {
    const session = await getAcademySession();
    if (session) return session.user;
  } catch (error) {
    if (!(error instanceof AcademyAccessError)) throw error;
    notFound();
  }
  const locale = await getLocale();
  redirect({ href: "/sign-in", locale });
  throw new Error("Unreachable: redirect() should have thrown");
}

export async function requirePlatformOwner() {
  return requireRole("OWNER");
}

export async function getAcademyApiAccess() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  try {
    const session = await getAcademySession();
    if (session) return { user: session.user, response: null };
    return { user: null, response: Response.json({ error: "unauthorized" }, { status: 401, headers }) };
  } catch (error) {
    if (!(error instanceof AcademyAccessError)) throw error;
    return { user: null, response: Response.json({ error: "forbidden" }, { status: 403, headers }) };
  }
}
