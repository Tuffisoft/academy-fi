"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, FolderSearch, LayoutDashboard, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { runLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import { PlacesResults, type LivePlacesResult } from "./places-results";
import { LeadSearchDialog } from "./lead-search-dialog";
import { CampaignTable } from "./campaign-table";
import type { LeadSearchSummary } from "@/lib/lead-research/types";

type View = "overview" | "campaigns" | "leads" | "analytics";

export function LeadResearchWorkspace({ searches, isOwner, googleConfigured }: { searches: LeadSearchSummary[]; isOwner: boolean; googleConfigured: boolean }) {
  const t = useTranslations("leadResearch");
  const [view, setView] = useState<View>("overview");
  const [result, setResult] = useState<LivePlacesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [runId, setRunId] = useState(0);
  const submitting = useRef(false);
  function runSearch(id: string) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setResult(null);
    setRunId((value) => value + 1);
    setView("leads");
    startTransition(async () => {
      try {
        const response = await runLeadSearchAction(id);
        if (!response.success) { setError(t(response.error)); return; }
        setResult(response);
      } catch { setError(t("googleUnavailable")); }
      finally { submitting.current = false; }
    });
  }
  const navigation = [
    { value: "overview", icon: LayoutDashboard },
    { value: "campaigns", icon: FolderSearch },
    { value: "leads", icon: Users },
    { value: "analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-5">
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

      {(view === "overview" || view === "analytics") && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "totalLeads", value: String(searches.reduce((sum, search) => sum + search.resultCount, 0)), hint: "totalHint", icon: Users },
            { title: "averageScore", value: "—", hint: "scoreHint", icon: BarChart3 },
            { title: "totalCampaigns", value: String(searches.length), hint: "campaignHint", icon: FolderSearch },
          ].map(({ title, value, hint, icon: Icon }) => (
            <Card key={title}>
              <CardHeader>
                <CardDescription>{t(title)}</CardDescription>
                <CardAction><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></CardAction>
                <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
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
            <CampaignTable key={searches.length} searches={searches} isOwner={isOwner} compact={view === "overview"} onRun={runSearch} running={pending} />
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "leads" || view === "analytics") && (
        <div className={view === "overview" ? "grid min-w-0 gap-4 lg:grid-cols-3" : "grid min-w-0 gap-4"}>
          {view !== "analytics" && (
            <PlacesResults key={runId} result={result} pending={pending} compact={view === "overview"} />
          )}
          {view !== "leads" && <Card>
            <CardHeader>
              <CardTitle>{t("distribution")}</CardTitle>
              <CardDescription>{t("distributionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                <BarChart3 className="mb-3 size-7 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{t("noAnalysis")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("noAnalysisHint")}</p>
              </div>
              <div className="space-y-3">
                {["highPotential", "mediumPotential", "lowPotential", "unrated"].map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t(key)}</span><Badge variant="secondary">0</Badge>
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
