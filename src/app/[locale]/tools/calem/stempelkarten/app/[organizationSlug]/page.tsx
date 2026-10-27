import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePortalActor } from "@/lib/loyalty/portal-session";
import {
  getPortalOrganization,
  OrganizationAccessError,
} from "@/lib/loyalty/organizations";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { PortalNavigation } from "@/components/loyalty/portal-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "StempelFi",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} as const;

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const actorId = await requirePortalActor();
  const { organizationSlug } = await params;
  const t = await getTranslations("stempelfi");
  let organization;
  try {
    organization = await getPortalOrganization(actorId, organizationSlug);
  } catch (error) {
    if (error instanceof OrganizationAccessError) notFound();
    return (
      <main>
        <ProductHeader portal />
        <p role="alert" className="p-6">
          {t("portalUnavailable")}
        </p>
        <Link
          className="m-6 inline-block rounded border p-3"
          href={`/tools/calem/stempelkarten/app/${organizationSlug}`}
        >
          {t("workspace.retry")}
        </Link>
      </main>
    );
  }
  return (
    <main className="min-w-0">
      <ProductHeader portal />
      <section className="grid gap-7 border-t px-5 py-10 sm:px-10">
        <Button
          variant="outline"
          nativeButton={false}
          className="min-h-11 justify-self-start"
          render={<Link href="/tools/calem/stempelkarten/app" />}
        >
          {t(organization.internal ? "allCompanies" : "yourCompanies")}
        </Button>
        <div className="grid gap-3">
          <Badge variant="secondary">
            {t(organization.internal ? "workspace.support" : "businessPortal")}
          </Badge>
          <h1 className="wrap-anywhere text-4xl">{organization.name}</h1>
          <p className="text-muted-foreground">
            {t(`organizationStatus.${organization.status}`)}
            {organization.role
              ? ` · ${t("workspace.yourRole")}: ${t(`workspace.roles.${organization.role}`)}`
              : ""}
          </p>
        </div>
        <PortalNavigation
          slug={organization.slug}
          role={organization.role}
          internal={organization.internal}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>{t("plan")}</CardDescription>
              <CardTitle>
                {organization.entitlement?.plan ?? t("notConfigured")}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t("activeMemberships")}</CardDescription>
              <CardTitle>{organization._count.memberships}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t("portalFoundation")}</CardTitle>
            <CardDescription>{t("portalFoundationNote")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              nativeButton={false}
              className="min-h-11"
              render={<Link href="/tools/calem/stempelkarten/preview" />}
            >
              {t("design")}
            </Button>
            {organization.internal && (
              <Button
                variant="outline"
                nativeButton={false}
                className="min-h-11"
                render={
                  <Link
                    prefetch={false}
                    href={`/tools/calem/stempelkarten/admin/${organization.id}`}
                  />
                }
              >
                {t("internalDetail")}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
