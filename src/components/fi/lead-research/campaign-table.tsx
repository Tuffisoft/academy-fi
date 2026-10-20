"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { FolderSearch } from "lucide-react";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignMenu } from "./campaign-menu";

export function CampaignTable({ searches, isOwner, compact, onRun, onShow, running }: { searches: LeadSearchSummary[]; isOwner: boolean; compact: boolean; onRun: (id: string) => void; onShow: (id: string) => void; running: boolean }) {
  const t = useTranslations("leadResearch");
  const format = useFormatter();
  const [page, setPage] = useState(0);
  const pageSize = compact ? 5 : 10;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(searches.length / pageSize) - 1));
  const offset = compact ? 0 : currentPage * pageSize;
  const visible = searches.slice(offset, offset + pageSize);
  const dateLabel = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

  return <div className="space-y-4">
    <Table>
      <TableHeader><TableRow>
        {["campaign", "status", ...(isOwner ? ["author"] : []), "created", "actions"].map((key) => <TableHead key={key}>{t(key)}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>
        {visible.length === 0 ? <TableRow><TableCell colSpan={isOwner ? 5 : 4} className="h-36 whitespace-normal text-center">
          <FolderSearch className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">{t("noCampaigns")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("noCampaignsHint")}</p>
        </TableCell></TableRow> : visible.map((search) => <TableRow key={search.id}>
          <TableCell className="max-w-72 whitespace-normal"><p className="wrap-anywhere font-medium">{search.location}</p><p className="wrap-anywhere text-xs text-muted-foreground">{search.industry} · {t("radiusValue", { value: search.radiusKm })}</p></TableCell>
          <TableCell><Badge variant="secondary">{t(`statuses.${search.status}`)}</Badge>{search.status === "COMPLETED" && <p className="mt-1 text-xs text-muted-foreground">{t("leadCount", { count: search.resultCount })}</p>}</TableCell>
          {isOwner && <TableCell>{search.authorName}</TableCell>}
          <TableCell><time dateTime={search.createdAt}>{dateLabel(search.createdAt)}</time></TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="sm" aria-label={t("detailsFor", { location: search.location, industry: search.industry })}>{t("details")}</Button>} />
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                <DialogHeader><DialogTitle>{t("searchDetails")}</DialogTitle><DialogDescription>{t("savedNotice")}</DialogDescription></DialogHeader>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    [t("location"), search.location], [t("industry"), search.industry],
                    [t("radius"), t("radiusValue", { value: search.radiusKm })], [t("maxResults"), format.number(search.maxResults)],
                    [t("analyzeWebsites"), search.analyzeWebsites ? t("yes") : t("no")],
                    [t("status"), t(`statuses.${search.status}`)], [t("author"), search.authorName], [t("created"), dateLabel(search.createdAt)],
                  ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="wrap-anywhere font-medium">{value}</dd></div>)}
                </dl>
              </DialogContent>
            </Dialog>
            <CampaignMenu search={search} onRun={onRun} onShow={onShow} running={running} />
            </div>
          </TableCell>
        </TableRow>)}
      </TableBody>
    </Table>
    {!compact && searches.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{t("pagination", { from: offset + 1, to: Math.min(offset + pageSize, searches.length), total: searches.length })}</p>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previous")}</Button><Button variant="outline" size="sm" disabled={offset + pageSize >= searches.length} onClick={() => setPage(currentPage + 1)}>{t("next")}</Button></div>
    </div>}
  </div>;
}
