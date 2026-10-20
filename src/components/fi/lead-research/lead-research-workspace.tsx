"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, Bookmark, FolderSearch, LayoutDashboard, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { runLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import { PlacesResults } from "./places-results";
import { LeadSearchDialog } from "./lead-search-dialog";
import { CampaignTable } from "./campaign-table";
import type { LeadSearchSummary, SavedLeadSummary } from "@/lib/lead-research/types";
import { useSearchProgress } from "./use-search-progress";
import { SearchJobStatus } from "./search-job-status";
import { useLivePlaces } from "./use-live-places";
import { SavedLeadsView } from "./saved-leads-view";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { qualityStyles, qualityTone } from "./quality-presentation";
import { AuditProgressCard } from "./audit-progress-card";

type View = "overview" | "campaigns" | "leads" | "savedLeads" | "analytics";

export function LeadResearchWorkspace({ searches: initialSearches, savedLeads, audits: initialAudits, userId, isOwner, googleConfigured }: { searches: LeadSearchSummary[]; savedLeads: SavedLeadSummary[]; audits: AuditSummary[]; userId: string; isOwner: boolean; googleConfigured: boolean }) {
  const t = useTranslations("leadResearch");
  const { searches, audits, statusError } = useSearchProgress(initialSearches, initialAudits);
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = searches.find((search) => search.id === selectedId) ?? searches.find((search) => search.status === "RUNNING" || search.status === "QUEUED") ?? searches.find((search) => search.resultCount > 0);
  const isSearching = selected?.status === "RUNNING" || selected?.status === "QUEUED";
  const { result, loading: loadingDetails, error: detailsError } = useLivePlaces(selected?.id, selected?.runId, selected?.resultCount ?? 0, view === "leads" && !isSearching && !pending);
  const submitting = useRef(false);
  const scoredAudits = audits.filter((audit) => audit.status === "COMPLETED" && audit.qualityScore !== null);
  const averageScore = scoredAudits.length ? String(Math.round(scoredAudits.reduce((sum, audit) => sum + audit.qualityScore!, 0) / scoredAudits.length)) : "—";
  const distribution = [
    { key: "highPotential", count: scoredAudits.filter((audit) => audit.qualityScore! < 40).length },
    { key: "mediumPotential", count: scoredAudits.filter((audit) => audit.qualityScore! >= 40 && audit.qualityScore! < 70).length },
    { key: "lowPotential", count: scoredAudits.filter((audit) => audit.qualityScore! >= 70).length },
    { key: "unrated", count: audits.length - scoredAudits.length },
  ];
  function runSearch(id: string) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setSelectedId(id);
    setView("leads");
    startTransition(async () => {
      try {
        const response = await runLeadSearchAction(id);
        if (!response.success) { setError(t(response.error)); return; }
      } catch { setError(t("googleUnavailable")); }
      finally { submitting.current = false; }
    });
  }
  function showResults(id: string) { setSelectedId(id); setError(null); setView("leads"); }
  const navigation = [
    { value: "overview", icon: LayoutDashboard },
    { value: "campaigns", icon: FolderSearch },
    { value: "leads", icon: Users },
    { value: "savedLeads", icon: Bookmark },
    { value: "analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AuditProgressCard audits={audits} searching={pending || searches.some((search) => ["QUEUED", "RUNNING"].includes(search.status))} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <nav aria-label={t("navigation")} className="flex flex-wrap gap-1">
          {navigation.map(({ value, icon: Icon }) => (
            <Button key={value} variant={view === value ? "secondary" : "ghost"} aria-pressed={view === value} onClick={() => setView(value)}>
              <Icon aria-hidden="true" />{t(value)}
            </Button>
          ))}
        </nav>
        <LeadSearchDialog />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{t("setupBadge")}</Badge>
        <span>{t("setupHint")}</span>
      </div>
      {!googleConfigured && <p role="status" className="text-sm text-muted-foreground">{t("googleNotConfigured")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {detailsError && <p role="alert" className="text-sm text-destructive">{t(detailsError)}</p>}
      {statusError && <p role="alert" className="text-sm text-destructive">{t("jobStatusError")}</p>}
      <div className={view === "savedLeads" ? "contents" : "hidden"}><SavedLeadsView leads={savedLeads} audits={audits} isOwner={isOwner} enabled={view === "savedLeads"} /></div>
      {searches.filter((search) => search.status === "RUNNING" || search.status === "QUEUED" || search.id === selected?.id).map((search) => <SearchJobStatus key={search.id + search.runId} search={search} />)}

      {(view === "overview" || view === "analytics") && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "totalLeads", value: String(searches.reduce((sum, search) => sum + search.resultCount, 0)), hint: "totalHint", icon: Users },
            { title: "averageScore", value: averageScore, hint: "scoreHint", icon: BarChart3 },
            { title: "totalCampaigns", value: String(searches.length), hint: "campaignHint", icon: FolderSearch },
          ].map(({ title, value, hint, icon: Icon }) => (
            <Card key={title}>
              <CardHeader>
                <CardDescription>{t(title)}</CardDescription>
                <CardAction><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></CardAction>
                <CardTitle className={`text-3xl tabular-nums ${title === "averageScore" ? qualityStyles[qualityTone(scoredAudits.length ? Number(averageScore) : null)].text : ""}`}>{value}</CardTitle>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">{t(hint)}</CardFooter>
            </Card>
          ))}
        </div>
      )}

      {(view === "overview" || view === "campaigns") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("campaigns")}</CardTitle>
            <CardDescription>{t("campaignDescription")}</CardDescription>
            {view === "overview" && <CardAction><Button variant="ghost" size="sm" onClick={() => setView("campaigns")}>{t("viewAll")}<ArrowRight aria-hidden="true" /></Button></CardAction>}
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">{isOwner ? t("ownerVisibility") : t("internVisibility")}</p>
            <CampaignTable key={searches.length} searches={searches} isOwner={isOwner} compact={view === "overview"} onRun={runSearch} onShow={showResults} running={pending} />
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "leads" || view === "analytics") && (
        <div className={view === "overview" ? "grid min-w-0 gap-4 lg:grid-cols-3" : "grid min-w-0 gap-4"}>
          {view !== "analytics" && (
            <div className={view === "overview" ? "min-w-0 space-y-3 lg:col-span-2" : "min-w-0 space-y-3"}>
              <PlacesResults key={selected?.id + String(selected?.runId)} result={result} pending={pending || isSearching || loadingDetails} compact={view === "overview"} searchId={selected?.id} savedLeads={savedLeads} userId={userId} audits={audits.filter((audit) => audit.userId === selected?.userId)} context={selected ? { location: selected.location, industry: selected.industry } : undefined} />
            </div>
          )}
          {view !== "leads" && <Card>
            <CardHeader>
              <CardTitle>{t("distribution")}</CardTitle>
              <CardDescription>{t("distributionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              {scoredAudits.length === 0 && <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                <BarChart3 className="mb-3 size-7 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{t("noAnalysis")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("noAnalysisHint")}</p>
              </div>}
              <div className="space-y-3">
                {distribution.map(({ key, count }) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t(key)}</span><Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>}
        </div>
      )}
    </div>
  );
}
