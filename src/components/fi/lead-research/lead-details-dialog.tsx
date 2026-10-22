"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Building2, Download, Gauge, Globe } from "lucide-react";
import type { PlaceResult } from "@/lib/lead-research/google-places";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import type { WebsiteReport } from "@/lib/lead-research/website-quality";
import { getWebsiteReportAction } from "@/lib/actions/website-audits.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { qualityStyles, qualityTone } from "./quality-presentation";
import { WebsiteAuditOverview, WebsiteAuditResults } from "./website-audit-results";

export function AuditScore({ audit }: { audit?: AuditSummary }) {
  const t = useTranslations("leadResearch");
  const tone = qualityTone(audit?.status === "COMPLETED" ? audit.qualityScore : null);
  return <Badge variant="outline" className={qualityStyles[tone].badge}>
    {audit?.status === "COMPLETED" ? audit.qualityScore === null ? t("auditIncomplete") : `${audit.qualityScore}/100` : t(`auditStatuses.${audit?.status ?? "NOT_STARTED"}`)}
  </Badge>;
}

export function LeadDetailsDialog({ place, audit, context }: { place: PlaceResult; audit?: AuditSummary; context?: { industry: string; location: string } }) {
  const t = useTranslations("leadResearch");
  const format = useFormatter();
  const locale = useLocale();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([audit?.id, audit?.checkedAt, retry]);
  const [snapshot, setSnapshot] = useState<{ key: string; report: WebsiteReport | null; error: boolean } | null>(null);
  const requests = useRef(new Map<string, ReturnType<typeof getWebsiteReportAction>>());
  const auditId = audit?.id;
  const completed = audit?.status === "COMPLETED";
  useEffect(() => {
    if (!open || !completed || !auditId) return;
    let disposed = false;
    void Promise.resolve().then(async () => {
      if (disposed) return;
      let request = requests.current.get(key);
      if (!request) { request = getWebsiteReportAction(auditId); requests.current.set(key, request); }
      try {
        const result = await request;
        if (!disposed) setSnapshot({ key, report: result.success ? result.report : null, error: !result.success || !result.report });
      } catch {
        requests.current.delete(key);
        if (!disposed) setSnapshot({ key, report: null, error: true });
      }
    });
    return () => { disposed = true; };
  }, [open, completed, auditId, key]);
  const report = snapshot?.key === key ? snapshot.report : null;
  const error = snapshot?.key === key && snapshot.error;
  const tone = qualityTone(completed ? audit?.qualityScore : null);
  const style = qualityStyles[tone];
  const detailRows = [[t("address"), place.address ?? t("notProvided")], [t("phone"), place.phone ?? t("notProvided")], [t("industry"), context?.industry ?? t("notProvided")], [t("location"), context?.location ?? t("notProvided")]];
  async function downloadPdf() {
    if (!auditId || exporting) return;
    setExporting(true); setExportError(false);
    try {
      const response = await fetch(`/api/website-audits/${encodeURIComponent(auditId)}/pdf?locale=${encodeURIComponent(locale)}`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) throw new Error("pdf_unavailable");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "website-report.pdf";
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { setExportError(true); }
    finally { setExporting(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="outline" size="sm" aria-label={t("leadDetailsFor", { name: place.name })}>{t("leadDetails")}</Button>} />
    <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 sm:px-6 sm:pr-12">
        <DialogTitle className="wrap-anywhere text-xl">{place.name}</DialogTitle>
        <DialogDescription className="sr-only">{t("auditDetailsDescription")}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-7 overflow-y-auto p-5 sm:p-8">
        <Card className={style.surface}>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Gauge className={`size-4 shrink-0 ${style.text}`} aria-hidden="true" />{t("auditQuality")}</h2>
                {tone === "unknown" ? <AuditScore audit={audit} /> : <Badge variant="outline" className={style.badge}>{t(`auditRating.${tone}`)}</Badge>}
              </div>
              {tone !== "unknown" && <p className={`shrink-0 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl ${style.text}`}>{audit?.qualityScore}<span className="ml-1 text-base font-normal text-muted-foreground">/100</span></p>}
            </div>
            {audit?.checkedAt && <p className="text-xs text-muted-foreground">{t("auditCheckedAt", { date: format.dateTime(new Date(audit.checkedAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) })}</p>}
          </CardContent>
        </Card>

        {report && <WebsiteAuditOverview report={report} />}

        <Card size="sm">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-muted-foreground" aria-hidden="true" />{t("auditBusinessDetails")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{detailRows.map(([label, value]) => <div key={label} className="min-w-0"><dt className="mb-1 text-xs text-muted-foreground">{label}</dt><dd className="wrap-anywhere text-sm font-medium">{value}</dd></div>)}</dl>
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {place.website && <Button nativeButton={false} variant="outline" size="sm" render={<a href={place.website} target="_blank" rel="noopener noreferrer" />}><Globe aria-hidden="true" />{t("openWebsite")}</Button>}
              <Button nativeButton={false} variant="outline" size="sm" render={<a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" />}>{t("maps")}</Button>
            </div>
            <p className="wrap-anywhere text-xs text-muted-foreground">{t("auditPlaceId")}: {place.id}</p>
          </CardContent>
        </Card>

        {audit?.errorCode && <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{t(audit.errorCode)}</p>}
        {audit?.status === "NO_WEBSITE" && <p className="rounded-lg border bg-muted/30 p-3 text-sm">{t("auditNoWebsite")}</p>}
        {completed && !report && !error && <div aria-label={t("auditReportLoading")} className="space-y-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-24 w-full" />)}</div><Skeleton className="h-40 w-full" /></div>}
        {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{t("auditReportError")}</p><Button variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>{t("retryDetails")}</Button></div>}

        {report && <>
          <div className="space-y-2">
            <Button variant="outline" disabled={exporting} aria-busy={exporting} onClick={downloadPdf}><Download aria-hidden="true" />{t(exporting ? "auditPdfPreparing" : "auditPdfDownload")}</Button>
            {exportError && <p role="alert" className="text-sm text-destructive">{t("auditPdfError")}</p>}
          </div>
          <WebsiteAuditResults report={report} />

          <p className="wrap-anywhere text-xs text-muted-foreground">{t("auditMeasuredUrl", { url: report.url })}</p>
        </>}
        {place.attributions.length > 0 && <div className="border-t pt-3 text-xs text-muted-foreground">{place.attributions.map((a, index) => <p key={index}>{a.uri ? <a href={a.uri} target="_blank" rel="noopener noreferrer" className="underline">{a.name}</a> : a.name}</p>)}</div>}
      </div>
    </DialogContent>
  </Dialog>;
}
