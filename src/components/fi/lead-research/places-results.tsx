"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { searchGooglePlaces } from "@/lib/lead-research/google-places";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import { SaveLeadButton } from "./save-lead-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type LivePlacesResult = Awaited<ReturnType<typeof searchGooglePlaces>>;

export function PlacesResults({ result, pending, compact, searchId, savedLeads = [], userId }: { result: LivePlacesResult | null; pending: boolean; compact: boolean; searchId?: string; savedLeads?: SavedLeadSummary[]; userId?: string }) {
  const t = useTranslations("leadResearch");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const visible = result?.results.filter((place) => `${place.name} ${place.address ?? ""} ${place.phone ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ?? [];
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visible.length / 10) - 1));
  const offset = currentPage * 10;
  const rows = visible.slice(offset, offset + 10);
  const savedByPlace = new Map(savedLeads.filter((lead) => lead.userId === userId).map((lead) => [lead.placeId, lead.id]));
  return <Card className={compact ? "min-w-0 lg:col-span-2" : "min-w-0"}>
    <CardHeader>
      <CardTitle>{t("leads")}</CardTitle>
      <CardDescription>{result ? t("resolvedLocation", { location: result.resolvedLocation }) : t("liveDescription")}</CardDescription>
      <CardAction><Badge variant="secondary">{t("leadCount", { count: result?.results.length ?? 0 })}</Badge></CardAction>
    </CardHeader>
    <CardContent className="space-y-3">
      {result && <p className="text-xs text-muted-foreground">{t("liveNotice")}</p>}
      {result?.resultLimit && <p className="text-sm text-muted-foreground">{t("googleResultLimit")}</p>}
      {result?.partialError && <p role="alert" className="text-sm text-destructive">{t("partialResults")} {t(result.partialError)}</p>}
      {!compact && <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={t("searchLeads")} aria-label={t("searchLeads")} disabled={!result} />}
      <Table>
        <TableHeader><TableRow>{["company", "address", "website", "phone", "maps", "selection"].map((key) => <TableHead key={key}>{t(key)}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((place) => <TableRow key={place.id}>
            <TableCell className="max-w-52 whitespace-normal"><p className="wrap-anywhere font-medium">{place.name}</p>{place.attributions.map((a, index) => <p key={index} className="mt-1 text-xs text-muted-foreground">{a.uri ? <a href={a.uri} target="_blank" rel="noopener noreferrer" className="underline">{a.name}</a> : a.name}</p>)}</TableCell>
            <TableCell className="max-w-56 whitespace-normal">{place.address ?? t("notProvided")}</TableCell>
            <TableCell>{place.website ? <Button nativeButton={false} variant="link" size="sm" render={<a href={place.website} target="_blank" rel="noopener noreferrer" />}>{t("openWebsite")}<ExternalLink aria-hidden="true" /></Button> : t("notProvided")}</TableCell>
            <TableCell>{place.phone ?? t("notProvided")}</TableCell>
            <TableCell><Button nativeButton={false} variant="ghost" size="icon-sm" aria-label={t("mapsFor", { name: place.name })} render={<a href={place.mapsUrl} target="_blank" rel="noopener noreferrer" />}><ExternalLink aria-hidden="true" /></Button></TableCell>
            <TableCell><SaveLeadButton searchId={searchId} placeId={place.id} savedId={savedByPlace.get(place.id)} name={place.name} /></TableCell>
          </TableRow>)}
          {pending && Array.from({ length: Math.min(4, 10 - rows.length) }, (_, row) => <TableRow key={`loading-${row}`}>{[0, 1, 2, 3, 4, 5].map((col) => <TableCell key={col} className="py-4"><Skeleton className="h-5 w-24" /></TableCell>)}</TableRow>)}
          {!pending && visible.length === 0 && <TableRow><TableCell colSpan={6} className="h-52 whitespace-normal text-center text-muted-foreground">{result ? t("noGoogleResults") : t("startFromCampaign")}</TableCell></TableRow>}
        </TableBody>
      </Table>
      {visible.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("pagination", { from: offset + 1, to: Math.min(offset + 10, visible.length), total: visible.length })}</p>
        <div className="flex gap-2"><Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t("previous")}</Button><Button variant="outline" size="sm" disabled={offset + 10 >= visible.length} onClick={() => setPage(currentPage + 1)}>{t("next")}</Button></div>
      </div>}
      <p role="status" className="sr-only">{pending ? t("searching") : t("leadCount", { count: visible.length })}</p>
    </CardContent>
    <CardFooter className="flex-wrap justify-between gap-2 text-xs text-muted-foreground">
      <span>{t("googleSource")}</span><span translate="no" className="whitespace-nowrap font-sans text-xs font-normal not-italic tracking-normal">Google Maps</span>
    </CardFooter>
  </Card>;
}
