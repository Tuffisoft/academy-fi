"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock3, LoaderCircle, Pause, Square } from "lucide-react";
import { AuditBatchControls } from "./audit-batch-controls";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { formatRemainingTime, getAuditProgress } from "@/lib/lead-research/audit-progress";
import { MAX_PARALLEL_WEBSITE_AUDITS } from "@/lib/lead-research/audit-scheduling";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AuditProgressCard({ audits, searching }: { audits: AuditSummary[]; searching: boolean }) {
  const t = useTranslations("leadResearch");
  const [now, setNow] = useState<number | null>(null);
  const progress = getAuditProgress(audits, now);
  const active = searching || Boolean(progress?.active);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  if (!searching && !progress) return null;
  const Icon = active ? LoaderCircle : progress?.paused ? Pause : progress?.cancelled ? Square : CheckCircle2;
  const percentage = searching ? null : progress!.percentage;
  const remaining = searching || progress?.remainingSeconds == null ? null : formatRemainingTime(progress.remainingSeconds);
  return <Card className="border-primary/20 bg-primary/5">
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-semibold"><Icon className={`size-4 text-primary ${active ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />{t(searching ? "auditFindingCompanies" : progress?.paused ? "auditProgressPaused" : active ? "auditProgressTitle" : progress?.cancelled ? "auditProgressCancelled" : "auditProgressComplete")}</h2>
          {!searching && <p className="text-sm text-muted-foreground">{t("auditCompletedCount", { done: progress!.done, total: progress!.total })}</p>}
          {!searching && progress!.failed > 0 && <p className="text-xs text-destructive">{t("auditFailureCount", { count: progress!.failed })}</p>}
        </div>
        <div className="flex items-start gap-5 sm:gap-8">
          <div className="space-y-1"><p className="text-xs text-muted-foreground">{t("auditProgressPercent")}</p><p className="text-2xl font-semibold tabular-nums">{percentage === null ? "—" : `${percentage} %`}</p></div>
          <div className="space-y-1"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" aria-hidden="true" />{t("auditTimeRemaining")}</p><p className="text-2xl font-semibold tabular-nums">{remaining === null ? "—:—" : remaining}</p><p className="text-xs text-muted-foreground">{t("auditMinutesSeconds")}</p></div>
        </div>
      </div>
      <Progress value={percentage} aria-label={t("auditProgressPercent")} />
      <Badge variant="outline">{t("auditParallelCount", { count: MAX_PARALLEL_WEBSITE_AUDITS })}</Badge>
      <AuditBatchControls audits={audits} />
    </CardContent>
  </Card>;
}
