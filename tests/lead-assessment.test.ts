import { test } from "node:test";
import assert from "node:assert/strict";
import { assessLead, websiteNeed, countWebsiteNeeds, NEED_GROUPS } from "../src/lib/lead-research/lead-assessment";
import { prepareLeadRows, prepareAreaLeadRows, isRankableLead, websiteOpportunityScore } from "../src/lib/lead-research/lead-groups";
import { getAuditProgress, auditPotential } from "../src/lib/lead-research/audit-progress";
import { leadSuitability, matchesPlaceSignals } from "../src/lib/lead-research/place-signals";
import { executeWebsiteAudit } from "../src/lib/lead-research/run-website-audit";
import type { AuditSummary } from "../src/lib/lead-research/audit-types";
import type { WebsiteReport } from "../src/lib/lead-research/website-quality";

const audit = (id: string, status: string, qualityScore: number | null = null): AuditSummary => ({
  id, status, qualityScore, userId: "user", placeId: id, batchId: "batch", checkedAt: null,
  startedAt: null, updatedAt: "2026-10-29T12:00:00Z", errorCode: null,
});
const contact = { businessStatus: "OPERATIONAL" as const, rating: 3, phone: "030 123456" };

test("website need preserves scores and distinguishes boundaries, missing websites and failures", () => {
  for (const [score, group] of [[0, "highPotential"], [59, "highPotential"], [60, "mediumPotential"], [79, "mediumPotential"], [80, "lowPotential"], [100, "lowPotential"]] as const) {
    const row = audit(String(score), "COMPLETED", score);
    assert.equal(websiteNeed(row).need, group);
    assert.equal(row.qualityScore, score);
  }
  assert.equal(websiteNeed(audit("none", "NO_WEBSITE")).need, "highPotential");
  assert.equal(websiteOpportunityScore(audit("none", "NO_WEBSITE")), null);
  for (const score of [null, NaN, Infinity, -1, 101]) assert.equal(websiteNeed(audit("bad", "COMPLETED", score)).need, "openPotential");
  for (const status of ["FAILED", "CANCELLED", "LOW_RATING", "INACTIVE"]) assert.equal(websiteNeed(audit(status, status)).need, "openPotential");
  for (const status of ["QUEUED", "RUNNING", "PAUSED"]) assert.equal(websiteNeed(audit(status, status, 90)).need, "pendingPotential");
  assert.equal(websiteNeed().need, "pendingPotential");
});

test("contact priorities respect business, ratings, missing data and need in order", () => {
  const high = audit("high", "NO_WEBSITE"), medium = audit("medium", "COMPLETED", 70), low = audit("low", "COMPLETED", 90);
  assert.equal(assessLead(high, contact).priority, "first");
  assert.equal(assessLead(medium, contact).priority, "next");
  assert.equal(assessLead(low, contact).priority, "defer");
  assert.equal(assessLead(high).priority, null);
  assert.equal(assessLead(high, {}).contactReason, "statusUnknown");
  assert.equal(assessLead(high, { ...contact, phone: null }).contactReason, "phoneMissing");
  assert.equal(assessLead(high, { ...contact, rating: null }).contactReason, "ratingUnknown");
  assert.equal(assessLead(high, { ...contact, rating: 2.9 }).contactReason, "lowRating");
  assert.equal(assessLead(high, { ...contact, rating: 3 }).priority, "first");
  for (const businessStatus of ["CLOSED_TEMPORARILY", "FUTURE_OPENING"] as const) assert.equal(assessLead(high, { ...contact, businessStatus }).priority, "review");
  const closed = assessLead(high, { businessStatus: "CLOSED_PERMANENTLY", rating: null, phone: null });
  assert.equal(closed.priority, "defer");
  assert.equal(closed.contactReason, "closed");
  assert.equal(closed.need, "highPotential");
  assert.equal(assessLead(audit("failed", "FAILED"), contact).priority, "review");
});

test("live grouping sorts before pagination and keeps no-website opportunities in the shortlist", () => {
  const rows = [audit("low", "COMPLETED", 90), audit("pending", "RUNNING"), audit("medium", "COMPLETED", 60), audit("high", "COMPLETED", 59), audit("open", "FAILED"), audit("none", "NO_WEBSITE"), audit("equal", "COMPLETED", 59)];
  const prepared = prepareLeadRows(rows, row => row, false);
  assert.deepEqual(prepared.rows.map(row => row.item.id), ["none", "high", "equal", "open", "medium", "low", "pending"]);
  assert.deepEqual(prepared.rows.slice(0, 2).map(row => row.item.id), ["none", "high"]);
  const area = prepareAreaLeadRows(rows, row => row, false);
  assert.deepEqual(area.rows.filter(row => isRankableLead(row.audit)).slice(0, 2).map(row => row.item.id), ["none", "high"]);
  assert.deepEqual(area.rows.filter(row => !isRankableLead(row.audit)).map(row => row.item.id), ["open", "pending"]);
});

test("progress, analytics and filtered leads share classifications and exact batch membership", () => {
  const rows = [audit("none", "NO_WEBSITE"), audit("high", "COMPLETED", 59), audit("open", "FAILED"), audit("medium", "COMPLETED", 60), audit("low", "COMPLETED", 80)];
  const old = { ...audit("old", "COMPLETED", 10), batchId: "old", updatedAt: "2026-10-28T12:00:00Z" };
  const progress = getAuditProgress([...rows, old], null)!;
  assert.deepEqual(progress.potential, countWebsiteNeeds(rows));
  assert.equal(progress.auditIds.includes("old"), false);
  for (const group of NEED_GROUPS) assert.equal(rows.filter(row => auditPotential(row) === group).length, progress.potential[group]);
  assert.equal(Object.values(progress.potential).reduce((sum, count) => sum + count, 0), progress.total);
});

test("low stars are a review hint and no longer exclude leads", () => {
  const place = { ...contact, rating: 2 };
  assert.equal(leadSuitability(place), "review");
  assert.equal(matchesPlaceSignals(place, "all", 3), true);
  assert.equal(leadSuitability({ ...place, businessStatus: "CLOSED_PERMANENTLY" }), "unusable");
});

test("new low-rating audits still inspect websites while inactive businesses remain skipped", async () => {
  let inspected = 0;
  const completions: unknown[][] = [];
  const store = { claim: async () => "claimed" as const, active: async () => true, complete: async (...values: unknown[]) => { completions.push(values); }, fail: async () => { assert.fail("unexpected failure"); } };
  const details = (businessStatus: "OPERATIONAL" | "CLOSED_TEMPORARILY") => async () => ({ results: [{ id: "place", name: "Company", address: null, phone: null, mapsUrl: "https://maps.google.com", website: "https://example.com", attributions: [], businessStatus, rating: 2 }], partialError: null, processedCount: 1 });
  const inspect = async () => { inspected++; return { qualityScore: 50 } as WebsiteReport & { parts: NonNullable<AuditSummary["parts"]> }; };
  await executeWebsiteAudit("place", store, "mock", "mock", details("OPERATIONAL"), inspect);
  assert.equal(inspected, 1);
  await executeWebsiteAudit("place", store, "mock", "mock", details("CLOSED_TEMPORARILY"), inspect);
  assert.equal(inspected, 1);
  assert.equal(completions[1][1], "INACTIVE");
});
