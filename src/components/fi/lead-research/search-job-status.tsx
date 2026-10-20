"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { cancelLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SearchJobStatus({ search }: { search: LeadSearchSummary }) {
  const t = useTranslations("leadResearch");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const active = search.status === "QUEUED" || search.status === "RUNNING";
  return <Card>
    <CardHeader>
      <CardTitle className="wrap-anywhere">{search.industry} · {search.location}</CardTitle>
      <CardDescription>{active ? t(search.phase === "LOCATING" ? "jobLocating" : search.phase === "SEARCHING" ? "jobSearching" : "jobQueued") : t(`statuses.${search.status}`)}</CardDescription>
      <CardAction><Badge variant="secondary">{t(`statuses.${search.status}`)}</Badge></CardAction>
    </CardHeader>
    <CardContent className="space-y-3">
      <p role="status" className="text-sm">{t("jobProgress", { pages: search.processedPages, count: search.resultCount })}</p>
      {active && <p className="text-xs text-muted-foreground">{t("jobCanLeave")}</p>}
      {search.errorCode && <p role="alert" className="text-sm text-destructive">{t(search.errorCode)}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{t("jobCancelError")}</p>}
      {active && <Button variant="outline" disabled={pending} onClick={() => {
        setError(false);
        startTransition(async () => {
          try { const result = await cancelLeadSearchAction(search.id); setError(!result.success); } catch { setError(true); }
        });
      }}>{t(pending ? "jobCancelling" : "jobCancel")}</Button>}
      {active && <p className="text-xs text-muted-foreground">{t("jobCancelHint")}</p>}
    </CardContent>
  </Card>;
}
