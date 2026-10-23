import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requirePortalActor } from "@/lib/loyalty/portal-session";
import { getPortalOrganizations, OrganizationAccessError } from "@/lib/loyalty/organizations";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { OrganizationForm } from "@/components/loyalty/organization-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "StempelFi", referrer: "no-referrer", robots: { index: false, follow: false } } as const;

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
  const actorId = await requirePortalActor();
  const t = await getTranslations("stempelfi");
  const { after } = await searchParams;
  if (after !== undefined && (typeof after !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(after))) notFound();
  let result;
  try { result = await getPortalOrganizations(actorId, after); }
  catch (error) {
    if (error instanceof OrganizationAccessError) notFound();
    return <main><ProductHeader portal /><p role="alert" className="p-6">{t("portalUnavailable")}</p></main>;
  }
  return <main className="min-w-0"><ProductHeader portal /><section className="grid gap-7 border-t px-5 py-10 sm:px-10">
    <div className="grid gap-3"><Badge variant="secondary">{t(result.internal ? "platformOwner" : "businessPortal")}</Badge><h1 className="font-serif text-4xl">{t(result.internal ? "allCompanies" : "yourCompanies")}</h1><p className="text-muted-foreground">{t(result.internal ? "allCompaniesNote" : "yourCompaniesNote")}</p></div>
    {result.organizations.length ? <div className="grid gap-4 sm:grid-cols-2">{result.organizations.map(organization => <Card key={organization.id}><CardHeader><CardTitle className="break-words">{organization.name}</CardTitle><CardDescription>{t(`organizationStatus.${organization.status}`)}</CardDescription></CardHeader><CardContent><Button nativeButton={false} variant="outline" className="min-h-11" render={<Link href={`/tools/calem/stempelkarten/app/${organization.slug}`} />}>{t("openCompany")}</Button></CardContent></Card>)}</div> : <p className="text-muted-foreground">{t("noCompanies")}</p>}
    <nav aria-label={t("companyPages")} className="flex flex-wrap gap-3">{after && <Button variant="outline" nativeButton={false} className="min-h-11" render={<Link href="/tools/calem/stempelkarten/app" />}>{t("firstPage")}</Button>}{result.next && <Button variant="outline" nativeButton={false} className="min-h-11" render={<Link href={`/tools/calem/stempelkarten/app?after=${result.next}`} />}>{t("nextPage")}</Button>}</nav>
    {result.canCreate && <Card className="max-w-xl"><CardHeader><CardTitle>{t("foundCompany")}</CardTitle><CardDescription>{t("multipleCompanies")}</CardDescription></CardHeader><CardContent><OrganizationForm /></CardContent></Card>}
  </section></main>;
}
