import type { WebsiteReport } from "../website-quality";
import { normalizeWebsiteReport, TOPIC_LABELS } from "../website-rating";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";

export function pdfReportData(input: WebsiteReport, locale: "de" | "en") {
  const report = normalizeWebsiteReport(input);
  const t = (locale === "de" ? de : en).leadResearch;
  const score = (value: number | null) => value === null ? t.auditNotMeasured : `${value}/100`;
  const partLabels = Object.fromEntries(Object.entries(TOPIC_LABELS).map(([key, label]) => [key, t[label]]));
  return {
    ...report,
    title: t.auditReport,
    scoreLabel: score(report.qualityScore),
    checkedAtLabel: `${new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(report.checkedAt))} (Europe/Berlin)`,
    partsRows: Object.entries(report.parts).map(([key, value]) => ({ key, label: partLabels[key as keyof typeof partLabels], value: score(value) })),
    labels: { quality: t.auditQuality, breakdown: t.auditBreakdown, metrics: locale === "de" ? "Ladezeit & Stabilität" : "Loading & stability", checks: t.auditChecksHeading, issues: t.auditIssues, noIssues: t.auditNoIssues, scale: t.auditScale, method: t.auditMethod, formula: t.auditFormula, limitations: t.auditLimitations },
    devices: (["mobile", "desktop"] as const).map(key => {
      const data = report[key];
      return {
        key, title: key === "mobile" ? t.auditMobile : t.auditDesktop,
        provider: `PageSpeed Insights / Lighthouse ${data.lighthouseVersion ?? "-"}`,
        scores: [{ key: "performance", label: locale === "de" ? "Ladeleistung" : "Performance", value: score(data.performance) }, { key: "seo", label: "SEO", value: score(data.seo) }, { key: "accessibility", label: locale === "de" ? "Barrierefreiheit" : "Accessibility", value: score(data.accessibility) }, { key: "bestPractices", label: "Best Practices", value: score(data.bestPractices) }],
        metrics: Object.entries(data.metrics).map(([key, value]) => ({ key, label: t.auditMetrics[key as keyof typeof t.auditMetrics], value: value === null ? t.auditNotMeasured : `${new Intl.NumberFormat(locale, { maximumFractionDigits: key === "cls" ? 3 : 0 }).format(value)}${key === "cls" ? "" : " ms"}` })),
        checks: [...data.checks.map(check => ({ key: check.id, label: t.auditChecks[check.id as keyof typeof t.auditChecks] ?? check.id, value: check.passed === null ? t.auditNotMeasured : check.passed ? t.auditPassed : t.auditFailed })), { key: "https", label: "HTTPS", value: data.https ? t.yes : t.no }],
        issues: data.issues.map(issue => ({ ...issue, description: issue.description.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") })),
        warnings: data.warnings,
      };
    }),
  };
}

export const sampleWebsiteReport: WebsiteReport = {
  version: 2, url: "https://example.com/", checkedAt: "2026-10-21T09:00:00Z", qualityScore: 80,
  parts: { performance: 54, design: 73, seo: 92, accessibility: 81, bestPractices: 100 },
  visual: { status: "completed", score: 73, model: "Demo", criteria: { hierarchy: 70, readability: 80, consistency: 72, mobileLayout: 70 }, findings: [{ observation: "Die wichtigste Aktion geht im Kopfbereich unter.", recommendation: "Die Kontakt-Schaltfläche deutlicher hervorheben." }] },
  mobile: { performance: 54, seo: 92, accessibility: 81, bestPractices: 100, https: true, metrics: { lcpMs: 3800, fcpMs: 1900, tbtMs: 320, cls: 0.128 }, checks: [{ id: "viewport", passed: true }, { id: "meta-description", passed: false }], issues: [{ id: "render-blocking", title: "Render-blocking resources", description: "Some resources delay the first page render. Defer non-essential scripts and stylesheets to show the main content earlier.", value: "1,200 ms" }], warnings: [], lighthouseVersion: "13" },
  desktop: { performance: 94, seo: 92, accessibility: 81, bestPractices: 100, https: true, metrics: { lcpMs: 1200, fcpMs: 800, tbtMs: 40, cls: 0.015 }, checks: [{ id: "document-title", passed: true }, { id: "is-crawlable", passed: null }], issues: [], warnings: [], lighthouseVersion: "13" },
};
