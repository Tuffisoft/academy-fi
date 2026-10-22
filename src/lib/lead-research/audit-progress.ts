import type { AuditSummary } from "./audit-types";
import { MAX_PARALLEL_WEBSITE_AUDITS } from "./audit-scheduling";

export const auditIsActive = (audit: Pick<AuditSummary, "status">) => ["QUEUED", "RUNNING"].includes(audit.status);
export const auditIsPending = (audit: Pick<AuditSummary, "status">) => ["QUEUED", "RUNNING", "PAUSED"].includes(audit.status);
const batchKey = (audit: AuditSummary) => JSON.stringify([audit.userId, audit.batchId]);
const timestamp = (value: string | null) => value ? Date.parse(value) : NaN;

export function getAuditProgress(audits: readonly AuditSummary[], now: number | null) {
  if (!audits.length) return null;
  const activeKeys = new Set(audits.filter(auditIsPending).map(batchKey));
  const latest = [...audits].sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt))[0];
  const keys = activeKeys.size ? activeKeys : new Set([batchKey(latest)]);
  const batch = audits.filter((audit) => keys.has(batchKey(audit)));
  const pending = batch.filter(auditIsPending);
  const paused = pending.filter(audit => audit.status === "PAUSED").length;
  const done = batch.length - pending.length;
  const percentage = Math.floor(done / batch.length * 100);
  const failed = batch.filter((audit) => audit.status === "FAILED").length;
  let remainingSeconds: number | null = pending.length ? null : 0;
  if (pending.length && !paused && now !== null) {
    const durations = audits.filter((audit) => audit.status === "COMPLETED").flatMap((audit) => {
      const duration = timestamp(audit.checkedAt) - timestamp(audit.startedAt);
      return duration >= 1000 && duration <= 120000 ? [duration] : [];
    });
    const duration = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 60000;
    const slots = Array<number>(MAX_PARALLEL_WEBSITE_AUDITS).fill(0);
    // Running jobs occupy slots first; queued jobs go into the next available slot.
    const ordered = [...pending].sort((a, b) => Number(b.status === "RUNNING") - Number(a.status === "RUNNING"));
    for (const audit of ordered) {
      const elapsed = audit.status === "RUNNING" ? Math.max(0, now - timestamp(audit.startedAt)) : 0;
      const remaining = Number.isFinite(elapsed) ? Math.max(2000, duration - elapsed) : duration;
      const slot = slots.indexOf(Math.min(...slots));
      slots[slot] += remaining;
    }
    remainingSeconds = Math.ceil(Math.max(...slots) / 1000);
  }
  return { total: batch.length, done, percentage, failed, paused, cancelled: batch.filter(audit => audit.status === "CANCELLED").length, active: pending.some(auditIsActive), remainingSeconds };
}

export function formatRemainingTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

// Missing or failed measurements are never treated as a zero-quality website.
export function compareAuditQuality(a?: Pick<AuditSummary, "status" | "qualityScore">, b?: Pick<AuditSummary, "status" | "qualityScore">) {
  const value = (audit?: Pick<AuditSummary, "status" | "qualityScore">) => audit?.status === "COMPLETED" && audit.qualityScore !== null && Number.isFinite(audit.qualityScore) ? audit.qualityScore : Infinity;
  const first = value(a);
  const second = value(b);
  return first === second ? 0 : first < second ? -1 : 1;
}
