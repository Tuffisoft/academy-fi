"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlaceResult } from "@/lib/lead-research/google-places";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import { loadSavedLeadDetailsAction } from "@/lib/actions/saved-leads.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaveLeadButton } from "./save-lead-button";
import { AuditScore, LeadDetailsDialog } from "./lead-details-dialog";
import type { AuditSummary } from "@/lib/lead-research/audit-types";

export function SavedLeadsView({ leads, audits, isOwner, enabled }: { leads: SavedLeadSummary[]; audits: AuditSummary[]; isOwner: boolean; enabled: boolean }) {
  const t = useTranslations("leadResearch");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(leads.length / 10) - 1));
  const offset = currentPage * 10;
  const rows = leads.slice(offset, offset + 10);
  const requestKey = JSON.stringify(rows.map((lead) => ({ id: lead.id, placeId: lead.placeId })));
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
  const columns = isOwner ? 8 : 7;
  const auditByPlace = new Map(audits.map((audit) => [JSON.stringify([audit.userId, audit.placeId]), audit]));
  return <Card className="min-w-0">
    <CardHeader><CardTitle>{t("savedLeads")}</CardTitle><CardDescription>{t("savedLeadsDescription")}</CardDescription><CardAction><Badge variant="secondary">{t("leadCount", { count: leads.length })}</Badge></CardAction></CardHeader>
    <CardContent className="space-y-4">
      {error && <div className="flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-destructive">{t(error)}</p><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>{t("retryDetails")}</Button></div>}
      <Table>
        <TableHeader><TableRow>{["company", "address", "website", "phone", ...(isOwner ? ["author"] : []), "auditQuality", "selection", "leadDetails"].map((key) => <TableHead key={key}>{t(key)}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((lead) => {
            const place = places.get(lead.placeId);
            const audit = auditByPlace.get(JSON.stringify([lead.userId, lead.placeId]));
            return <TableRow key={lead.id}>
              <TableCell className="max-w-52 whitespace-normal">{loading ? <Skeleton className="h-5 w-32" /> : <>
                <p className="wrap-anywhere font-medium">{place?.name ?? t("savedLeadUnavailable")}</p>
                {place?.attributions.map((a, index) => <p key={index} className="text-xs text-muted-foreground">{a.uri ? <a href={a.uri} className="underline" target="_blank" rel="noopener noreferrer">{a.name}</a> : a.name}</p>)}
              </>}</TableCell>
              <TableCell className="max-w-52 whitespace-normal">{loading ? <Skeleton className="h-5 w-28" /> : place?.address ?? t("notProvided")}</TableCell>
              <TableCell>{loading ? <Skeleton className="h-5 w-20" /> : place?.website ? <Button nativeButton={false} variant="link" size="sm" render={<a href={place.website} target="_blank" rel="noopener noreferrer" />}>{t("openWebsite")}</Button> : t("notProvided")}</TableCell>
              <TableCell>{loading ? <Skeleton className="h-5 w-24" /> : place?.phone ?? t("notProvided")}</TableCell>
              {isOwner && <TableCell>{lead.authorName}</TableCell>}
              <TableCell><AuditScore audit={audit} /></TableCell>
              <TableCell><SaveLeadButton savedId={lead.id} placeId={lead.placeId} name={place?.name ?? t("savedLeads")} /></TableCell>
              <TableCell>{loading ? <Skeleton className="h-8 w-24" /> : place ? <LeadDetailsDialog place={place} audit={audit} context={lead.location && lead.industry ? { location: lead.location, industry: lead.industry } : undefined} /> : t("notProvided")}</TableCell>
            </TableRow>;
          })}
          {rows.length === 0 && <TableRow><TableCell colSpan={columns} className="h-40 whitespace-normal text-center text-muted-foreground">{t("noSavedLeads")}</TableCell></TableRow>}
        </TableBody>
      </Table>
      {rows.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("pagination", { from: offset + 1, to: offset + rows.length, total: leads.length })}</p>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previous")}</Button><Button variant="outline" size="sm" disabled={offset + 10 >= leads.length} onClick={() => setPage(currentPage + 1)}>{t("next")}</Button></div>
      </div>}
    </CardContent>
    <CardFooter className="flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{t("savedLiveNotice")}</span><span translate="no" className="whitespace-nowrap font-normal not-italic tracking-normal">Google Maps</span></CardFooter>
  </Card>;
}
