import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { OrganizationForm } from "@/components/loyalty/organization-form";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { requirePortalActor } from "@/lib/loyalty/portal-session";
import { getCustomerSetup, customerRegistrationEnabled } from "@/lib/loyalty/customer-account";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer", robots: { index: false, follow: false } } as const;
export default async function SetupPage() {
  const actor = await requirePortalActor(), locale = await getLocale();
  const setup = await getCustomerSetup(actor);
  if (!setup) redirect({ href: "/tools/calem/stempelkarten/app", locale });
  if (!setup?.verified) redirect({ href: "/tools/calem/stempelkarten/account?mode=resend", locale });
  const t = await getTranslations("customerAccount");
  return <main className="min-w-0"><ProductHeader portal /><section className="mx-auto grid max-w-xl gap-6 px-5 py-10"><h1 className="text-2xl font-semibold">{t("setup")}</h1><p>{t("setupNote")}</p>{customerRegistrationEnabled() ? <OrganizationForm customer /> : <p role="status">{t("disabled")}</p>}</section></main>;
}
