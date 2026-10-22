import type { AuditSummary } from "./audit-types";
import { validScore } from "./website-rating";

export const LEAD_GROUPS = ["newWebsite", "manualReview", "rated", "pending"] as const;
export type LeadGroup = typeof LEAD_GROUPS[number];
type GroupAudit = Pick<AuditSummary, "status" | "qualityScore">;

export function leadGroup(audit?: GroupAudit): LeadGroup {
  if (audit?.status === "NO_WEBSITE") return "newWebsite";
  if (audit?.status === "FAILED") return "manualReview";
  if (audit?.status === "COMPLETED") return validScore(audit.qualityScore) === null ? "manualReview" : "rated";
  return "pending";
}

// Sort before pagination; a stable sort preserves the incoming order for ties.
export function prepareLeadRows<T>(items: readonly T[], auditFor: (item: T) => GroupAudit | undefined, sorted: boolean) {
  const rows = items.map(item => {
    const audit = auditFor(item);
    return { item, audit, group: leadGroup(audit) };
  });
  const counts: Record<LeadGroup, number> = { newWebsite: 0, manualReview: 0, rated: 0, pending: 0 };
  for (const row of rows) counts[row.group]++;
  if (sorted) rows.sort((a, b) => LEAD_GROUPS.indexOf(a.group) - LEAD_GROUPS.indexOf(b.group)
    || (a.group === "rated" ? a.audit!.qualityScore! - b.audit!.qualityScore! : 0));
  return { rows, counts };
}
