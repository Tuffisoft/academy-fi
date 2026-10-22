import assert from "node:assert/strict";
import { test } from "node:test";
import { assessVisualDesign, screenshotData } from "../src/lib/lead-research/visual-design";
import { calculateDeviceScore, calculateQuality, normalizeWebsiteReport } from "../src/lib/lead-research/website-rating";
import { inspectWebsite } from "../src/lib/lead-research/website-quality";
import { sampleWebsiteReport, pdfReportData } from "../src/lib/lead-research/pdf/report-data";
import { compareAuditQuality } from "../src/lib/lead-research/audit-progress";

const image = "data:image/jpeg;base64,YWJj";
const assessment = { rateable: true, confidence: "high", criteria: { hierarchy: 80, readability: 60, consistency: 80, mobileLayout: 60 }, findings: [{ observation: "Text ist zu klein.", recommendation: "Schrift vergrößern." }] };
function response(value: unknown = assessment) { return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] }); }

test("device summaries use their own four technical measurements and keep missing values distinct from zero", () => {
  assert.equal(calculateDeviceScore(sampleWebsiteReport.mobile), 82);
  assert.equal(calculateDeviceScore(sampleWebsiteReport.desktop), 92);
  const zero = { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 };
  assert.equal(calculateDeviceScore(zero), 0);
  for (const value of [null, NaN, Infinity, -1, 101]) assert.equal(calculateDeviceScore({ ...zero, performance: value }), null);
});

test("visual assessment sends only a screenshot to the fixed endpoint and calculates criteria equally", async () => {
  let calls = 0;
  const result = await assessVisualDesign(image, { apiKey: "test-secret", fetcher: async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.input[0].content[1].image_url, image);
    return response();
  } });
  assert.equal(calls, 1); assert.equal(result.score, 70); assert.equal(result.status, "completed");
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
  assert.equal(JSON.stringify(result).includes(image), false);
});

test("missing configuration, images and cancelled work do not make paid calls", async () => {
  const fetcher: typeof fetch = async () => { throw Error("Must not run"); };
  assert.equal((await assessVisualDesign(image, { fetcher })).status, "not_configured");
  assert.equal((await assessVisualDesign(null, { apiKey: "key", fetcher })).status, "screenshot_missing");
  assert.equal((await assessVisualDesign(image, { apiKey: "key", fetcher, active: async () => false })).status, "cancelled");
  for (const value of ["https://example.com/image.jpg", "data:image/svg+xml;base64,YWJj", "data:image/png;base64,!!!", "data:image/jpeg;base64," ]) assert.equal(screenshotData(value), null);
});

test("ambiguous screenshots, malformed responses, refusals and provider errors never create a score or retry", async () => {
  for (const result of [
    { ...assessment, rateable: false }, { ...assessment, confidence: "low" }, { ...assessment, criteria: { ...assessment.criteria, hierarchy: 101 } },
    { ...assessment, findings: [{ observation: "", recommendation: "Invalid" }] },
  ]) assert.equal((await assessVisualDesign(image, { apiKey: "key", fetcher: async () => response(result) })).score, null);
  for (const makeResponse of [() => new Response("secret", { status: 429 }), () => new Response("bad json"), () => Response.json({ status: "incomplete", output: [] }), () => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal" }] }] })]) {
    let calls = 0;
    const result = await assessVisualDesign(image, { apiKey: "key", fetcher: async () => { calls++; return makeResponse(); } });
    assert.equal(result.score, null); assert.equal(result.status, "unavailable"); assert.equal(calls, 1);
  }
});

test("topics follow approved weights; desktop and legacy aggregate scores cannot affect mobile ranking", () => {
  const report = structuredClone(sampleWebsiteReport);
  report.qualityScore = 1;
  report.desktop.performance = 0; report.desktop.seo = 0;
  const normalized = normalizeWebsiteReport(report);
  assert.equal(normalized.qualityScore, 75);
  assert.equal(pdfReportData(report, "de").scoreLabel, "75/100");
  assert.equal(pdfReportData(report, "de").partsRows.length, 5);
  const best = { performance: 100, seo: 100, accessibility: 100, bestPractices: 100, design: 100 };
  for (const [key, expected] of Object.entries({ performance: 70, seo: 90, accessibility: 90, bestPractices: 80, design: 70 })) {
    assert.equal(calculateQuality({ ...best, [key]: 0 }), expected, key);
  }
  assert.deepEqual(
    Object.fromEntries(pdfReportData(report, "de").partsRows.map(({ key, weight }) => [key, weight])),
    { performance: 30, seo: 10, accessibility: 10, bestPractices: 20, design: 30 },
  );
  delete report.visual;
  report.version = 1;
  report.parts = { mobilePerformance: 54, desktopPerformance: 100, seo: 92, accessibility: 81, bestPractices: 100 };
  const legacy = normalizeWebsiteReport(report);
  assert.equal(legacy.qualityScore, null); assert.equal(legacy.parts.performance, 54);
  assert.equal(compareAuditQuality({ status: "COMPLETED", qualityScore: legacy.qualityScore }, { status: "COMPLETED", qualityScore: 80 }), 1);
});

test("PageSpeed screenshot reaches the assessor transiently; persisted report contains categories and no image", async () => {
  const report = await inspectWebsite("https://example.com", undefined, async () => Response.json({ lighthouseResult: {
    finalUrl: "https://example.com", fetchTime: "2026-10-21T09:00:00Z",
    categories: Object.fromEntries(["performance", "seo", "accessibility", "best-practices"].map(key => [key, { score: 0.8, auditRefs: key === "seo" ? [{ id: "document-title", weight: 1 }] : [] }])),
    audits: { "final-screenshot": { details: { data: image } }, "document-title": { title: "Missing title", score: 0, scoreDisplayMode: "binary" } },
  } }), { apiKey: "key", fetcher: async () => response() });
  assert.equal(report.qualityScore, 77); assert.equal(report.parts.design, 70);
  assert.deepEqual(report.mobile.issues[0].categories, ["seo"]);
  assert.equal(JSON.stringify(report).includes("base64"), false);
});
