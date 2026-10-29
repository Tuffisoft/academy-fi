"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import type { AuditPotential } from "@/lib/lead-research/audit-progress";
import { isAreaSearch } from "@/lib/lead-research/search-input";
import { loadAuditPlacesAction } from "@/lib/actions/website-audits.actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { LeadColumnLabel, LeadListTable } from "./lead-list-table";
import { PlaceBusinessStatus, PlaceGoogleRating } from "./place-signals";
import { AuditScore, LeadDetailsDialog } from "./lead-details-dialog";
import { SaveLeadButton } from "./save-lead-button";

type Result = Awaited<ReturnType<typeof loadAuditPlacesAction>>;

export function AuditPotentialLeads({ audits, potential, savedLeads, userId, onClear }: {
  audits: AuditSummary[]; potential: AuditPotential; savedLeads: SavedLeadSummary[]; userId: string; onClear: () => void;
}) {
  const t = useTranslations("leadResearch");
  const heading = useRef<HTMLHeadingElement>(null);
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(audits.length / 10) - 1));
  const offset = currentPage * 10;
  const rows = audits.slice(offset, offset + 10);
  const key = JSON.stringify(rows.map(row => row.id));
  const requests = useRef(new Map<string, Promise<Result>>());
  const cache = useRef(new Map<string, Result>());
  const [snapshot, setSnapshot] = useState<{ key: string; result: Result } | null>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, []);
  useEffect(() => {
    if (key === "[]") return;
    let disposed = false;
    async function load() {
      let result = cache.current.get(key);
      if (!result) {
        let request = requests.current.get(key);
        if (!request) { request = loadAuditPlacesAction(JSON.parse(key)); requests.current.set(key, request); }
        try { result = await request; } catch { result = { success: false, error: "googleUnavailable" }; }
        finally { requests.current.delete(key); }
        if (result.success && !result.partialError) cache.current.set(key, result);
      }
      if (!disposed) setSnapshot({ key, result });
    }
    void Promise.resolve().then(() => { if (!disposed) return load(); });
    return () => { disposed = true; };
  }, [key, retry]);
  const result = snapshot?.key === key ? snapshot.result : null;
  const loading = rows.length > 0 && !result;
  const places = new Map((result?.success ? result.places : []).map(place => [place.id, place]));
  const error = result ? result.success ? result.partialError : result.error : null;
  const saved = new Map(savedLeads.filter(lead => lead.userId === userId).map(lead => [lead.placeId, lead.id]));
  return <Card className="min-w-0">
    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
      <h2 ref={heading} tabIndex={-1} className="scroll-mt-4 font-semibold outline-none">{t(potential)} · {t("leadCount", { count: audits.length })}</h2>
      <Button variant="outline" size="sm" onClick={onClear}>{t("clearPotentialFilter")}</Button>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("auditCrossCampaign")}</p>
      {error && <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-destructive">{t(error)}</p><Button variant="outline" size="sm" onClick={() => setRetry(value => value + 1)}>{t("retryDetails")}</Button></div>}
      <LeadListTable>
        <TableHeader><TableRow>{["company", "industry", "website", "businessStatus", "googleStars", "auditQuality", "storageStatus", "leadDetails"].map(column => <TableHead key={column} title={t(column)}><LeadColumnLabel column={column} label={t(column)} /></TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map(audit => {
          const place = places.get(audit.placeId);
          const source = result?.success ? result.sources[audit.id] : undefined;
          return <TableRow key={audit.id}>
            <TableCell>{loading ? <Skeleton className="h-5 w-32" /> : <><p className="font-medium wrap-anywhere">{place?.name ?? t("savedLeadUnavailable")}</p>{!place && <p className="text-xs text-muted-foreground wrap-anywhere">{audit.placeId}</p>}{place?.attributions.map((item, index) => <p key={index} className="text-xs text-muted-foreground">{item.uri ? <a href={item.uri} target="_blank" rel="noopener noreferrer" className="underline">{item.name}</a> : item.name}</p>)}</>}</TableCell>
            <TableCell>{loading ? <Skeleton className="h-5 w-20" /> : place?.category ?? (source && !isAreaSearch(source.industry) ? source.industry : t("notProvided"))}</TableCell>
            <TableCell>{place?.website ? <a href={place.website} title={place.website} target="_blank" rel="noopener noreferrer" className="block truncate underline">{place.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : t("notProvided")}</TableCell>
            <TableCell><PlaceBusinessStatus place={place ?? {}} /></TableCell>
            <TableCell><PlaceGoogleRating place={place ?? {}} /></TableCell>
            <TableCell><AuditScore numberOnly audit={audit} /></TableCell>
            <TableCell><SaveLeadButton searchId={source?.searchId} placeId={audit.placeId} savedId={saved.get(audit.placeId)} name={place?.name ?? t("savedLeads")} /></TableCell>
            <TableCell>{place && <LeadDetailsDialog compactTrigger place={place} audit={audit} context={source} />}</TableCell>
          </TableRow>;
        })}{rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center">{t("noPotentialLeads")}</TableCell></TableRow>}</TableBody>
      </LeadListTable>
      {audits.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{t("pagination", { from: offset + 1, to: Math.min(offset + 10, audits.length), total: audits.length })}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previous")}</Button><Button variant="outline" size="sm" disabled={offset + 10 >= audits.length} onClick={() => setPage(currentPage + 1)}>{t("next")}</Button></div></div>}
    </CardContent>
  </Card>;
}
