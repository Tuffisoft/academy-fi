import type { AuditSummary } from "./audit-types";
import { validScore } from "./website-rating";
import { NEED_GROUPS, websiteNeed, compareWebsiteNeed, type WebsiteNeed } from "./lead-assessment";

export const LEAD_GROUPS = NEED_GROUPS;
export type LeadGroup = WebsiteNeed;
type GroupAudit = Pick<AuditSummary, "status" | "qualityScore">;
export function leadGroup(audit?: GroupAudit): LeadGroup { return websiteNeed(audit).need; }
export function websiteOpportunityScore(audit?: GroupAudit): number | null {
  return audit?.status === "COMPLETED" ? validScore(audit.qualityScore) : null;
}
export function isRankableLead(audit?: GroupAudit) {
  return audit?.status === "NO_WEBSITE" || websiteOpportunityScore(audit) !== null;
}
export function prepareLeadRows<T>(items: readonly T[], auditFor: (item: T) => GroupAudit | undefined, _sorted = true) {
  void _sorted; // Retained for callers; grouping is now always live.
  const rows = items.map(item => { const audit = auditFor(item); return { item, audit, group: leadGroup(audit) }; });
  const counts: Record<LeadGroup, number> = { highPotential: 0, openPotential: 0, mediumPotential: 0, lowPotential: 0, pendingPotential: 0 };
  for (const row of rows) counts[row.group]++;
  rows.sort((a, b) => compareWebsiteNeed(a.audit, b.audit));
  return { rows, counts };
}
export const prepareAreaLeadRows = prepareLeadRows;
