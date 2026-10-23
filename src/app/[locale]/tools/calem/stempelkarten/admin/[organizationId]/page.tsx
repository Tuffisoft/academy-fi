import { notFound } from "next/navigation";
import { requirePlatformOwner } from "@/lib/session";
import {
  getInternalOrganizationDetail,
  OrganizationAccessError,
} from "@/lib/loyalty/organizations";

export const dynamic = "force-dynamic";
export const metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} as const;

const copy = {
  de: {
    title: "Unternehmensdetail",
    context: "Interne Verwaltung · ausgewähltes Unternehmen",
    name: "Name",
    slug: "Kennung",
    status: "Status",
    members: "Aktive Mitgliedschaften",
    plan: "Berechtigungsstand",
    missing: "Nicht eingerichtet",
    unavailable:
      "Unternehmensdaten konnten nicht geladen werden. Bitte später erneut versuchen.",
    statuses: {
      PENDING: "Einrichtung ausstehend",
      ACTIVE: "Aktiv",
      SUSPENDED: "Gesperrt",
      DELETING: "Löschung läuft",
    },
  },
  en: {
    title: "Organization detail",
    context: "Internal administration · selected organization",
    name: "Name",
    slug: "Identifier",
    status: "Status",
    members: "Active memberships",
    plan: "Entitlement",
    missing: "Not configured",
    unavailable:
      "Organization data could not be loaded. Please try again later.",
    statuses: {
      PENDING: "Setup pending",
      ACTIVE: "Active",
      SUSPENDED: "Suspended",
      DELETING: "Deletion in progress",
    },
  },
};

export default async function OrganizationDetail({
  params,
}: {
  params: Promise<{ locale: string; organizationId: string }>;
}) {
  const actor = await requirePlatformOwner();
  const { locale, organizationId } = await params;
  const t = copy[locale === "de" ? "de" : "en"];
  let organization;
  try {
    organization = await getInternalOrganizationDetail(
      actor.id,
      organizationId,
    );
  } catch (error) {
    if (error instanceof OrganizationAccessError) notFound();
    return (
      <main className="min-w-0 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <p role="alert" className="mt-4">
          {t.unavailable}
        </p>
      </main>
    );
  }
  if (!organization) notFound();
  const rows = [
    [t.name, organization.name],
    [t.slug, organization.slug],
    [t.status, t.statuses[organization.status]],
    [t.plan, organization.entitlement?.plan ?? t.missing],
    [t.members, String(organization._count.memberships)],
  ];
  return (
    <main className="min-w-0 p-4 sm:p-8">
      <p className="mb-2 text-sm">{t.context}</p>
      <h1 className="wrap-break-words text-2xl font-semibold">{t.title}</h1>
      <dl className="mt-6 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-medium">{label}</dt>
            <dd className="wrap-anywhere">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
