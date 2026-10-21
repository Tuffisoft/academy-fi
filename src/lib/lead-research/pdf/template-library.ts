import type { Prisma } from "@/generated/prisma/client";
import { defaultPdfDesign, parsePdfDesign, type PdfDesign } from "./design";
import { legacyPdfDesign } from "./legacy-design";

export async function selectStoredPdfTemplate(tx: Prisma.TransactionClient, userId: string, id: string) {
  const template = await tx.pdfReportTemplate.findFirst({ where: { id, userId } });
  const parsed = parsePdfDesign(template);
  if (!template || !parsed) return { success: false as const };
  const design = parsed.source === legacyPdfDesign.source ? { ...defaultPdfDesign, name: parsed.name, theme: parsed.theme } : parsed;
  return { success: true as const, design, templateId: template.id };
}

export async function activateStoredPdfTemplate(tx: Prisma.TransactionClient, userId: string, id: string) {
  const selected = await selectStoredPdfTemplate(tx, userId, id);
  if (!selected.success) return selected;
  const data = { ...selected.design, templateId: selected.templateId };
  await tx.pdfReportDesign.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return selected;
}

// The caller renders/validates the design first, then runs this in a transaction.
export async function saveStoredPdfTemplate(tx: Prisma.TransactionClient, userId: string, design: PdfDesign, requestedId: string | null | undefined) {
  const id = requestedId === undefined ? (await tx.pdfReportDesign.findUnique({ where: { userId }, select: { templateId: true } }))?.templateId : requestedId;
  let templateId: string;
  if (typeof id === "string") {
    const updated = await tx.pdfReportTemplate.updateMany({ where: { id, userId }, data: design });
    if (!updated.count) throw new Error("Template unavailable");
    templateId = id;
  } else {
    const template = await tx.pdfReportTemplate.create({ data: { userId, ...design, name: design.name! } });
    templateId = template.id;
  }
  const templates = await tx.pdfReportTemplate.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] });
  return { templateId, templates };
}
