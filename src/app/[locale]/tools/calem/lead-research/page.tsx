import { getTranslations } from "next-intl/server";
import { requireAcademyUser } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/header/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { LeadResearchWorkspace } from "@/components/fi/lead-research/lead-research-workspace";
import { getLeadSearches } from "@/lib/data/lead-searches";
import { getSavedLeads } from "@/lib/data/saved-leads";
import { getWebsiteAudits } from "@/lib/data/website-audits";

export const maxDuration = 120;

export default async function LeadResearchPage() {
  const user = await requireAcademyUser();
  const t = await getTranslations("leadResearch");
  const toolsT = await getTranslations("tools");
  const [searches, savedLeads, audits] = await Promise.all([
    getLeadSearches(),
    getSavedLeads(),
    getWebsiteAudits(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        name={user.name}
        role={user.role ?? "INTERN"}
        image={user.image ?? null}
      />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6">
        <BreadcrumbNav
          items={[
            { label: toolsT("title"), href: "/tools" },
            { label: toolsT("calemTitle"), href: "/tools/calem" },
            { label: t("title") },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        </div>
        <LeadResearchWorkspace
          searches={searches}
          savedLeads={savedLeads}
          audits={audits}
          userId={user.id}
          isOwner={user.role === "OWNER"}
          googleConfigured={Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim())}
        />
      </main>
    </div>
  );
}