import type { WebsiteReport } from "../website-quality";
import { calculateDeviceScore, normalizeWebsiteReport, QUALITY_WEIGHTS, TOPIC_LABELS } from "../website-rating";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";

export function pdfReportData(input: WebsiteReport, locale: "de" | "en") {
  const report = normalizeWebsiteReport(input);
  const t = (locale === "de" ? de : en).leadResearch;
  const score = (value: number | null) => value === null ? t.auditNotMeasured : `${value}/100`;
  const color = (value: number | null) => value === null ? "#64748b" : value >= 70 ? "#047857" : value >= 40 ? "#a16207" : "#be123c";
  const partLabels = Object.fromEntries(Object.entries(TOPIC_LABELS).map(([key, label]) => [key, t[label]]));
  return {
    ...report,
    title: t.auditReport,
    websiteLabel: new URL(report.url).hostname,
    designSourceLabel: locale === "de" ? "MOBIL / KI" : "MOBILE / AI",
    scoreLabel: score(report.qualityScore),
    scoreColor: color(report.qualityScore),
    navigation: [
      { id: "mobile", number: "01", label: t.auditMobileDevice }, { id: "desktop", number: "02", label: t.auditDesktopDevice },
      { id: "design", number: "03", label: t.auditDesign }, { id: "method", number: "04", label: t.auditMethod },
    ],
    designScoreLabel: score(report.parts.design),
    designScoreColor: color(report.parts.design),
    designStatusLabel: report.visual?.status === "completed" ? "" : t.auditVisualStatuses[report.visual?.status ?? "not_evaluated"],
    designCompleted: report.visual?.status === "completed",
    designFindings: report.visual?.findings ?? [],
    designCriteria: Object.entries(report.visual?.criteria ?? {}).map(([key, value]) => ({ key, label: t.auditVisualCriteria[key as keyof typeof t.auditVisualCriteria], value: score(value), color: color(value) })),
    checkedAtLabel: `${new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(report.checkedAt))} (Europe/Berlin)`,
    partsRows: Object.entries(report.parts).map(([key, value]) => ({ key, weight: QUALITY_WEIGHTS[key as keyof typeof QUALITY_WEIGHTS], label: partLabels[key as keyof typeof partLabels], value: score(value), color: color(value) })),
    labels: { contents: locale === "de" ? "In diesem Bericht" : "In this report", back: locale === "de" ? "Zur Übersicht" : "Back to overview", page: locale === "de" ? "Seite" : "Page", deviceScore: t.auditDeviceScore, design: t.auditDesign, designCriteria: t.auditDesignCriteria, recommendation: locale === "de" ? "Empfehlung" : "Recommendation", scope: locale === "de" ? "Umfang der Prüfung" : "Assessment scope", weighting: locale === "de" ? "Gewichtung" : "Weighting", quality: t.auditQuality, breakdown: t.auditBreakdown, metrics: locale === "de" ? "Ladezeit & Stabilität" : "Loading & stability", checks: t.auditChecksHeading, issues: t.auditIssues, noIssues: t.auditNoIssues, scale: t.auditScale, method: t.auditMethod, formula: t.auditFormula, limitations: t.auditLimitations },
    devices: (["mobile", "desktop"] as const).map(key => {
      const data = report[key];
      return {
        key, title: key === "mobile" ? t.auditMobile : t.auditDesktop,
        number: key === "mobile" ? "01" : "02",
        scoreLabel: score(calculateDeviceScore(data)), scoreColor: color(calculateDeviceScore(data)),
        provider: `PageSpeed Insights / Lighthouse ${data.lighthouseVersion ?? "-"}`,
        scores: (["performance", "seo", "accessibility", "bestPractices"] as const).map(topic => ({ key: topic, label: t[TOPIC_LABELS[topic]], value: score(data[topic]), color: color(data[topic]) })),
        metrics: Object.entries(data.metrics).map(([key, value]) => ({ key, label: t.auditMetrics[key as keyof typeof t.auditMetrics], value: value === null ? t.auditNotMeasured : `${new Intl.NumberFormat(locale, { maximumFractionDigits: key === "cls" ? 3 : 0 }).format(value)}${key === "cls" ? "" : " ms"}` })),
        checks: [...data.checks.map(check => ({ key: check.id, label: t.auditChecks[check.id as keyof typeof t.auditChecks] ?? check.id, value: check.passed === null ? t.auditNotMeasured : check.passed ? t.auditPassed : t.auditFailed })), { key: "https", label: "HTTPS", value: data.https ? t.yes : t.no }],
        issues: data.issues.map(issue => ({ ...issue, title: t.auditSimpleIssues[issue.id as keyof typeof t.auditSimpleIssues] ?? issue.title, description: issue.description.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") })),
        warnings: data.warnings,
      };
    }),
  };
}

export const sampleWebsiteReport: WebsiteReport = {
  version: 2, url: "https://example.com/", checkedAt: "2026-10-21T09:00:00Z", qualityScore: 75,
  parts: { performance: 54, design: 73, seo: 92, accessibility: 81, bestPractices: 100 },
  visual: { status: "completed", score: 73, model: "Demo", criteria: { hierarchy: 70, readability: 80, consistency: 72, mobileLayout: 70 }, findings: [{ observation: "Die wichtigste Aktion geht im Kopfbereich unter.", recommendation: "Die Kontakt-Schaltfläche deutlicher hervorheben." }] },
  mobile: { performance: 54, seo: 92, accessibility: 81, bestPractices: 100, https: true, metrics: { lcpMs: 3800, fcpMs: 1900, tbtMs: 320, cls: 0.128 }, checks: [{ id: "viewport", passed: true }, { id: "meta-description", passed: false }], issues: [{ id: "render-blocking", title: "Render-blocking resources", description: "Some resources delay the first page render. Defer non-essential scripts and stylesheets to show the main content earlier.", value: "1,200 ms" }], warnings: [], lighthouseVersion: "13" },
  desktop: { performance: 94, seo: 92, accessibility: 81, bestPractices: 100, https: true, metrics: { lcpMs: 1200, fcpMs: 800, tbtMs: 40, cls: 0.015 }, checks: [{ id: "document-title", passed: true }, { id: "is-crawlable", passed: null }], issues: [], warnings: [], lighthouseVersion: "13" },
};
