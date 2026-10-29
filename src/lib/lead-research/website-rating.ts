import type { WebsiteReport } from "./website-quality";

export const QUALITY_WEIGHTS = { performance: 30, seo: 10, accessibility: 10, bestPractices: 20, design: 30 } as const;
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
  // Missing AI design must not discard successful PageSpeed measurements.
  const topics: QualityTopic[] = validScore(parts.design) === null
    ? [...DEVICE_TOPICS]
    : Object.keys(QUALITY_WEIGHTS) as QualityTopic[];
  if (topics.some(key => validScore(parts[key]) === null)) return null;
  const totalWeight = topics.reduce((sum, key) => sum + QUALITY_WEIGHTS[key], 0);
  return Math.round(topics.reduce((sum, key) => sum + parts[key]! * QUALITY_WEIGHTS[key], 0) / totalWeight);
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
