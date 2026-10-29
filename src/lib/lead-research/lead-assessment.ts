import type { AuditSummary } from "./audit-types";
import type { PlaceSignals } from "./place-signals";
import { validScore } from "./website-rating";

export const NEED_GROUPS = ["highPotential", "openPotential", "mediumPotential", "lowPotential", "pendingPotential"] as const;
export type WebsiteNeed = typeof NEED_GROUPS[number];
export type AssessmentAudit = Pick<AuditSummary, "status" | "qualityScore">;
export type ContactPriority = "first" | "next" | "review" | "defer";

export function websiteNeed(audit?: AssessmentAudit): { need: WebsiteNeed; reason: string } {
  if (audit?.status === "NO_WEBSITE") return { need: "highPotential", reason: "noWebsite" };
  if (!audit || ["NOT_STARTED", "QUEUED", "RUNNING", "PAUSED"].includes(audit.status)) {
    return { need: "pendingPotential", reason: audit?.status === "RUNNING" ? "running" : audit?.status === "PAUSED" ? "paused" : "waiting" };
  }
  const score = validScore(audit.qualityScore);
  if (audit.status === "COMPLETED" && score !== null) {
    return score < 60 ? { need: "highPotential", reason: "poorWebsite" }
      : score < 80 ? { need: "mediumPotential", reason: "averageWebsite" }
      : { need: "lowPotential", reason: "goodWebsite" };
  }
  const reason = audit.status === "FAILED" ? "failed" : audit.status === "CANCELLED" ? "cancelled" : audit.status === "LOW_RATING" ? "legacyLowRating" : audit.status === "INACTIVE" ? "inactive" : "incomplete";
  return { need: "openPotential", reason };
}

export function assessLead(audit?: AssessmentAudit, place?: PlaceSignals & { phone?: string | null }) {
  const assessment = websiteNeed(audit);
  let priority: ContactPriority | null = null;
  let contactReason = "contactsUnknown";
  if (place) {
    if (place.businessStatus === "CLOSED_PERMANENTLY") { priority = "defer"; contactReason = "closed"; }
    else if (place.businessStatus !== "OPERATIONAL") { priority = "review"; contactReason = place.businessStatus ? "statusReview" : "statusUnknown"; }
    else if (place.rating == null || !Number.isFinite(place.rating) || place.rating < 1 || place.rating > 5) { priority = "review"; contactReason = "ratingUnknown"; }
    else if (place.rating < 3) { priority = "review"; contactReason = "lowRating"; }
    else if (assessment.need === "openPotential" || assessment.need === "pendingPotential") { priority = "review"; contactReason = "needUnknown"; }
    else if (!place.phone?.trim()) { priority = "review"; contactReason = "phoneMissing"; }
    else if (assessment.need === "highPotential") { priority = "first"; contactReason = "highNeed"; }
    else if (assessment.need === "mediumPotential") { priority = "next"; contactReason = "mediumNeed"; }
    else { priority = "defer"; contactReason = "lowNeed"; }
  }
  return { ...assessment, priority, contactReason };
}

export function countWebsiteNeeds(audits: readonly AssessmentAudit[]) {
  const counts: Record<WebsiteNeed, number> = { highPotential: 0, openPotential: 0, mediumPotential: 0, lowPotential: 0, pendingPotential: 0 };
  for (const audit of audits) counts[websiteNeed(audit).need]++;
  return counts;
}

export function compareWebsiteNeed(a?: AssessmentAudit, b?: AssessmentAudit) {
  const first = websiteNeed(a), second = websiteNeed(b);
  const group = NEED_GROUPS.indexOf(first.need) - NEED_GROUPS.indexOf(second.need);
  if (group) return group;
  if (first.need === "highPotential") {
    const missing = Number(b?.status === "NO_WEBSITE") - Number(a?.status === "NO_WEBSITE");
    if (missing) return missing;
  }
  const aScore = a?.status === "COMPLETED" ? validScore(a.qualityScore) : null;
  const bScore = b?.status === "COMPLETED" ? validScore(b.qualityScore) : null;
  return aScore !== null && bScore !== null ? aScore - bScore : 0;
}
