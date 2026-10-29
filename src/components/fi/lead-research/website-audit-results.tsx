"use client";

import { useTranslations, useFormatter } from "next-intl";
import type { WebsiteReport } from "@/lib/lead-research/website-quality";
import { calculateDeviceScore, DEVICE_TOPICS, normalizeWebsiteReport, TOPIC_LABELS } from "@/lib/lead-research/website-rating";
import { Monitor, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { qualityStyles, qualityTone } from "./quality-presentation";

export function TopicScore({ value }: { value: number | null }) {
  const t = useTranslations("leadResearch");
  const tone = qualityTone(value);
  return <Badge variant="outline" className={`gap-2 tabular-nums ${qualityStyles[tone].badge}`}>
    <span aria-hidden="true" className="size-2 rounded-full bg-current" />
    <span>{value === null ? "—" : `${value}/100`}</span><span className="sr-only">{t(`auditRating.${tone}`)}</span>
  </Badge>;
}

export function WebsiteAuditOverview({ report: input }: { report: WebsiteReport }) {
  const t = useTranslations("leadResearch");
  const report = normalizeWebsiteReport(input);
  return <section aria-label={t("auditBreakdown")} className="space-y-5">
    {report.parts.design === null && report.qualityScore !== null && <p className="text-sm text-muted-foreground">{t("auditPageSpeedOnly")}</p>}
    <div className="grid gap-5 md:grid-cols-2">{(["mobile", "desktop"] as const).map(device => {
      const data = report[device];
      const value = calculateDeviceScore(data);
      const tone = qualityTone(value);
      const Icon = device === "mobile" ? Smartphone : Monitor;
      return <article key={device} className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3"><Icon className="size-5 text-muted-foreground" aria-hidden="true" /><h2 className="text-lg font-semibold">{t(device === "mobile" ? "auditMobileDevice" : "auditDesktopDevice")}</h2></div>
        <div className="my-6 flex flex-wrap items-end justify-between gap-3">
          <div><p className="mb-2 text-xs text-muted-foreground">{t("auditDeviceScore")}</p><p className={`text-4xl font-semibold tabular-nums tracking-tight ${qualityStyles[tone].text}`}>{value ?? "—"}<span className="ml-1 text-base font-normal text-muted-foreground">/100</span></p></div>
          <Badge variant="outline" className={qualityStyles[tone].badge}>{t(`auditRating.${tone}`)}</Badge>
        </div>
        <dl className="space-y-4 border-t pt-5">{DEVICE_TOPICS.map(topic => <div key={topic} className="flex flex-wrap items-center justify-between gap-3"><dt className="text-sm">{t(TOPIC_LABELS[topic])}</dt><dd><TopicScore value={data[topic]} /></dd></div>)}</dl>
      </article>;
    })}</div>
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div><h2 className="font-semibold">{t("auditDesign")}</h2></div>
      <TopicScore value={report.parts.design} />
      {report.visual?.status !== "completed" && <p className="w-full text-sm text-muted-foreground">{t(`auditVisualStatuses.${report.visual?.status ?? "not_evaluated"}`)}</p>}
    </article>
  </section>;
}

export function WebsiteAuditResults({ report: input }: { report: WebsiteReport }) {
  const t = useTranslations("leadResearch");
  const format = useFormatter();
  const report = normalizeWebsiteReport(input);
  const issueTitle = (issue: WebsiteReport["mobile"]["issues"][number]) => t.has(`auditSimpleIssues.${issue.id}`) ? t(`auditSimpleIssues.${issue.id}`) : issue.title;
  const rawIssues = (issues: WebsiteReport["mobile"]["issues"]) => <ul className="space-y-3">{issues.map(issue => <li key={issue.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{issueTitle(issue)}{issue.value && <span className="ml-2 text-muted-foreground">{issue.value}</span>}</p></li>)}</ul>;
  const deviceDetails = (device: "mobile" | "desktop") => {
    const data = report[device];
    return <div className="mt-4 space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(data.metrics).map(([metric, value]) => <div key={metric}><dt className="text-xs text-muted-foreground">{t(`auditMetrics.${metric}`)}</dt><dd className="font-medium tabular-nums">{value === null ? "—" : `${format.number(value, { maximumFractionDigits: metric === "cls" ? 3 : 0 })}${metric === "cls" ? "" : " ms"}`}</dd></div>)}</dl>
      <dl className="grid gap-2 sm:grid-cols-2">{data.checks.map(check => <div key={check.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm"><dt>{t(`auditChecks.${check.id}`)}</dt><dd className={qualityStyles[check.passed === null ? "unknown" : check.passed ? "good" : "poor"].text}>{t(check.passed === null ? "auditNotMeasured" : check.passed ? "auditPassed" : "auditFailed")}</dd></div>)}</dl>
      {DEVICE_TOPICS.map(topic => {
        const issues = data.issues.filter(issue => issue.categories?.includes(topic));
        return issues.length ? <div key={topic} className="space-y-3"><h3 className="font-medium">{t(TOPIC_LABELS[topic])}</h3>{rawIssues(issues)}</div> : null;
      })}
      {rawIssues(data.issues.filter(issue => !issue.categories?.length))}
      {data.warnings.map((warning, index) => <p key={index} className="text-sm text-muted-foreground">{warning}</p>)}
      <p className="text-xs text-muted-foreground">PageSpeed Insights · Lighthouse {data.lighthouseVersion ?? "—"}</p>
    </div>;
  };
  return <section className="space-y-4" aria-label={t("auditReport")}>
    <details className="rounded-2xl border p-5 sm:p-6"><summary className="cursor-pointer font-medium">{t("auditTechnicalDetails")}</summary>{deviceDetails("mobile")}</details>
    <details className="rounded-2xl border p-5 sm:p-6"><summary className="cursor-pointer font-medium">{t("auditDesktopDetails")}</summary>{deviceDetails("desktop")}</details>
    <details className="rounded-2xl border p-5 sm:p-6"><summary className="cursor-pointer font-medium">{t("auditDesignDetails")}</summary><div className="mt-5 space-y-4">
          {report.visual?.status !== "completed" && <p className="mt-3 text-sm">{t(`auditVisualStatuses.${report.visual?.status ?? "not_evaluated"}`)}</p>}
          {report.visual?.findings?.length ? <ul className="mt-3 space-y-3 text-sm">{report.visual.findings.map((finding, index) => <li key={index}><p className="font-medium">{finding.observation}</p><p className="text-muted-foreground">{finding.recommendation}</p></li>)}</ul> : null}
          {report.visual?.criteria && <><h3 className="text-sm font-medium">{t("auditDesignCriteria")}</h3><dl className="space-y-3">{Object.entries(report.visual.criteria).map(([key, score]) => <div key={key} className="flex flex-wrap items-center justify-between gap-3 text-sm"><dt>{t(`auditVisualCriteria.${key}`)}</dt><dd><TopicScore value={score} /></dd></div>)}</dl><p className="text-xs text-muted-foreground">{report.visual.model}</p></>}
    </div></details>
  </section>;
}
