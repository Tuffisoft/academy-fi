"use client";

import { NEED_GROUPS, countWebsiteNeeds } from "@/lib/lead-research/lead-assessment";

import { useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bookmark,
  Code2,
  FolderSearch,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { runLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import { PlacesResults } from "./places-results";
import { LeadSearchDialog } from "./lead-search-dialog";
import { CampaignTable } from "./campaign-table";
import type {
  LeadSearchSummary,
  SavedLeadSummary,
} from "@/lib/lead-research/types";
import { useSearchProgress } from "./use-search-progress";
import { SearchJobStatus } from "./search-job-status";
import { useLivePlaces } from "./use-live-places";
import { SavedLeadsView } from "./saved-leads-view";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { qualityStyles, qualityTone } from "./quality-presentation";
import { AuditProgressCard } from "./audit-progress-card";
import { auditPotential, type AuditPotential } from "@/lib/lead-research/audit-progress";
import { LeadOverview } from "./lead-overview";
import { AuditPotentialLeads } from "./audit-potential-leads";

const PdfDesignEditor = dynamic(() =>
  import("./pdf-design-editor").then((module) => module.PdfDesignEditor),
);
type View =
  | "overview"
  | "campaigns"
  | "leads"
  | "savedLeads"
  | "analytics"
  | "pdfDesign"
  | "potential";

export function LeadResearchWorkspace({
  searches: initialSearches,
  savedLeads,
  audits: initialAudits,
  userId,
  isOwner,
  googleConfigured,
  leadEmailSettings,
}: {
  searches: LeadSearchSummary[];
  savedLeads: SavedLeadSummary[];
  audits: AuditSummary[];
  userId: string;
  isOwner: boolean;
  googleConfigured: boolean;
  leadEmailSettings: { recipient: string | null; configured: boolean };
}) {
  const t = useTranslations("leadResearch");
  const { searches, audits, statusError } = useSearchProgress(
    initialSearches,
    initialAudits,
  );
  const [view, setView] = useState<View>("overview");
  const [pdfEditorOpened, setPdfEditorOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [potentialFilter, setPotentialFilter] = useState<{ potential: AuditPotential; auditIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = selectedId !== null
    ? searches.find((search) => search.id === selectedId)
    : searches.find((search) =>
      ["RUNNING", "QUEUED", "PAUSED"].includes(search.status),
    ) ??
    searches.find((search) => search.resultCount > 0);
  const isSearching =
    selected?.status === "RUNNING" || selected?.status === "QUEUED";
  const {
    result,
    loading: loadingDetails,
    error: detailsError,
  } = useLivePlaces(
    selected?.id,
    selected?.runId,
    selected?.resultCount ?? 0,
    view === "leads" && Boolean(selected) && selected?.status !== "DRAFT" && !isSearching && !pending,
  );
  const submitting = useRef(false);
  const searchingOverview = pending || searches.some(search => ["QUEUED", "RUNNING", "PAUSED"].includes(search.status)) || audits.some(audit => ["QUEUED", "RUNNING", "PAUSED"].includes(audit.status));
  const scoredAudits = audits.filter(
    (audit) => audit.status === "COMPLETED" && audit.qualityScore !== null,
  );
  const averageScore = scoredAudits.length
    ? String(
        Math.round(
          scoredAudits.reduce((sum, audit) => sum + audit.qualityScore!, 0) /
            scoredAudits.length,
        ),
      )
    : "—";
  const needCounts = countWebsiteNeeds(audits);
  const distribution = NEED_GROUPS.map(key => ({ key, count: needCounts[key] }));
  function runSearch(id: string) {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setSelectedId(id);
    setView("leads");
    startTransition(async () => {
      try {
        const response = await runLeadSearchAction(id);
        if (!response.success) {
          setError(t(response.error));
          return;
        }
      } catch {
        setError(t("googleUnavailable"));
      } finally {
        submitting.current = false;
      }
    });
  }
  function showResults(id: string) {
    setSelectedId(id);
    setError(null);
    setView("leads");
  }
  const navigation = [
    { value: "overview", icon: LayoutDashboard },
    { value: "campaigns", icon: FolderSearch },
    { value: "leads", icon: Users },
    { value: "savedLeads", icon: Bookmark },
    { value: "analytics", icon: BarChart3 },
    { value: "pdfDesign", icon: Code2 },
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {(view !== "overview" || searchingOverview) && <AuditProgressCard
        audits={audits}
        selectedPotential={view === "potential" ? potentialFilter?.potential : undefined}
        onSelectPotential={(potential, auditIds) => {
          setPotentialFilter({ potential, auditIds });
          setError(null);
          setView("potential");
        }}
        searching={
          pending ||
          searches.some((search) =>
            ["QUEUED", "RUNNING"].includes(search.status),
          )
        }
      />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <nav aria-label={t("navigation")} className="flex flex-wrap gap-1">
          {navigation.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant={view === value ? "secondary" : "ghost"}
              aria-pressed={view === value}
              onClick={() => {
                if (value === "pdfDesign") setPdfEditorOpened(true);
                setView(value);
              }}
            >
              <Icon aria-hidden="true" />
              {t(value)}
            </Button>
          ))}
        </nav>
        <LeadSearchDialog onSaved={showResults} />
      </div>

      <div className={view === "pdfDesign" ? "contents" : "hidden"}>
        {pdfEditorOpened && <PdfDesignEditor />}
      </div>
      {!googleConfigured && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("googleNotConfigured")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {detailsError && (
        <p role="alert" className="text-sm text-destructive">
          {t(detailsError)}
        </p>
      )}
      {statusError && (
        <p role="alert" className="text-sm text-destructive">
          {t("jobStatusError")}
        </p>
      )}
      <div className={view === "savedLeads" ? "contents" : "hidden"}>
        <SavedLeadsView
          leads={savedLeads}
          audits={audits}
          isOwner={isOwner}
          enabled={view === "savedLeads"}
          emailSettings={leadEmailSettings}
        />
      </div>
      {searches
        .filter(
          (search) =>
            view === "potential" ? false : view === "overview" ? ["RUNNING", "QUEUED", "PAUSED"].includes(search.status) : view === "leads"
              ? search.id === selected?.id
              : ["RUNNING", "QUEUED", "PAUSED"].includes(search.status) || search.id === selected?.id,
        )
        .map((search) => (
          <SearchJobStatus key={search.id + search.runId} search={search} />
        ))}

      {view === "potential" && potentialFilter && <AuditPotentialLeads
        key={JSON.stringify(potentialFilter)}
        potential={potentialFilter.potential}
        audits={audits.filter(audit => potentialFilter.auditIds.includes(audit.id) && auditPotential(audit) === potentialFilter.potential)}
        savedLeads={savedLeads}
        userId={userId}
        onClear={() => { setPotentialFilter(null); setView(selected ? "leads" : "overview"); }}
      />}

      {view === "leads" && selectedId !== null && !selected && (
        <div role="status" aria-label={t("selectedResearchLoading")} className="space-y-3 rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">{t("selectedResearchLoading")}</p>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {view === "overview" && <LeadOverview searches={searches} audits={audits} savedLeads={savedLeads} onSaved={() => setView("savedLeads")} onCampaign={showResults} onPotential={(potential) => { setPotentialFilter({ potential, auditIds: audits.map(audit => audit.id) }); setError(null); setView("potential"); }} />}

      {view === "analytics" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "totalLeads",
              value: String(
                searches.reduce((sum, search) => sum + search.resultCount, 0),
              ),
              icon: Users,
            },
            { title: "averageScore", value: averageScore, icon: BarChart3 },
            {
              title: "totalCampaigns",
              value: String(searches.length),
              icon: FolderSearch,
            },
          ].map(({ title, value, icon: Icon }) => (
            <Card key={title}>
              <CardHeader>
                <CardDescription>{t(title)}</CardDescription>
                <CardAction>
                  <Icon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardAction>
                <CardTitle
                  className={`text-3xl tabular-nums ${title === "averageScore" ? qualityStyles[qualityTone(scoredAudits.length ? Number(averageScore) : null)].text : ""}`}
                >
                  {value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {view === "campaigns" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("campaigns")}</CardTitle>

          </CardHeader>
          <CardContent>
            <CampaignTable
              key={searches.length}
              searches={searches}
              isOwner={isOwner}
              compact={false}
              onRun={runSearch}
              onShow={showResults}
              running={pending}
            />
          </CardContent>
        </Card>
      )}

      {(view === "leads" || view === "analytics") && (
        <div
          className="grid min-w-0 gap-4"
        >
          {view !== "analytics" && !(view === "leads" && (!selected || selected.status === "DRAFT")) && (
            <div
              className="min-w-0 space-y-3"
            >
              <PlacesResults
                key={selected?.id + String(selected?.runId)}
                result={result}
                pending={pending || isSearching || loadingDetails}
                compact={false}
                searchId={selected?.id}
                completedWithoutResults={
                  selected?.status === "COMPLETED" && selected.resultCount === 0
                }
                targetResults={selected?.maxResults}
                savedLeads={savedLeads}
                userId={userId}
                audits={audits.filter(
                  (audit) => audit.userId === selected?.userId,
                )}
                context={
                  selected
                    ? {
                        location: selected.location,
                        industry: selected.industry,
                      }
                    : undefined
                }
              />
            </div>
          )}
          {view !== "leads" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("distribution")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                {audits.length === 0 && (
                  <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                    <BarChart3
                      className="mb-3 size-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <p className="font-medium">{t("noAnalysis")}</p>
                  </div>
                )}
                <div className="space-y-3">
                  {distribution.map(({ key, count }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-muted-foreground">{t(key)}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
