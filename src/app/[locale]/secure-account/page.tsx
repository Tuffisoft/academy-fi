import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// Old account-key links now lead to the shared server-key chat.
export default async function SecureAccountPage() {
  const locale = await getLocale();
  redirect({ href: "/chat", locale });
}
