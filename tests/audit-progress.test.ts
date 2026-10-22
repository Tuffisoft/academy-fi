import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuditSummary } from "../src/lib/lead-research/audit-types";
import { compareAuditQuality, formatRemainingTime, getAuditProgress } from "../src/lib/lead-research/audit-progress";
import { MAX_PARALLEL_WEBSITE_AUDITS, runAuditPool } from "../src/lib/lead-research/audit-scheduling";

const start = Date.parse("2026-10-20T12:00:00Z");
function audit(id: string, data: Partial<AuditSummary> = {}): AuditSummary {
  return { id, userId: "alice", placeId: id, batchId: "batch", status: "QUEUED", qualityScore: null, startedAt: null, checkedAt: null, updatedAt: new Date(start).toISOString(), errorCode: null, ...data };
}
const completed = (id: string, data: Partial<AuditSummary> = {}) => audit(id, { status: "COMPLETED", qualityScore: 70, startedAt: new Date(start).toISOString(), checkedAt: new Date(start + 30000).toISOString(), updatedAt: new Date(start + 30000).toISOString(), ...data });

test("progress counts only current batches, excludes old history, and counts failures as finished without claiming success", () => {
  const model = getAuditProgress([completed("old", { batchId: "old" }), completed("a"), audit("b", { status: "FAILED", errorCode: "auditQuota" }), audit("c", { status: "RUNNING", startedAt: new Date(start).toISOString() }), audit("d")], start + 10000);
  assert.ok(model);
  assert.equal(model.total, 4);
  assert.equal(model.done, 2);
  assert.equal(model.percentage, 50);
  assert.equal(model.failed, 1);
  assert.equal(model.active, true);
  assert.equal(model.remainingSeconds, 30);
});

test("last completed batch stays at 100 percent and zero remaining time; unknown initial timing is not invented", () => {
  assert.equal(getAuditProgress([], null), null);
  assert.equal(getAuditProgress([audit("pending")], null)?.remainingSeconds, null);
  const model = getAuditProgress([completed("old", { batchId: "old", updatedAt: new Date(start - 10000).toISOString() }), completed("new")], start + 30000);
  assert.equal(model?.percentage, 100);
  assert.equal(model?.total, 1);
  assert.equal(model?.remainingSeconds, 0);
  assert.equal(model?.active, false);
});

test("time estimate uses parallel slots, reduces elapsed time and never reports zero for active work", () => {
  const pending = Array.from({ length: MAX_PARALLEL_WEBSITE_AUDITS * 2 }, (_, id) => audit(String(id)));
  assert.equal(getAuditProgress(pending, start)?.remainingSeconds, 120);
  const running = audit("active", { status: "RUNNING", startedAt: new Date(start).toISOString() });
  assert.equal(getAuditProgress([running], start + 10000)?.remainingSeconds, 50);
  assert.ok(getAuditProgress([running], start + 90000)!.remainingSeconds! > 0);
  assert.equal(formatRemainingTime(125), "02:05");
  assert.equal(formatRemainingTime(0), "00:00");
});

test("batch identities include the owner and never mix another user's completed history", () => {
  const model = getAuditProgress([audit("active"), completed("other", { userId: "bob" })], start);
  assert.equal(model?.total, 1);
  assert.equal(model?.percentage, 0);
});

test("quality sorting puts genuine zero first, keeps equal scores stable and leaves missing or failed measurements last", () => {
  const rows = [completed("good", { qualityScore: 90 }), audit("missing"), completed("zero", { qualityScore: 0 }), audit("failed", { status: "FAILED", qualityScore: 0 }), completed("low", { qualityScore: 20 }), completed("same", { qualityScore: 20 }), completed("partial", { qualityScore: null })];
  rows.sort(compareAuditQuality);
  assert.deepEqual(rows.map((row) => row.id), ["zero", "low", "same", "good", "missing", "failed", "partial"]);
});

test("a free worker immediately takes the next lead while a slow worker is still running, with at most six active", async () => {
  let active = 0; let maximum = 0;
  const started: number[] = [];
  const release = new Map<number, () => void>();
  const run = runAuditPool([0, 1, 2, 3, 4, 5, 6, 7], async (id) => {
    started.push(id); active++; maximum = Math.max(maximum, active);
    await new Promise<void>((resolve) => release.set(id, resolve));
    active--;
  });
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5]);
  release.get(1)!();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6]);
  release.get(2)!();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const id of [0, 3, 4, 5, 6, 7]) release.get(id)!();
  await run;
  assert.equal(maximum, 6);
  assert.equal(active, 0);
});
