import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { requirePlatformOwner } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import {
  OrganizationAccessError,
  searchInternalOrganizations,
} from "@/lib/loyalty/organizations";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
} as const;
const base = "/tools/calem/stempelkarten/admin";

export default async function LoyaltyAdministration({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string | string[];
    after?: string | string[];
    organizationId?: string | string[];
  }>;
}) {
  const actor = await requirePlatformOwner();
  const { locale } = await params;
  const { q, after, organizationId } = await searchParams;
  const t = await getTranslations("stempelfi");
  // Preserve existing exact-ID links, rejecting ambiguous parameters.
  if (
    typeof organizationId === "string" &&
    /^[a-zA-Z0-9_-]{1,160}$/.test(organizationId) &&
    q === undefined &&
    after === undefined
  ) {
    redirect({ href: `${base}/${organizationId}`, locale });
  }
  let invalid =
    organizationId !== undefined || Array.isArray(q) || Array.isArray(after);
  let unavailable = false;
  let result:
    | Awaited<ReturnType<typeof searchInternalOrganizations>>
    | undefined;
  if (!invalid) {
    try {
      result = await searchInternalOrganizations(actor.id, {
        q: typeof q === "string" ? q : undefined,
        after: typeof after === "string" ? after : undefined,
      });
    } catch (error) {
      if (
        error instanceof OrganizationAccessError &&
        error.code === "INVALID_INPUT"
      )
        invalid = true;
      else if (error instanceof OrganizationAccessError) notFound();
      else unavailable = true;
    }
  }
  const value = typeof q === "string" && q.length <= 160 ? q : "";
  const query = new URLSearchParams({ q: result?.q ?? value });
  const first = `${base}?${query}`;
  if (result?.next) query.set("after", result.next);
  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-8">
      <Link
        href="/tools/calem/stempelkarten/app"
        className="inline-block rounded border p-3 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("allCompanies")}
      </Link>
      <header className="space-y-3">
        <Badge>{t("platformOwner")}</Badge>
        <h1 className="text-3xl">{t("workspace.searchTitle")}</h1>
      </header>
      <form method="get" className="max-w-xl space-y-3">
        <label htmlFor="company-search" className="block font-medium">
          {t("workspace.searchLabel")}
        </label>
        <input
          id="company-search"
          name="q"
          maxLength={160}
          defaultValue={value}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "search-error" : "search-hint"}
          className="w-full min-w-0 rounded-lg border bg-background p-3 focus-visible:outline-2 focus-visible:outline-offset-4"
        />
        <p id="search-hint" className="text-sm text-muted-foreground">
          {t("workspace.searchHint")}
        </p>
        {invalid && (
          <p id="search-error" role="alert">
            {t("workspace.invalidSearch")}
          </p>
        )}
        <button className="rounded-lg bg-primary px-4 py-3 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4">
          {t("workspace.search")}
        </button>
      </form>
      {unavailable && (
        <div className="space-y-3">
          <p role="alert">{t("portalUnavailable")}</p>
          <Link href={first} className="inline-block rounded border p-3">
            {t("workspace.retry")}
          </Link>
        </div>
      )}
      {result && (
        <>
          {result.organizations.length ? (
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
              {result.organizations.map((organization) => (
                <li
                  key={organization.id}
                  className="min-w-0 space-y-3 rounded-xl border p-5"
                >
                  <h2 className="wrap-anywhere text-xl">{organization.name}</h2>
                  <p className="wrap-anywhere text-sm">
                    {t("workspace.id")}: {organization.id}
                  </p>
                  <p>
                    {t(`organizationStatus.${organization.status}`)} ·{" "}
                    {organization.entitlement?.plan ?? t("notConfigured")}
                  </p>
                  {organization.entitlement?.plan === "BUSINESS" && (
                    <Badge variant="secondary">{t("workspace.priority")}</Badge>
                  )}
                  <Link
                    prefetch={false}
                    href={`${base}/${organization.id}?${new URLSearchParams({ q: result.q, ...(typeof after === "string" ? { after } : {}) })}`}
                    className="block rounded border p-3 focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    {t("internalDetail")}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">{t("workspace.noResults")}</p>
          )}
          <nav aria-label={t("companyPages")} className="flex flex-wrap gap-3">
            {after && (
              <Link className="rounded border p-3" href={first}>
                {t("firstPage")}
              </Link>
            )}
            {result.next && (
              <Link className="rounded border p-3" href={`${base}?${query}`}>
                {t("nextPage")}
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
