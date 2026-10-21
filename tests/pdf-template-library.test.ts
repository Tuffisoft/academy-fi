import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import { activateStoredPdfTemplate, saveStoredPdfTemplate, selectStoredPdfTemplate } from "../src/lib/lead-research/pdf/template-library";
import { defaultPdfDesign, type PdfDesign } from "../src/lib/lead-research/pdf/design";
import { legacyPdfDesign } from "../src/lib/lead-research/pdf/legacy-design";

type Row = PdfDesign & { id: string; userId: string };
const design: PdfDesign = { name: "Pierpers design", source: "<Document><Page><Text>Test</Text></Page></Document>", theme: "corporate" };
function store() {
  const rows: Row[] = [{ ...design, id: "mine", userId: "a" }, { ...design, name: "Private", id: "foreign", userId: "b" }];
  const active = new Map<string, PdfDesign & { templateId: string }>([["a", { ...design, templateId: "mine" }]]);
  const adapter = {
    pdfReportTemplate: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) => rows.find(row => row.id === where.id && row.userId === where.userId) ?? null,
      updateMany: async ({ where, data }: { where: { id: string; userId: string }; data: PdfDesign }) => {
        const row = rows.find(row => row.id === where.id && row.userId === where.userId);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      },
      create: async ({ data }: { data: PdfDesign & { userId: string } }) => { const row = { ...data, id: `new-${rows.length}` }; rows.push(row); return row; },
      findMany: async ({ where }: { where: { userId: string } }) => rows.filter(row => row.userId === where.userId).map(({ id, name }) => ({ id, name })),
    },
    pdfReportDesign: {
      findUnique: async ({ where }: { where: { userId: string } }) => active.get(where.userId) ?? null,
      upsert: async ({ where, update }: { where: { userId: string }; update: PdfDesign & { templateId: string } }) => { active.set(where.userId, update); return update; },
    },
  };
  return { rows, active, tx: adapter as unknown as Prisma.TransactionClient };
}

test("saving and selecting templates do not change client PDFs; only explicit activation publishes a snapshot", async () => {
  const { tx, rows, active } = store();
  const copy = { ...design, name: "Kundenbericht", theme: "modern" as const };
  const result = await saveStoredPdfTemplate(tx, "a", copy, null);
  assert.equal(rows.find(row => row.id === "mine")?.name, "Pierpers design");
  assert.equal(result.templates.length, 2);
  assert.equal(result.templates.some(row => row.id === "foreign"), false);
  const liveBefore = { ...design, templateId: "mine" };
  assert.deepEqual(active.get("a"), liveBefore);
  const selected = await selectStoredPdfTemplate(tx, "a", result.templateId);
  assert.equal(selected.success, true);
  assert.deepEqual(active.get("a"), liveBefore);
  assert.equal((await activateStoredPdfTemplate(tx, "a", result.templateId)).success, true);
  assert.deepEqual(active.get("a"), { ...copy, templateId: result.templateId });
  const edited = { ...copy, source: "<Document><Page><Text>Changed draft</Text></Page></Document>" };
  await saveStoredPdfTemplate(tx, "a", edited, result.templateId);
  assert.deepEqual(active.get("a"), { ...copy, templateId: result.templateId });
  await activateStoredPdfTemplate(tx, "a", result.templateId);
  assert.deepEqual(active.get("a"), { ...edited, templateId: result.templateId });
});

test("renaming and legacy saves update the library while preserving the live snapshot", async () => {
  const { tx, rows, active } = store();
  await saveStoredPdfTemplate(tx, "a", { ...design, name: "New name" }, "mine");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "New name");
  await saveStoredPdfTemplate(tx, "a", { ...design, name: "Older client" }, undefined);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Older client");
  assert.equal(active.get("a")?.name, "Pierpers design");
});

test("another user's template cannot be selected, changed, or made active", async () => {
  const { tx, rows, active } = store();
  const before = structuredClone(rows);
  assert.deepEqual(await selectStoredPdfTemplate(tx, "a", "foreign"), { success: false });
  assert.deepEqual(await activateStoredPdfTemplate(tx, "a", "foreign"), { success: false });
  await assert.rejects(saveStoredPdfTemplate(tx, "a", { ...design, name: "Overwrite" }, "foreign"), /Template unavailable/);
  assert.deepEqual(rows, before);
  assert.equal(active.get("a")?.templateId, "mine");
  assert.equal(active.has("b"), false);
});

test("the first saved template stays a draft until it is explicitly activated", async () => {
  const { tx, active } = store();
  active.clear();
  const saved = await saveStoredPdfTemplate(tx, "a", design, null);
  assert.equal(active.size, 0);
  await selectStoredPdfTemplate(tx, "a", saved.templateId);
  assert.equal(active.size, 0);
  await activateStoredPdfTemplate(tx, "a", saved.templateId);
  assert.equal(active.get("a")?.templateId, saved.templateId);
});

test("opening an upgraded stock template does not publish it until explicit activation", async () => {
  const { tx, rows, active } = store();
  rows[0].source = legacyPdfDesign.source;
  const published = { ...design, source: legacyPdfDesign.source, templateId: "mine" };
  active.set("a", published);
  const selected = await selectStoredPdfTemplate(tx, "a", "mine");
  assert.equal(selected.success && selected.design.source, defaultPdfDesign.source);
  assert.deepEqual(active.get("a"), published);
  await activateStoredPdfTemplate(tx, "a", "mine");
  assert.equal(active.get("a")?.source, defaultPdfDesign.source);
});
