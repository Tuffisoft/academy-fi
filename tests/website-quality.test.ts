import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateQuality, inspectWebsite, publicWebsiteUrl, QualityError } from "../src/lib/lead-research/website-quality";
import { executeWebsiteAudit, type AuditStore } from "../src/lib/lead-research/run-website-audit";
import type { loadGooglePlaceDetails } from "../src/lib/lead-research/google-places";

function payload(performance = 0.8) {
  return { lighthouseResult: {
    finalUrl: "https://example.com/final", fetchTime: "2026-10-20T12:00:00Z", lighthouseVersion: "13",
    categories: Object.fromEntries(["performance", "seo", "accessibility", "best-practices"].map((id) => [id, { score: id === "performance" ? performance : 0.9, auditRefs: [{ id: "document-title", weight: 1 }] }])),
    audits: {
      "document-title": { title: "Missing page title", description: "Add a descriptive title", score: 0, scoreDisplayMode: "binary" },
      "largest-contentful-paint": { numericValue: 2500 },
      "is-on-https": { score: 1 },
      "unweighted-diagnostic": { title: "Must not affect score", score: 0, scoreDisplayMode: "binary" },
    }, runWarnings: ["Lab measurements vary"],
  } };
}

test("quality score increases with quality, follows published weights and never fabricates missing values", () => {
  const best = { mobilePerformance: 100, desktopPerformance: 100, seo: 100, accessibility: 100, bestPractices: 100 };
  assert.equal(calculateQuality(best), 100);
  assert.equal(calculateQuality({ ...best, mobilePerformance: 0 }), 60);
  assert.equal(calculateQuality({ mobilePerformance: 0, desktopPerformance: 0, seo: 0, accessibility: 0, bestPractices: 0 }), 0);
  for (const value of [null, NaN, Infinity, -1, 101]) assert.equal(calculateQuality({ ...best, seo: value }), null);
});

test("audit targets exclude local networks, credentials, non-HTTP URLs and nonstandard ports", () => {
  for (const value of ["http://127.0.0.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://192.168.1.1", "http://localhost", "https://foo.internal", "https://foo.local", "https://user:secret@example.com", "https://example.com:1234", "file:///etc/passwd", "javascript:alert(1)", "not a URL"]) assert.equal(publicWebsiteUrl(value), null, value);
  assert.equal(publicWebsiteUrl("https://example.com/page#fragment"), "https://example.com/page");
});

test("analysis requests both devices and four categories through a fixed endpoint; reports contain only normalized fields", async () => {
  const requests: URL[] = [];
  const report = await inspectWebsite("https://example.com", "private-key", async (url, init) => {
    const parsed = new URL(url); requests.push(parsed);
    assert.equal(parsed.origin, "https://www.googleapis.com");
    assert.deepEqual(parsed.searchParams.getAll("category"), ["performance", "seo", "accessibility", "best-practices"]);
    assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
    const data = payload(parsed.searchParams.get("strategy") === "mobile" ? 0.5 : 1);
    return Response.json({ ...data, companyName: "Never persist", secret: "private-key" });
  });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((r) => r.searchParams.get("strategy")), ["mobile", "desktop"]);
  assert.equal(report.qualityScore, 76);
  assert.equal(report.mobile.metrics.lcpMs, 2500);
  assert.equal(report.mobile.metrics.cls, null);
  assert.equal(report.mobile.issues.length, 1);
  assert.equal(report.mobile.checks.find((c) => c.id === "viewport")?.passed, null);
  assert.equal(report.mobile.checks.find((c) => c.id === "document-title")?.passed, false);
  assert.equal(JSON.stringify(report).includes("private-key"), false);
  assert.equal(JSON.stringify(report).includes("Never persist"), false);
});

test("missing category measurements leave a partial report without a quality score", async () => {
  const data = payload();
  delete data.lighthouseResult.categories.seo;
  const report = await inspectWebsite("https://example.com", undefined, async () => Response.json(data));
  assert.equal(report.parts.seo, null);
  assert.equal(report.qualityScore, null);
});

test("provider errors are safe codes, perform no automatic retries and discard upstream error bodies", async () => {
  for (const [status, code] of [[429, "auditQuota"], [403, "auditAccess"], [500, "auditUnavailable"]] as const) {
    let calls = 0;
    await assert.rejects(inspectWebsite("https://example.com", "secret", async () => { calls++; return new Response("secret upstream body", { status }); }), (error: unknown) => error instanceof QualityError && error.code === code && !error.message.includes("secret"));
    assert.equal(calls, 2);
  }
  await assert.rejects(inspectWebsite("https://example.com", undefined, async () => Response.json({ lighthouseResult: { runtimeError: { code: "DNS_FAILURE", message: "sensitive" } } })), { code: "auditUnreachable" });
  await assert.rejects(inspectWebsite("https://example.com", undefined, async () => Response.json({})), { code: "auditResponse" });
});

function store() {
  const state: { status: string; report?: unknown; error?: string; active: boolean } = { status: "QUEUED", active: true };
  const adapter: AuditStore = {
    claim: async () => { if (state.status !== "QUEUED") return "skip"; state.status = "RUNNING"; return "claimed"; },
    active: async () => state.active,
    complete: async (report) => { state.report = report; state.status = report ? "COMPLETED" : "NO_WEBSITE"; },
    fail: async (code) => { state.status = "FAILED"; state.error = code; },
  };
  return { state, adapter };
}
const place = { id: "p", name: "Not persisted", website: "https://example.com", address: "Not persisted", phone: null, mapsUrl: "https://maps.google.com", attributions: [] };
const details: typeof loadGooglePlaceDetails = async () => ({ results: [place], processedCount: 1, partialError: null });

test("duplicate worker delivery invokes paid providers once and stores only the technical report", async () => {
  const { state, adapter } = store(); let calls = 0;
  const inspect: typeof inspectWebsite = async (url) => { calls++; return inspectWebsite(url, undefined, async () => Response.json(payload())); };
  await Promise.all([executeWebsiteAudit("p", adapter, "key", undefined, details, inspect), executeWebsiteAudit("p", adapter, "key", undefined, details, inspect)]);
  assert.equal(calls, 1); assert.equal(state.status, "COMPLETED");
  assert.equal(JSON.stringify(state.report).includes("Not persisted"), false);
});

test("a missing website is separately identified without invoking PageSpeed or inventing a score", async () => {
  const { state, adapter } = store();
  await executeWebsiteAudit("p", adapter, "key", undefined, async () => ({ results: [{ ...place, website: null }], processedCount: 1, partialError: null }), async () => { throw new Error("Must not run"); });
  assert.equal(state.status, "NO_WEBSITE"); assert.equal(state.report, null);
});

test("capacity limits and revoked work cause no new PageSpeed calls; failures do not stop other jobs", async () => {
  const { state, adapter } = store();
  assert.equal(await executeWebsiteAudit("p", { ...adapter, claim: async () => "busy" }, undefined, undefined, async () => { throw new Error("Must not run"); }), "busy");
  state.active = false;
  await executeWebsiteAudit("p", adapter, "key", undefined, details, async () => { throw new Error("Must not run"); });
  assert.equal(state.report, undefined);
  const failed = store();
  await executeWebsiteAudit("p", failed.adapter, "key", undefined, details, async () => { throw new QualityError("auditQuota"); });
  assert.equal(failed.state.error, "auditQuota"); assert.equal(failed.state.report, undefined);
});
