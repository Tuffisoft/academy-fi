import assert from "node:assert/strict";
import { test } from "node:test";
import { searchGooglePlaces, type SearchResume } from "../src/lib/lead-research/google-places";
import { executeSearchJob, type SearchJobStore } from "../src/lib/lead-research/run-search-job";
import { auditControlScope, auditControlTransitions } from "../src/lib/lead-research/audit-controls";
import { getAuditProgress } from "../src/lib/lead-research/audit-progress";
import { executeWebsiteAudit } from "../src/lib/lead-research/run-website-audit";
import type { AuditSummary } from "../src/lib/lead-research/audit-types";

const input = { location: "Kiel", industry: "Bäckereien", radiusKm: 10, maxResults: 60, analyzeWebsites: true };
const center = { latitude: 54.3, longitude: 10.1 };
const place = (id: string) => ({ id, displayName: { text: "Company must not be stored" }, location: center });
const store = (overrides: Partial<SearchJobStore> = {}): SearchJobStore => ({ claim: async () => true, progress: async () => true, complete: async () => true, fail: async () => {}, ...overrides });

test("pause persists the page token and resume fetches only the next page, preserving existing IDs", async () => {
  let saved: SearchResume | undefined;
  let completion: unknown;
  let calls = 0;
  const requests: Record<string, unknown>[] = [];
  const fetcher = async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body))); calls++;
    if (calls === 1) return Response.json({ places: [{ location: center }] });
    if (calls === 2) return Response.json({ places: [place("a")], nextPageToken: "page-two" });
    return Response.json({ places: [place("a"), place("b")] });
  };
  const provider: typeof searchGooglePlaces = (data, key, _fetch, progress, contacts, resume) => searchGooglePlaces(data, key, fetcher, progress, contacts, resume);
  await executeSearchJob(input, "key", store({ progress: async progress => {
    saved = { checkpoint: progress.checkpoint ?? null, processedPages: progress.processedPages, placeIds: progress.placeIds };
    return progress.processedPages !== 1;
  }, complete: async () => { throw new Error("paused job cannot complete"); } }), provider);
  assert.equal(calls, 2);
  assert.equal(saved?.checkpoint?.nextPageToken, "page-two");
  assert.ok(!JSON.stringify(saved).includes("Company"));
  await executeSearchJob(input, "key", store({ complete: async result => { completion = result; return true; } }), provider, saved);
  assert.equal(calls, 3, "no location lookup or first page is repeated");
  assert.equal(requests[2].pageToken, "page-two");
  assert.deepEqual(completion, { placeIds: ["a", "b"], errorCode: null, resultLimit: false });
});

test("pausing after the final page resumes completion without any more provider requests", async () => {
  const result = await searchGooglePlaces(input, "key", async () => { throw new Error("must not fetch"); }, undefined, false, { checkpoint: { center, nextPageToken: null, done: true }, processedPages: 1, placeIds: ["kept"] });
  assert.deepEqual(result.results.map(row => row.id), ["kept"]);
});

test("audit batch controls enforce user scope and preserve completed reports", () => {
  assert.deepEqual(auditControlScope({ id: "alice", role: "INTERN" }, "bob", "batch"), { userId: "alice", batchId: "batch" });
  assert.deepEqual(auditControlScope({ id: "owner", role: "OWNER" }, "bob", "batch"), { userId: "bob", batchId: "batch" });
  assert.equal(auditControlScope({ id: "alice" }, "alice", ""), null);
  for (const change of Object.values(auditControlTransitions)) assert.ok(!(change.from as readonly string[]).includes("COMPLETED"));
  assert.deepEqual(auditControlTransitions.pause.from, ["QUEUED"]);
  assert.deepEqual(auditControlTransitions.resume.from, ["PAUSED"]);
});

test("paused audits remain pending, have no running countdown and cancelled audits end progress", () => {
  const base: AuditSummary = { id: "one", userId: "alice", placeId: "a", batchId: "batch", status: "PAUSED", qualityScore: null, checkedAt: null, errorCode: null, startedAt: null, updatedAt: new Date().toISOString() };
  const paused = getAuditProgress([base], Date.now());
  assert.equal(paused?.percentage, 0); assert.equal(paused?.paused, 1); assert.equal(paused?.active, false); assert.equal(paused?.remainingSeconds, null);
  const cancelled = getAuditProgress([{ ...base, status: "CANCELLED" }], Date.now());
  assert.equal(cancelled?.active, false); assert.equal(cancelled?.cancelled, 1); assert.equal(cancelled?.remainingSeconds, 0);
});

test("cancelled or paused audit tickets cannot start providers; cancellation after details prevents PageSpeed", async () => {
  let providerCalls = 0;
  const details = async () => { providerCalls++; return { results: [], partialError: null, processedCount: 0 }; };
  const inspect = async () => { throw new Error("PageSpeed must not run"); };
  await executeWebsiteAudit("place", { claim: async () => "skip", active: async () => false, complete: async () => { throw new Error("no completion"); }, fail: async () => { throw new Error("no failure overwrite"); } }, "key", "key", details, inspect);
  assert.equal(providerCalls, 0);
  await executeWebsiteAudit("place", { claim: async () => "claimed", active: async () => false, complete: async () => { throw new Error("no completion"); }, fail: async () => { throw new Error("no failure overwrite"); } }, "key", "key", details, inspect);
  assert.equal(providerCalls, 1);
});
