"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { searchGooglePlaces } from "@/lib/lead-research/google-places";
import type { SavedLeadSummary } from "@/lib/lead-research/types";
import { SaveLeadButton } from "./save-lead-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditScore, LeadDetailsDialog } from "./lead-details-dialog";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { auditIsActive } from "@/lib/lead-research/audit-progress";
import { isAreaSearch } from "@/lib/lead-research/search-input";

import {
  prepareAreaLeadRows,
  prepareLeadRows,
  websiteOpportunityScore,
} from "@/lib/lead-research/lead-groups";
import { LeadGroupHeading } from "./lead-group-heading";
import { LeadColumnLabel, LeadListTable } from "./lead-list-table";
import { PlaceBusinessStatus, PlaceGoogleRating } from "./place-signals";

export type LivePlacesResult = Awaited<ReturnType<typeof searchGooglePlaces>>;

export function PlacesResults({
  result,
  pending,
  compact,
  searchId,
  completedWithoutResults,
  targetResults,
  savedLeads = [],
  userId,
  audits = [],
  context,
}: {
  result: LivePlacesResult | null;
  pending: boolean;
  compact: boolean;
  searchId?: string;
  completedWithoutResults: boolean;
  targetResults?: number;
  savedLeads?: SavedLeadSummary[];
  userId?: string;
  audits?: AuditSummary[];
  context?: { location: string; industry: string };
}) {
  const t = useTranslations("leadResearch");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const auditsByPlace = new Map(audits.map((audit) => [audit.placeId, audit]));
  const visible =
    result?.results.filter((place) =>
      `${place.name} ${place.address ?? ""} ${place.phone ?? ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ) ?? [];
  const sorted = !pending && !audits.some(auditIsActive);
  const areaSearch = Boolean(context && isAreaSearch(context.industry));
  const grouped = areaSearch
    ? prepareAreaLeadRows(
        visible,
        (place) => auditsByPlace.get(place.id),
        sorted,
      )
    : prepareLeadRows(visible, (place) => auditsByPlace.get(place.id), sorted);
  const rankedRows = areaSearch
    ? grouped.rows.filter((row) => websiteOpportunityScore(row.audit) !== null)
    : grouped.rows;
  const unrankedRows = areaSearch
    ? grouped.rows.filter((row) => websiteOpportunityScore(row.audit) === null)
    : [];
  const rankedCount = areaSearch ? rankedRows.length : 0;
  const targetCount = targetResults ?? 20;
  const shortlistRows = areaSearch
    ? sorted
      ? rankedRows.slice(0, targetCount)
      : grouped.rows.slice(0, targetCount)
    : grouped.rows;
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(shortlistRows.length / 10) - 1),
  );
  const offset = currentPage * 10;
  const rows = shortlistRows.slice(offset, offset + 10);
  const savedByPlace = new Map(
    savedLeads
      .filter((lead) => lead.userId === userId)
      .map((lead) => [lead.placeId, lead.id]),
  );
  return (
    <Card className={compact ? "min-w-0 lg:col-span-2" : "min-w-0"}>
      <CardHeader>
        <CardTitle>{t(areaSearch ? "rankedLeads" : "leads")}</CardTitle>
        <CardAction>
          <Badge variant="secondary">
            {t(areaSearch ? "candidateCount" : "leadCount", {
              count: result?.results.length ?? 0,
            })}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        {areaSearch && result && (
          <p className="text-sm text-muted-foreground">
            {t("areaSearchRanking", {
              ranked: Math.min(rankedCount, targetCount),
              target: targetCount,
              candidates: result.results.length,
            })}
          </p>
        )}
        {result?.partialError && (
          <p role="alert" className="text-sm text-destructive">
            {t("partialResults")} {t(result.partialError)}
          </p>
        )}
        {!compact && (
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder={t("searchLeads")}
            aria-label={t("searchLeads")}
            disabled={!result}
          />
        )}
        <LeadListTable>
          <TableHeader>
            <TableRow>
              {[
                "company",
                "industry",
                "website",
                "businessStatus",
                "googleStars",
                "auditQuality",
                "storageStatus",
                "leadDetails",
              ].map((key) => (
                <TableHead
                  key={key}
                  title={t(key)}
                >
                  <LeadColumnLabel column={key} label={t(key)} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item: place, group, audit }, index) => (
              <Fragment key={place.id}>
                {sorted &&
                  !areaSearch &&
                  (index === 0 || rows[index - 1].group !== group) && (
                    <LeadGroupHeading
                      group={group}
                      count={grouped.counts[group]}
                      columns={8}
                    />
                  )}
                <TableRow>
                  <TableCell>
                    <p className="wrap-anywhere font-medium">{place.name}</p>
                    {areaSearch &&
                      sorted &&
                      websiteOpportunityScore(audit) !== null && (
                        <Badge variant="outline" className="mt-1">
                          {t("rankedOpportunity")}
                        </Badge>
                      )}
                    {place.attributions.map((a, index) => (
                      <p
                        key={index}
                        className="mt-1 wrap-anywhere text-xs text-muted-foreground"
                      >
                        {a.uri ? (
                          <a
                            href={a.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {a.name}
                          </a>
                        ) : (
                          a.name
                        )}
                      </p>
                    ))}
                  </TableCell>
                  <TableCell>{place.category ?? (context?.industry && !isAreaSearch(context.industry) ? context.industry : t("notProvided"))}</TableCell>
                  <TableCell>
                    {place.website ? (
                      <Button
                        nativeButton={false}
                        variant="link"
                        size="sm"
                        title={t("openWebsite")}
                        aria-label={t("openWebsite")}
                        render={
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <span className="block truncate">{place.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span><ExternalLink aria-hidden="true" />
                      </Button>
                    ) : (
                      t("notProvided")
                    )}
                  </TableCell>
                  <TableCell><PlaceBusinessStatus place={place} /></TableCell>
                  <TableCell><PlaceGoogleRating place={place} /></TableCell>
                  <TableCell>
                    <AuditScore numberOnly audit={auditsByPlace.get(place.id)} />
                  </TableCell>
                  <TableCell>
                    <SaveLeadButton
                      searchId={searchId}
                      placeId={place.id}
                      savedId={savedByPlace.get(place.id)}
                      name={place.name}
                    />
                  </TableCell>
                  <TableCell>
                    <LeadDetailsDialog
                      compactTrigger
                      place={place}
                      audit={auditsByPlace.get(place.id)}
                      context={context}
                    />
                  </TableCell>
                </TableRow>
              </Fragment>
            ))}
            {pending &&
              Array.from(
                { length: Math.min(4, 10 - rows.length) },
                (_, row) => (
                  <TableRow key={`loading-${row}`}>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
                      <TableCell key={col} className="py-4">
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ),
              )}
            {!pending && shortlistRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-52 whitespace-normal text-center text-muted-foreground"
                >
                  {areaSearch && unrankedRows.length > 0
                    ? t("noRankedOpportunities")
                    : result || completedWithoutResults
                      ? t("noGoogleResults")
                      : t("startFromCampaign")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </LeadListTable>
        {shortlistRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("pagination", {
                from: offset + 1,
                to: Math.min(offset + 10, shortlistRows.length),
                total: shortlistRows.length,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + 10 >= shortlistRows.length}
                onClick={() => setPage(currentPage + 1)}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        )}
        {areaSearch && sorted && unrankedRows.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {t("unrankedCandidates", { count: unrankedRows.length })}
            </summary>
            <ul className="mt-2 space-y-2">
              {unrankedRows.map(({ item: place, audit }) => (
                <li
                  key={place.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                >
                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {place.name}
                  </a>
                  <span className="text-muted-foreground">
                    {auditsByPlace.get(place.id)?.errorCode
                      ? t(auditsByPlace.get(place.id)!.errorCode!)
                      : audit?.status === "NO_WEBSITE"
                        ? t("auditNoWebsite")
                        : t("unverifiedCandidate")}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <p role="status" className="sr-only">
          {pending
            ? t("searching")
            : t("leadCount", { count: shortlistRows.length })}
        </p>
      </CardContent>
    </Card>
  );
}
