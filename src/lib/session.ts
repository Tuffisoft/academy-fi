import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

export async function getCurrentSession() {
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
  const user = await requireUser();

  if (user.role !== role) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  return user;
}
