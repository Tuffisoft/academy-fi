"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { savedLeadsCsv } from "@/lib/lead-research/export-csv";
import type { PlaceResult } from "@/lib/lead-research/google-places";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import { loadSavedLeadDetailsAction } from "@/lib/actions/saved-leads.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaveLeadButton } from "./save-lead-button";
import { AuditScore, LeadDetailsDialog } from "./lead-details-dialog";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { auditIsActive } from "@/lib/lead-research/audit-progress";

import { prepareLeadRows } from "@/lib/lead-research/lead-groups";
import { LeadGroupHeading } from "./lead-group-heading";

export function SavedLeadsView({ leads, audits, isOwner, enabled }: { leads: SavedLeadSummary[]; audits: AuditSummary[]; isOwner: boolean; enabled: boolean }) {
  const t = useTranslations("leadResearch");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportError, setExportError] = useState(false);
  const auditByPlace = new Map(audits.map((audit) => [JSON.stringify([audit.userId, audit.placeId]), audit]));
  const sorted = !audits.some(auditIsActive);
  const grouped = prepareLeadRows(leads, lead => auditByPlace.get(JSON.stringify([lead.userId, lead.placeId])), sorted);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(leads.length / 10) - 1));
  const offset = currentPage * 10;
  const rows = grouped.rows.slice(offset, offset + 10);
  const requestKey = JSON.stringify(rows.map(({ item: lead }) => ({ id: lead.id, placeId: lead.placeId })));
  const cache = useRef(new Map<string, PlaceResult>());
  const requests = useRef(new Map<string, ReturnType<typeof loadSavedLeadDetailsAction>>());
  const [snapshot, setSnapshot] = useState<{ key: string; places: PlaceResult[]; error: string | null } | null>(null);

  useEffect(() => {
    if (!enabled || requestKey === "[]") return;
    let disposed = false;
    const selected = JSON.parse(requestKey) as { id: string; placeId: string }[];
    async function load() {
      const missing = selected.filter((lead) => !cache.current.has(lead.placeId));
      let error: string | null = null;
      try {
        if (missing.length) {
          const ids = missing.map((lead) => lead.id);
          const key = JSON.stringify(ids);
          let request = requests.current.get(key);
          if (!request) { request = loadSavedLeadDetailsAction(ids); requests.current.set(key, request); }
          let response: Awaited<typeof request>;
          try { response = await request; }
          finally { if (requests.current.get(key) === request) requests.current.delete(key); }
          if (response.success) {
            for (const place of response.results) cache.current.set(place.id, place);
            error = response.partialError;
          } else error = response.error;
        }
      } catch { error = "googleUnavailable"; }
      if (!disposed) setSnapshot({ key: requestKey, places: selected.flatMap((lead) => { const place = cache.current.get(lead.placeId); return place ? [place] : []; }), error });
    }
    void Promise.resolve().then(() => { if (!disposed) return load(); });
    return () => { disposed = true; };
  }, [enabled, requestKey, retry]);

  const loading = rows.length > 0 && snapshot?.key !== requestKey;
  const places = new Map((snapshot?.key === requestKey ? snapshot.places : []).map((place) => [place.id, place]));
  const error = snapshot?.key === requestKey ? snapshot.error : null;
  const selectedLeads = leads.filter(lead => selectedIds.has(lead.id));
  const selectableRows = rows.filter(({ item }) => !loading && places.has(item.placeId));
  const checkedOnPage = selectableRows.filter(({ item }) => selectedIds.has(item.id)).length;
  function selectLead(id: string, checked: boolean) {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function exportSelected() {
    setExportError(false);
    try {
      if (!selectedLeads.length) return;
      const entries = selectedLeads.map(lead => {
        const place = cache.current.get(lead.placeId);
        if (!place) throw new Error("missing_details");
        return { lead, place };
      });
      const url = URL.createObjectURL(new Blob([savedLeadsCsv(entries)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `studio-fi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setExportError(true); }
  }
  const columns = isOwner ? 9 : 8;
  return <Card className="min-w-0">
    <CardHeader><CardTitle>{t("savedLeads")}</CardTitle><CardAction><Badge variant="secondary">{t("leadCount", { count: leads.length })}</Badge></CardAction></CardHeader>
    <CardContent className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm" role="status">{t("csvSelected", { count: selectedLeads.length })}</p>
          <p className="text-xs text-muted-foreground">{t("csvDescription")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedLeads.length > 0 && <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t("csvClearSelection")}</Button>}
          <Button disabled={selectedLeads.length === 0} onClick={exportSelected}><Download aria-hidden="true" />{t("csvTransfer")}</Button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-destructive">{t("csvError")}</p>}
      {error && <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-destructive">{t(error)}</p><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>{t("retryDetails")}</Button></div>}
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-12"><Checkbox aria-label={t("csvSelectPage")} disabled={selectableRows.length === 0} checked={selectableRows.length > 0 && checkedOnPage === selectableRows.length} indeterminate={checkedOnPage > 0 && checkedOnPage < selectableRows.length} onCheckedChange={checked => setSelectedIds(previous => {
            const next = new Set(previous);
            for (const { item } of selectableRows) { if (checked) next.add(item.id); else next.delete(item.id); }
            return next;
          })} /></TableHead>
          {["company", "address", "website", "phone", ...(isOwner ? ["author"] : []), "auditQuality", "selection", "leadDetails"].map((key) => <TableHead key={key} className={key === "selection" ? "w-12" : undefined}>{key === "selection" ? <><Bookmark className="size-4" aria-hidden="true" /><span className="sr-only">{t(key)}</span></> : t(key)}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map(({ item: lead, group }, index) => {
            const place = places.get(lead.placeId);
            const audit = auditByPlace.get(JSON.stringify([lead.userId, lead.placeId]));
            return <Fragment key={lead.id}>
              {sorted && (index === 0 || rows[index - 1].group !== group) && <LeadGroupHeading group={group} count={grouped.counts[group]} columns={columns} />}
              <TableRow>
              <TableCell><Checkbox aria-label={t("csvSelectLead", { name: place?.name ?? lead.placeId })} checked={selectedIds.has(lead.id)} disabled={loading || !place} onCheckedChange={checked => selectLead(lead.id, checked)} /></TableCell>
              <TableCell className="min-w-40 max-w-52 whitespace-normal">{loading ? <Skeleton className="h-5 w-32" /> : <>
                <p className="wrap-anywhere font-medium">{place?.name ?? t("savedLeadUnavailable")}</p>
                {place?.attributions.map((a, index) => <p key={index} className="text-xs text-muted-foreground">{a.uri ? <a href={a.uri} className="underline" target="_blank" rel="noopener noreferrer">{a.name}</a> : a.name}</p>)}
              </>}</TableCell>
              <TableCell className="min-w-36 max-w-52 wrap-anywhere whitespace-normal">{loading ? <Skeleton className="h-5 w-28" /> : place?.address ?? t("notProvided")}</TableCell>
              <TableCell>{loading ? <Skeleton className="h-5 w-20" /> : place?.website ? <Button nativeButton={false} variant="link" size="sm" render={<a href={place.website} target="_blank" rel="noopener noreferrer" />}>{t("openWebsite")}</Button> : t("notProvided")}</TableCell>
              <TableCell>{loading ? <Skeleton className="h-5 w-24" /> : place?.phone ?? t("notProvided")}</TableCell>
              {isOwner && <TableCell>{lead.authorName}</TableCell>}
              <TableCell><AuditScore audit={audit} /></TableCell>
              <TableCell><SaveLeadButton savedId={lead.id} placeId={lead.placeId} name={place?.name ?? t("savedLeads")} /></TableCell>
              <TableCell>{loading ? <Skeleton className="h-8 w-24" /> : place ? <LeadDetailsDialog place={place} audit={audit} context={lead.location && lead.industry ? { location: lead.location, industry: lead.industry } : undefined} /> : t("notProvided")}</TableCell>
            </TableRow></Fragment>;
          })}
          {rows.length === 0 && <TableRow><TableCell colSpan={columns} className="h-40 whitespace-normal text-center text-muted-foreground">{t("noSavedLeads")}</TableCell></TableRow>}
        </TableBody>
      </Table>
      {rows.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("pagination", { from: offset + 1, to: offset + rows.length, total: leads.length })}</p>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previous")}</Button><Button variant="outline" size="sm" disabled={offset + 10 >= leads.length} onClick={() => setPage(currentPage + 1)}>{t("next")}</Button></div>
      </div>}
    </CardContent>
  </Card>;
}
