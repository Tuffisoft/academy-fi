"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Download, LoaderCircle, Mail } from "lucide-react";
import { emailSavedLeadsAction } from "@/lib/actions/lead-export-email.actions";
import type { LeadExportEmailInput } from "@/lib/lead-research/email-export";
import { prepareSavedLeadsExport } from "@/lib/lead-research/export-csv";
import type { PlaceResult } from "@/lib/lead-research/google-places";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import { loadSavedLeadDetailsAction, loadSavedLeadExportDetailsAction } from "@/lib/actions/saved-leads.actions";
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

export function SavedLeadsView({ leads, audits, isOwner, enabled, emailSettings }: { leads: SavedLeadSummary[]; audits: AuditSummary[]; isOwner: boolean; enabled: boolean; emailSettings: { recipient: string | null; configured: boolean } }) {
  const t = useTranslations("leadResearch");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState<"download" | "email" | null>(null);
  const exportInFlight = useRef(false);
  const emailRequest = useRef<LeadExportEmailInput | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [exportMissingCount, setExportMissingCount] = useState(0);
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
  async function exportAll(mode: "download" | "email") {
    if (!leads.length || exportInFlight.current) return;
    exportInFlight.current = true;
    setExporting(mode);
    setExportError(null);
    setEmailSuccess(null);
    setExportMissingCount(0);
    try {
      const result = await prepareSavedLeadsExport(leads, cache.current, loadSavedLeadExportDetailsAction);
      if (mode === "email") {
        const leadIds = leads.map(lead => lead.id);
        if (JSON.stringify(emailRequest.current?.leadIds) !== JSON.stringify(leadIds)) emailRequest.current = null;
        emailRequest.current ??= {
          requestId: crypto.randomUUID(), leadIds,
          places: [...new Map(leads.flatMap(lead => {
            const place = cache.current.get(lead.placeId);
            if (!place) return [];
            const exportPlace: PlaceResult = { ...place, attributions: [] };
            return [[place.id, exportPlace] as const];
          })).values()],
        };
        const response = await emailSavedLeadsAction(emailRequest.current);
        if (!response.success) {
          setExportError(response.error);
          if (response.error === "csvEmailLeadsChanged") emailRequest.current = null;
          return;
        }
        emailRequest.current = null;
        setEmailSuccess(response.recipient);
        setExportMissingCount(response.missingCount);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `studio-fi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setExportMissingCount(result.missingCount);
    } catch { setExportError(mode === "email" ? "csvEmailError" : "csvError"); }
    finally { exportInFlight.current = false; setExporting(null); }
  }
  const columns = isOwner ? 8 : 7;
  return <Card className="min-w-0">
    <CardHeader><CardTitle>{t("savedLeads")}</CardTitle><CardAction><Badge variant="secondary">{t("leadCount", { count: leads.length })}</Badge></CardAction></CardHeader>
    <CardContent className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t("csvDescription")}</p>
          <p className="text-xs text-muted-foreground">{emailSettings.configured && emailSettings.recipient ? t("csvEmailRecipient", { email: emailSettings.recipient }) : t("csvEmailNotConfigured")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={leads.length === 0 || exporting !== null || !emailSettings.configured} aria-busy={exporting === "email"} onClick={() => void exportAll("email")}>{exporting === "email" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Mail aria-hidden="true" />}{t(exporting === "email" ? "csvEmailSending" : "csvTransfer")}</Button>
          <Button variant="outline" disabled={leads.length === 0 || exporting !== null} aria-busy={exporting === "download"} onClick={() => void exportAll("download")}>{exporting === "download" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download aria-hidden="true" />}{t(exporting === "download" ? "csvPreparing" : "csvDownload")}</Button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(exportError)}</p>}
      {emailSuccess && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{t("csvEmailSuccess", { email: emailSuccess })}</p>}
      {exportMissingCount > 0 && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">{t("csvIncomplete", { count: exportMissingCount })}</p>}
      {error && <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-destructive">{t(error)}</p><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>{t("retryDetails")}</Button></div>}
      <Table>
        <TableHeader><TableRow>
          {["company", "address", "website", "phone", ...(isOwner ? ["author"] : []), "auditQuality", "selection", "leadDetails"].map((key) => <TableHead key={key} className={key === "selection" ? "w-12" : undefined}>{key === "selection" ? <><Bookmark className="size-4" aria-hidden="true" /><span className="sr-only">{t(key)}</span></> : t(key)}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map(({ item: lead, group }, index) => {
            const place = places.get(lead.placeId);
            const audit = auditByPlace.get(JSON.stringify([lead.userId, lead.placeId]));
            return <Fragment key={lead.id}>
              {sorted && (index === 0 || rows[index - 1].group !== group) && <LeadGroupHeading group={group} count={grouped.counts[group]} columns={columns} />}
              <TableRow>
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
