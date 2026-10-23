import "server-only";
import { getLocale } from "next-intl/server";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

export async function requirePortalActor() {
  const session = await getCurrentSession();
  if (!session) {
    redirect({ href: "/sign-in?destination=stempelfi", locale: await getLocale() });
    throw new Error("Unreachable after redirect");
  }
  return session.user.id;
}
