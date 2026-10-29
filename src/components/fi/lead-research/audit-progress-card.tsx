"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Tooltip } from "@base-ui/react/tooltip";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
  LoaderCircle,
  Pause,
  Square,
} from "lucide-react";
import { AuditBatchControls } from "./audit-batch-controls";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import {
  formatRemainingTime,
  getAuditProgress,
  type AuditPotential,
} from "@/lib/lead-research/audit-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function AuditProgressCard({
  audits,
  searching,
  onSelectPotential,
  selectedPotential,
}: {
  audits: AuditSummary[];
  searching: boolean;
  onSelectPotential?: (potential: AuditPotential, auditIds: string[]) => void;
  selectedPotential?: AuditPotential;
}) {
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
  const Icon = active
    ? LoaderCircle
    : progress?.paused
      ? Pause
      : progress?.cancelled
        ? Square
        : CheckCircle2;
  const percentage = searching ? null : progress!.percentage;
  const finished = !searching && progress!.done === progress!.total;
  const remaining =
    searching || progress?.remainingSeconds == null
      ? null
      : formatRemainingTime(progress.remainingSeconds);
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icon
                className={`size-4 text-primary ${active ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden="true"
              />
              {t(
                searching
                  ? "auditFindingCompanies"
                  : progress?.paused
                    ? "auditProgressPaused"
                    : active
                      ? "auditProgressTitle"
                      : progress?.cancelled
                        ? "auditProgressCancelled"
                        : "auditProgressComplete",
              )}
            </h2>
            <Tooltip.Provider delay={200}>
              <Tooltip.Root>
                <Tooltip.Trigger type="button" className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t("auditCrossCampaign")}<Info className="size-3" aria-hidden="true" />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={6} className="z-[100]">
                    <Tooltip.Popup className="max-w-72 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">{t("auditProgressScope")}</Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            {!searching && (
              <p className="text-sm text-muted-foreground">
                {t("auditCompletedCount", {
                  done: progress!.done,
                  total: progress!.total,
                })}
              </p>
            )}
            {!searching && progress!.failed > 0 && (
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {t("auditFailureCount", { count: progress!.failed })}
              </p>
            )}
            {!searching && progress!.failedAudits.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-red-700 underline underline-offset-4 dark:text-red-300">
                  {t("auditFailureDetails", {
                    count: progress!.failedAudits.length,
                  })}
                </summary>
                <ul className="mt-2 space-y-2">
                  {progress!.failedAudits.map((audit) => (
                    <li
                      key={audit.id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                    >
                      <span className="text-red-700 dark:text-red-300">
                        {t(audit.errorCode ?? "auditUnavailable")}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(audit.placeId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline"
                      >
                        {t("auditViewPlace")}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          {finished ? <dl aria-label={t("auditPotentialDistribution")} className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {(["highPotential", "mediumPotential", "lowPotential", "unrated"] as const).map(key => <div key={key} className="relative rounded-lg p-2 transition-colors hover:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring">
              <dt className="text-xs text-muted-foreground">{t(key)}</dt>
              <dd><button type="button" disabled={!onSelectPotential || progress!.potential[key] === 0} aria-label={t("showPotentialLeads", { potential: t(key), count: progress!.potential[key] })} aria-pressed={selectedPotential === key} onClick={() => onSelectPotential?.(key, progress!.auditIds)} className={`text-2xl font-semibold tabular-nums outline-none after:absolute after:inset-0 disabled:cursor-default disabled:opacity-50 ${key === "highPotential" ? "text-emerald-700 dark:text-emerald-400" : key === "mediumPotential" ? "text-amber-800 dark:text-amber-300" : "text-foreground"}`}>{progress!.potential[key]}</button></dd>
            </div>)}
          </dl> : <div className="flex items-start gap-5 sm:gap-8">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("auditProgressPercent")}
              </p>
              <p className="flex h-8 items-center text-2xl font-semibold leading-none tabular-nums lining-nums">
                {percentage === null ? "—" : `${percentage} %`}
              </p>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-1 gap-y-1">
              <Clock3
                className="size-3 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-xs text-muted-foreground">
                {t("auditTimeRemaining")}
              </p>
              <p className="col-start-2 flex h-8 min-w-[7ch] items-center whitespace-nowrap text-2xl font-semibold leading-none tabular-nums lining-nums">
                {remaining === null ? "—:—" : remaining}
              </p>
            </div>
          </div>}
        </div>
        <Progress value={percentage} aria-label={t("auditProgressPercent")} />
        <AuditBatchControls audits={audits} />
      </CardContent>
    </Card>
  );
}
