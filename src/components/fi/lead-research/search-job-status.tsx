"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { isAreaSearch } from "@/lib/lead-research/search-input";
import {
  cancelLeadSearchAction,
  pauseLeadSearchAction,
  resumeLeadSearchAction,
} from "@/lib/actions/lead-searches.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SearchJobStatus({ search }: { search: LeadSearchSummary }) {
  const t = useTranslations("leadResearch");
  const industry = isAreaSearch(search.industry)
    ? t("areaSearch")
    : search.industry;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const active = search.status === "QUEUED" || search.status === "RUNNING";
  const paused = search.status === "PAUSED";
  function control(action: typeof cancelLeadSearchAction) {
    setError(false);
    startTransition(async () => {
      try {
        const result = await action(search.id);
        setError(!result.success);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="wrap-anywhere">
          {industry} · {search.location}
        </CardTitle>
        <CardDescription>
          {search.pauseRequested
            ? t("jobPausing")
            : active
              ? t(
                  search.phase === "LOCATING"
                    ? "jobLocating"
                    : search.phase === "SEARCHING"
                      ? "jobSearching"
                      : "jobQueued",
                )
              : t(`statuses.${search.status}`)}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{t(`statuses.${search.status}`)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {search.status === "DRAFT" ? <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {[
            [t("location"), search.location],
            [t("industry"), industry],
            [t("radius"), t("radiusValue", { value: search.radiusKm })],
            [t(isAreaSearch(search.industry) ? "topResults" : "maxResults"), String(search.maxResults)],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="wrap-anywhere font-medium">{value}</dd></div>)}
        </dl> : <p role="status" className="text-sm">
          {t("jobProgress", {
            pages: search.processedPages,
            count: search.resultCount,
          })}
        </p>}
        {search.errorCode && (
          <p role="alert" className="text-sm text-destructive">
            {t(search.errorCode)}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t("jobControlError")}
          </p>
        )}
        {(active || paused) && (
          <div className="flex flex-wrap gap-2" aria-busy={pending}>
            {active && (
              <Button
                variant="outline"
                disabled={pending || search.pauseRequested}
                onClick={() => control(pauseLeadSearchAction)}
              >
                <Pause aria-hidden="true" />
                {t(search.pauseRequested ? "jobPausing" : "jobPause")}
              </Button>
            )}
            {paused && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => control(resumeLeadSearchAction)}
              >
                <Play aria-hidden="true" />
                {t("jobResume")}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => control(cancelLeadSearchAction)}
            >
              <Square aria-hidden="true" />
              {t("jobCancel")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
