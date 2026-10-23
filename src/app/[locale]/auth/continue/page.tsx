import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function ContinuePage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const locale = await getLocale(), session = await getCurrentSession();
  if (!session) redirect({ href: "/sign-in", locale });
  const user = session ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, banned: true } }) : null;
  if (!user || user.banned || !["CUSTOMER", "OWNER", "INTERN"].includes(user.role)) notFound();
  const { destination } = await searchParams;
  redirect({ href: user.role === "CUSTOMER" || destination === "stempelfi" ? "/tools/calem/stempelkarten/app" : "/dashboard", locale });
}
