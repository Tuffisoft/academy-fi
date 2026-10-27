import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePortalActor } from "@/lib/loyalty/portal-session";
import { membershipsEnabled } from "@/lib/loyalty/membership-feature";
import {
  getPortalOrganization,
  OrganizationAccessError,
} from "@/lib/loyalty/organizations";
import { getMembershipOverview } from "@/lib/loyalty/membership-view";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { MembershipPanel } from "@/components/loyalty/membership-panel";
import { PortalNavigation } from "@/components/loyalty/portal-navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StempelFi",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} as const;
export default async function MembersPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  if (!membershipsEnabled()) notFound();
  const actorId = await requirePortalActor(),
    { organizationSlug } = await params;
  const t = await getTranslations("membership");
  let overview;
  try {
    const organization = await getPortalOrganization(actorId, organizationSlug);
    overview = await getMembershipOverview(actorId, organization.id);
  } catch (error) {
    if (error instanceof OrganizationAccessError) notFound();
    return (
      <main>
        <ProductHeader portal />
        <p role="alert" className="p-5">
          {t("errors.UNAVAILABLE")}
        </p>
      </main>
    );
  }
  return (
    <main className="min-w-0">
      <ProductHeader portal />
      <div className="p-5">
        <PortalNavigation
          slug={organizationSlug}
          role={overview.role}
          internal={false}
          membersAvailable={true}
          active="members"
        />
      </div>
      <MembershipPanel overview={overview} />
    </main>
  );
}
