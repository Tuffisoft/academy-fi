import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function LegacyLeadResearchPage() {
  const locale = await getLocale();
  redirect({ href: "/tools/calem/lead-research", locale });
}
