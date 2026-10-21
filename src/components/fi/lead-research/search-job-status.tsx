"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { cancelLeadSearchAction, pauseLeadSearchAction, resumeLeadSearchAction } from "@/lib/actions/lead-searches.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SearchJobStatus({ search }: { search: LeadSearchSummary }) {
  const t = useTranslations("leadResearch");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const active = search.status === "QUEUED" || search.status === "RUNNING";
  const paused = search.status === "PAUSED";
  function control(action: typeof cancelLeadSearchAction) {
    setError(false);
    startTransition(async () => {
      try { const result = await action(search.id); setError(!result.success); router.refresh(); }
      catch { setError(true); }
    });
  }
  return <Card>
    <CardHeader>
      <CardTitle className="wrap-anywhere">{search.industry} · {search.location}</CardTitle>
      <CardDescription>{search.pauseRequested ? t("jobPausing") : active ? t(search.phase === "LOCATING" ? "jobLocating" : search.phase === "SEARCHING" ? "jobSearching" : "jobQueued") : t(`statuses.${search.status}`)}</CardDescription>
      <CardAction><Badge variant="secondary">{t(`statuses.${search.status}`)}</Badge></CardAction>
    </CardHeader>
    <CardContent className="space-y-3">
      <p role="status" className="text-sm">{t("jobProgress", { pages: search.processedPages, count: search.resultCount })}</p>
      {active && <p className="text-xs text-muted-foreground">{t("jobCanLeave")}</p>}
      {search.errorCode && <p role="alert" className="text-sm text-destructive">{t(search.errorCode)}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{t("jobControlError")}</p>}
      {(active || paused) && <div className="flex flex-wrap gap-2" aria-busy={pending}>
        {active && <Button variant="outline" disabled={pending || search.pauseRequested} onClick={() => control(pauseLeadSearchAction)}><Pause aria-hidden="true" />{t(search.pauseRequested ? "jobPausing" : "jobPause")}</Button>}
        {paused && <Button variant="outline" disabled={pending} onClick={() => control(resumeLeadSearchAction)}><Play aria-hidden="true" />{t("jobResume")}</Button>}
        <Button variant="outline" disabled={pending} onClick={() => control(cancelLeadSearchAction)}><Square aria-hidden="true" />{t("jobCancel")}</Button>
      </div>}
      {(active || paused) && <p className="text-xs text-muted-foreground">{t(paused ? "jobPausedHint" : "jobPauseHint")}</p>}
    </CardContent>
  </Card>;
}
