import type { AuditSummary } from "./audit-types";
import { validScore } from "./website-rating";

export const LEAD_GROUPS = [
  "newWebsite",
  "manualReview",
  "rated",
  "pending",
] as const;
export type LeadGroup = (typeof LEAD_GROUPS)[number];
type GroupAudit = Pick<AuditSummary, "status" | "qualityScore">;
type AreaAudit = GroupAudit &
  Partial<Pick<AuditSummary, "parts" | "errorCode">>;

export function leadGroup(audit?: GroupAudit): LeadGroup {
  if (audit?.status === "NO_WEBSITE") return "newWebsite";
  if (audit?.status === "FAILED" || audit?.status === "INACTIVE" || audit?.status === "LOW_RATING") return "manualReview";
  if (audit?.status === "COMPLETED")
    return validScore(audit.qualityScore) === null ? "manualReview" : "rated";
  return "pending";
}

export function websiteOpportunityScore(audit?: AreaAudit): number | null {
  if (audit?.status !== "COMPLETED") return null;
  const score = validScore(audit.qualityScore);
  if (score !== null) return score;
  const technicalScores = [
    audit.parts?.performance,
    audit.parts?.seo,
    audit.parts?.accessibility,
    audit.parts?.bestPractices,
  ].map(validScore);
  if (technicalScores.some((value) => value === null)) return null;
  return Math.round(
    technicalScores.reduce<number>((sum, value) => sum + value!, 0) /
      technicalScores.length,
  );
}

export function prepareAreaLeadRows<T>(
  items: readonly T[],
  auditFor: (item: T) => AreaAudit | undefined,
  sorted: boolean,
) {
  const rows = items.map((item) => {
    const audit = auditFor(item);
    return { item, audit, group: leadGroup(audit) };
  });
  const counts: Record<LeadGroup, number> = {
    newWebsite: 0,
    manualReview: 0,
    rated: 0,
    pending: 0,
  };
  for (const row of rows) counts[row.group]++;
  if (sorted)
    rows.sort((a, b) => {
      const first = websiteOpportunityScore(a.audit);
      const second = websiteOpportunityScore(b.audit);
      if (first !== null && second !== null) return first - second;
      if (first !== null) return -1;
      if (second !== null) return 1;
      return LEAD_GROUPS.indexOf(a.group) - LEAD_GROUPS.indexOf(b.group);
    });
  return { rows, counts };
}

// Sort before pagination; a stable sort preserves the incoming order for ties.
export function prepareLeadRows<T>(
  items: readonly T[],
  auditFor: (item: T) => GroupAudit | undefined,
  sorted: boolean,
) {
  const rows = items.map((item) => {
    const audit = auditFor(item);
    return { item, audit, group: leadGroup(audit) };
  });
  const counts: Record<LeadGroup, number> = {
    newWebsite: 0,
    manualReview: 0,
    rated: 0,
    pending: 0,
  };
  for (const row of rows) counts[row.group]++;
  if (sorted)
    rows.sort(
      (a, b) =>
        LEAD_GROUPS.indexOf(a.group) - LEAD_GROUPS.indexOf(b.group) ||
        (a.group === "rated"
          ? a.audit!.qualityScore! - b.audit!.qualityScore!
          : 0),
    );
  return { rows, counts };
}
