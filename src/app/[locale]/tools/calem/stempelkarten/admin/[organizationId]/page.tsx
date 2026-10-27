import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePlatformOwner } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import {
  getInternalOrganizationDetail,
  OrganizationAccessError,
} from "@/lib/loyalty/organizations";

export const dynamic = "force-dynamic";
export const metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} as const;
const base = "/tools/calem/stempelkarten/admin";

export default async function OrganizationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; organizationId: string }>;
  searchParams: Promise<{ q?: string | string[]; after?: string | string[] }>;
}) {
  const actor = await requirePlatformOwner();
  const { organizationId } = await params;
  const { q, after } = await searchParams;
  const t = await getTranslations("stempelfi");
  const query = new URLSearchParams();
  if (
    typeof q === "string" &&
    q.length <= 160 &&
    !/[\u0000-\u001f\u007f]/.test(q)
  )
    query.set("q", q.trim());
  if (typeof after === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(after))
    query.set("after", after);
  const back = `${base}?${query}`;
  let organization;
  try {
    organization = await getInternalOrganizationDetail(
      actor.id,
      organizationId,
    );
  } catch (error) {
    if (error instanceof OrganizationAccessError) notFound();
    return (
      <main className="min-w-0 space-y-4 p-4 sm:p-8">
        <h1 className="text-2xl">{t("internalDetail")}</h1>
        <p role="alert">{t("portalUnavailable")}</p>
        <Link
          className="inline-block rounded border p-3"
          prefetch={false} href={`${base}/${organizationId}?${query}`}
        >
          {t("workspace.retry")}
        </Link>
        <Link className="inline-block rounded border p-3" href={back}>
          {t("workspace.backSearch")}
        </Link>
      </main>
    );
  }
  if (!organization) notFound();
  const rows = [
    [t("workspace.id"), organization.id],
    [t("workspace.name"), organization.name],
    [t("workspace.slug"), organization.slug],
    [t("workspace.status"), t(`organizationStatus.${organization.status}`)],
    [t("plan"), organization.entitlement?.plan ?? t("notConfigured")],
    [t("activeMemberships"), String(organization._count.memberships)],
  ];
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-8">
      <Link
        href={back}
        className="inline-block rounded border p-3 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("workspace.backSearch")}
      </Link>
      <header className="space-y-3">
        <p>{t("workspace.support")}</p>
        <h1 className="wrap-anywhere text-3xl">{organization.name}</h1>
      </header>
      <dl className="space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-medium">{label}</dt>
            <dd className="wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
      {organization.entitlement?.plan === "BUSINESS" && (
        <p>{t("workspace.priority")}</p>
      )}
    </main>
  );
}
