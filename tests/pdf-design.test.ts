import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, type ComponentType } from "react";
import { evaluatePdfJsx, PdfTemplateError } from "../src/lib/lead-research/pdf/evaluate-jsx";
import { defaultPdfDesign, parsePdfDesign } from "../src/lib/lead-research/pdf/design";
import { pdfReportData, sampleWebsiteReport } from "../src/lib/lead-research/pdf/report-data";
import { createWebsiteReportPdf, validatePdfNavigation } from "../src/lib/lead-research/pdf/render";

const components = { Document: () => null, Text: () => null } as Record<string, ComponentType<never>>;

test("JSX templates cannot invoke JavaScript, access prototypes, fetch resources or spread props", () => {
  for (const source of [
    '<Document>{process.env}</Document>',
    '<Document>{globalThis}</Document>',
    '<Document>{report.constructor}</Document>',
    '<Document>{report["__proto__"]}</Document>',
    '<Document>{report.items.map.constructor("return process")()}</Document>',
    '<Document>{fetch("https://example.com")}</Document>',
    '<Document>{(() => 1)()}</Document>',
    '<Document>{report.items.map(item => { return item })}</Document>',
    '<Document><Text {...report}/></Document>',
    '<Document><Image src="/secret"/></Document>',
    '<Document fonts={report.items}/>',
    '<Document><Text onClick={report.items}/></Document>',
    '<Document>{new Function("return 1")}</Document>',
  ]) assert.throws(() => evaluatePdfJsx(source, components, { items: [1, 2] }), PdfTemplateError, source);
});

test("React-style mapping, inline styles and conditions preserve data and inline whitespace", () => {
  const node = evaluatePdfJsx('<Document>{report.rows.map((row, i) => <Text key={i} style={{ color: "#123456" }}>{row.label}: {row.value === null ? "Missing" : row.value}</Text>)}</Document>', components, { rows: [{ label: "LCP", value: 0 }, { label: "SEO", value: null }] }) as ReturnType<typeof createElement<{ children: React.ReactElement<{ children: React.ReactNode[] }>[] }>>;
  const children = node.props.children.flat() as React.ReactElement<{ children: React.ReactNode[] }>[];
  assert.deepEqual(children[0].props.children, ["LCP", ": ", 0]);
  assert.deepEqual(children[1].props.children, ["SEO", ": ", "Missing"]);
});

test("PDF navigation accepts internal destinations and rejects unsafe links or missing targets", () => {
  for (const href of ["https://example.com", "file:///secret", "javascript:alert(1)", "#bad name"]) {
    assert.throws(() => evaluatePdfJsx(`<Document><Text href="${href}">Link</Text></Document>`, components, {}), PdfTemplateError);
  }
  assert.doesNotThrow(() => evaluatePdfJsx('<Document><Text href="#mobile">Mobil</Text><Text bookmark="mobile">Ziel</Text></Document>', components, {}));
  assert.doesNotThrow(() => validatePdfNavigation({ children: [{ href: "#mobile" }, { bookmark: "mobile" }] }));
  assert.throws(() => validatePdfNavigation({ href: "#missing" }), /Missing PDF bookmark/);
  assert.throws(() => validatePdfNavigation([{ bookmark: "mobile" }, { bookmark: "mobile" }]), /Duplicate PDF bookmark/);
});

test("missing and zero measurements stay distinct; the view model does not mutate reports", () => {
  const report = structuredClone(sampleWebsiteReport);
  report.mobile.metrics.lcpMs = null;
  report.mobile.metrics.tbtMs = 0;
  report.parts.seo = null;
  report.mobile.seo = null;
  report.qualityScore = null;
  const before = structuredClone(report);
  const model = pdfReportData(report, "de");
  assert.equal(model.scoreLabel, "Nicht gemessen");
  assert.equal(model.devices[0].metrics.find(row => row.key === "lcpMs")?.value, "Nicht gemessen");
  assert.equal(model.devices[0].metrics.find(row => row.key === "tbtMs")?.value, "0 ms");
  assert.deepEqual(report, before);
  assert.equal(parsePdfDesign({ ...defaultPdfDesign, userId: "not-trusted" })?.source, defaultPdfDesign.source);
  assert.equal(parsePdfDesign({ source: "x".repeat(60001), theme: "modern" }), null);
  assert.equal(parsePdfDesign({ ...defaultPdfDesign, theme: "unknown" }), null);
});

test("official PDFCN components render valid PDFs using all three Forme themes", async () => {
  for (const theme of ["modern", "corporate", "professional"] as const) {
    const bytes = await createWebsiteReportPdf(sampleWebsiteReport, { ...defaultPdfDesign, theme });
    assert.ok(bytes.length > 2000);
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), "%PDF-");
    const pdf = Buffer.from(bytes).toString("latin1");
    // Four full-row menu links and four return links, emitted as real PDF GoTo actions.
    assert.equal((pdf.match(/\/GoTo\b/g) ?? []).length, 8);
    assert.equal(pdf.includes("/URI"), false);
  }
});
