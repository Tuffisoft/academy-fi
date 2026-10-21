"use server";

import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPdfDesign } from "@/lib/data/pdf-design";
import { parsePdfDesign } from "@/lib/lead-research/pdf/design";
import { createWebsiteReportPdf } from "@/lib/lead-research/pdf/render";
import { sampleWebsiteReport } from "@/lib/lead-research/pdf/report-data";
import { PdfTemplateError } from "@/lib/lead-research/pdf/evaluate-jsx";

export async function getPdfDesignAction() {
  const user = await requireUser();
  return getPdfDesign(user.id);
}

export async function savePdfDesignAction(input: unknown) {
  const user = await requireUser();
  const design = parsePdfDesign(input);
  if (!design) return { success: false as const, error: "Invalid template." };
  try {
    await createWebsiteReportPdf(sampleWebsiteReport, design);
    await prisma.pdfReportDesign.upsert({ where: { userId: user.id }, create: { userId: user.id, ...design }, update: design });
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof PdfTemplateError ? error.message : null };
  }
}
