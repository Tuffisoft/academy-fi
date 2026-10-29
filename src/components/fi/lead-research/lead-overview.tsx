"use client";

import { useTranslations, useFormatter } from "next-intl";
import { ArrowRight, Bookmark, Target, Users } from "lucide-react";
import { NEED_GROUPS, countWebsiteNeeds } from "@/lib/lead-research/lead-assessment";
import { isAreaSearch } from "@/lib/lead-research/search-input";
import type { AuditPotential } from "@/lib/lead-research/audit-progress";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import type { LeadSearchSummary, SavedLeadSummary } from "@/lib/lead-research/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function LeadOverview({ searches, audits, savedLeads, onSaved, onCampaign, onPotential }: {
  searches: LeadSearchSummary[]; audits: AuditSummary[]; savedLeads: SavedLeadSummary[];
  onSaved: () => void; onCampaign: (id: string) => void; onPotential: (potential: AuditPotential) => void;
}) {
  const t = useTranslations("leadResearch");
  const format = useFormatter();
  const counts = countWebsiteNeeds(audits);
  const found = searches.reduce((sum, search) => sum + search.resultCount, 0);
  const campaigns = searches.filter(search => search.resultCount > 0).map(search => {
    const places = new Set(search.placeIds ?? []);
    const campaignAudits = audits.filter(audit => audit.userId === search.userId && places.has(audit.placeId));
    return { search, high: countWebsiteNeeds(campaignAudits).highPotential, checked: campaignAudits.length };
  }).sort((a, b) => b.high - a.high || b.search.resultCount - a.search.resultCount).slice(0, 5);
  const metrics = [
    { label: "overviewFound", value: found, Icon: Users },
    { label: "highPotential", value: counts.highPotential, Icon: Target },
    { label: "savedLeads", value: savedLeads.length, Icon: Bookmark },
  ];
  return <div className="min-w-0 space-y-5">
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map(({ label, value, Icon }) => <Card key={label} size="sm">
        <CardContent className="flex items-start justify-between gap-3">
          <div className="space-y-2"><p className="text-sm text-muted-foreground">{t(label)}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(value)}</p></div>
          <Icon className="mt-1 size-4 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>)}
    </div>
    <Card>
      <CardHeader><CardTitle>{t("overviewPotential")}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {audits.length === 0 && <p className="pb-3 text-sm text-muted-foreground">{t("noAnalysis")}</p>}
        {NEED_GROUPS.map(key => {
          const share = audits.length ? counts[key] / audits.length * 100 : 0;
          return <button key={key} type="button" disabled={counts[key] === 0} onClick={() => onPotential(key)}
            aria-label={t("showPotentialLeads", { potential: t(key), count: counts[key] })}
            className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 sm:grid-cols-[12rem_minmax(0,1fr)_4rem_1rem]">
            <span className="text-sm font-medium">{t(key)}</span>
            <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-muted sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </span>
            <span className="col-start-2 row-start-1 text-right text-lg font-semibold tabular-nums sm:col-start-3">{format.number(counts[key])}</span>
            <ArrowRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
          </button>;
        })}
      </CardContent>
    </Card>
    <Card className="min-w-0">
      <CardHeader><CardTitle>{t("overviewCampaignComparison")}</CardTitle><p className="text-sm text-muted-foreground">{t("overviewCampaignHint")}</p></CardHeader>
      <CardContent>
        {campaigns.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("overviewNoCampaigns")}</p> : <Table>
          <TableHeader><TableRow><TableHead>{t("industry")}</TableHead><TableHead>{t("location")}</TableHead><TableHead className="text-right">{t("overviewFound")}</TableHead><TableHead className="text-right">{t("highPotential")}</TableHead><TableHead><span className="sr-only">{t("leadDetails")}</span></TableHead></TableRow></TableHeader>
          <TableBody>{campaigns.map(({ search, high, checked }) => <TableRow key={search.id}>
            <TableCell className="max-w-64 whitespace-normal font-medium">{isAreaSearch(search.industry) ? t("areaSearch") : search.industry}</TableCell>
            <TableCell className="max-w-48 whitespace-normal text-muted-foreground">{search.location}</TableCell>
            <TableCell className="text-right tabular-nums">{format.number(search.resultCount)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{checked ? format.number(high) : "—"}</TableCell>
            <TableCell className="text-right"><Button variant="ghost" size="icon-sm" onClick={() => onCampaign(search.id)} aria-label={t("overviewOpenCampaign", { industry: isAreaSearch(search.industry) ? t("areaSearch") : search.industry, location: search.location })}><ArrowRight aria-hidden="true" /></Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
        <div className="mt-4 flex justify-end"><Button variant="ghost" size="sm" onClick={onSaved}>{t("savedLeads")}<ArrowRight aria-hidden="true" /></Button></div>
      </CardContent>
    </Card>
  </div>;
}
