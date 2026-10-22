"use server";

import { requireAcademyUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPdfDesignerState } from "@/lib/data/pdf-design";
import { parsePdfDesign } from "@/lib/lead-research/pdf/design";
import { createWebsiteReportPdf } from "@/lib/lead-research/pdf/render";
import { sampleWebsiteReport } from "@/lib/lead-research/pdf/report-data";
import { PdfTemplateError } from "@/lib/lead-research/pdf/evaluate-jsx";
import { activateStoredPdfTemplate, saveStoredPdfTemplate, selectStoredPdfTemplate } from "@/lib/lead-research/pdf/template-library";

export async function getPdfDesignAction() {
  const user = await requireAcademyUser();
  return getPdfDesignerState(user.id);
}

export async function selectPdfTemplateAction(id: unknown) {
  const user = await requireAcademyUser();
  if (typeof id !== "string" || !id || id.length > 128) return { success: false as const };
  return prisma.$transaction(tx => selectStoredPdfTemplate(tx, user.id, id));
}

export async function activatePdfTemplateAction(id: unknown) {
  const user = await requireAcademyUser();
  if (typeof id !== "string" || !id || id.length > 128) return { success: false as const };
  return prisma.$transaction(tx => activateStoredPdfTemplate(tx, user.id, id));
}

export async function savePdfDesignAction(input: unknown) {
  const user = await requireAcademyUser();
  const design = parsePdfDesign(input);
  if (!design) return { success: false as const, error: "Invalid template." };
  const requestedId = (input as Record<string, unknown>).templateId;
  if (requestedId !== undefined && requestedId !== null && (typeof requestedId !== "string" || !requestedId || requestedId.length > 128)) return { success: false as const, error: "Invalid template." };
  try {
    // Reject foreign template IDs before doing PDF rendering work.
    if (typeof requestedId === "string" && !await prisma.pdfReportTemplate.findFirst({ where: { id: requestedId, userId: user.id }, select: { id: true } })) return { success: false as const, error: "Invalid template." };
    await createWebsiteReportPdf(sampleWebsiteReport, design);
    const result = await prisma.$transaction(tx => saveStoredPdfTemplate(tx, user.id, design, requestedId as string | null | undefined));
    return { success: true as const, design, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof PdfTemplateError ? error.message : null };
  }
}
