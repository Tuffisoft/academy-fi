import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/header/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { LeadResearchWorkspace } from "@/components/fi/lead-research/lead-research-workspace";
import { getLeadSearches } from "@/lib/data/lead-searches";

export default async function LeadResearchPage() {
  const user = await requireUser();
  const t = await getTranslations("leadResearch");
  const searches = await getLeadSearches();

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} image={user.image ?? null} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <BreadcrumbNav items={[{ label: t("title") }]} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <LeadResearchWorkspace searches={searches} isOwner={user.role === "OWNER"} />
      </main>
    </div>
  );
}
