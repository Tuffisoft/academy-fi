import { getTranslations } from "next-intl/server";
import { requirePlatformOwner } from "@/lib/session";
import { redirect, Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer", robots: { index: false, follow: false } } as const;

export default async function LoyaltyAdministration({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ organizationId?: string | string[] }>;
}) {
  await requirePlatformOwner();
  const { locale } = await params;
  const { organizationId } = await searchParams;
  const t = await getTranslations("tools");
  const invalid = organizationId !== undefined && (typeof organizationId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(organizationId));
  if (typeof organizationId === "string" && !invalid) {
    redirect({ href: `/tools/calem/stempelkarten/admin/${organizationId}`, locale });
  }
  return <main className="min-w-0 space-y-6 p-4 sm:p-6">
    <Link href="/tools/calem" className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">{t("loyaltyBack")}</Link>
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("loyaltyTitle")}</h1>
      <p>{t("loyaltyDescription")}</p>
      <p className="text-muted-foreground">{t("loyaltyStatus")}</p>
    </div>
    <form method="get" className="max-w-lg space-y-3">
      <label htmlFor="organizationId" className="block font-medium">{t("loyaltyOrganizationId")}</label>
      <input id="organizationId" name="organizationId" required maxLength={160} pattern="[a-zA-Z0-9_-]+" aria-invalid={invalid || undefined} aria-describedby={invalid ? "lookup-error" : undefined} className="w-full min-w-0 rounded-lg border bg-background p-3 focus-visible:outline-2 focus-visible:outline-offset-2" />
      {invalid && <p id="lookup-error" role="alert">{t("loyaltyInvalidId")}</p>}
      <button type="submit" className="rounded-lg bg-primary px-4 py-3 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4">{t("loyaltyOpen")}</button>
    </form>
  </main>;
}
