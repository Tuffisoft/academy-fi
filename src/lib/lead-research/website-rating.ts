import type { WebsiteReport } from "./website-quality";

export const QUALITY_WEIGHTS = { performance: 20, seo: 20, accessibility: 20, bestPractices: 20, design: 20 } as const;
export type QualityTopic = keyof typeof QUALITY_WEIGHTS;
export type QualityParts = Record<QualityTopic, number | null>;
export const TOPIC_LABELS = { performance: "auditLoadSpeed", seo: "auditSeo", accessibility: "auditAccessibility", bestPractices: "auditTechnology", design: "auditDesign" } as const;
export const validScore = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;

export const DEVICE_TOPICS = ["performance", "seo", "accessibility", "bestPractices"] as const;
export function calculateDeviceScore(device: Pick<WebsiteReport["mobile"], typeof DEVICE_TOPICS[number]>): number | null {
  const values = DEVICE_TOPICS.map(key => validScore(device[key]));
  return values.some(value => value === null) ? null : Math.round(values.reduce<number>((sum, value) => sum + value!, 0) / values.length);
}

export function calculateQuality(parts: QualityParts): number | null {
  const values = Object.keys(QUALITY_WEIGHTS).map(key => validScore(parts[key as QualityTopic]));
  return values.some(value => value === null) ? null : Math.round(values.reduce<number>((sum, value) => sum + value!, 0) / 5);
}

// Legacy reports keep their measurements, but never keep the old weighting.
export function normalizeWebsiteReport(report: WebsiteReport): WebsiteReport & { parts: QualityParts } {
  const parts: QualityParts = {
    performance: validScore(report.mobile.performance), seo: validScore(report.mobile.seo),
    accessibility: validScore(report.mobile.accessibility), bestPractices: validScore(report.mobile.bestPractices),
    design: report.visual?.status === "completed" ? validScore(report.visual.score) : null,
  };
  return { ...report, version: 2, parts, qualityScore: calculateQuality(parts) };
}
