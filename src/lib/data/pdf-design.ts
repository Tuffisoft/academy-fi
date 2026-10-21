import "server-only";
import { prisma } from "@/lib/prisma";
import { defaultPdfDesign, parsePdfDesign } from "@/lib/lead-research/pdf/design";

export async function getPdfDesign(userId: string) {
  const saved = await prisma.pdfReportDesign.findUnique({ where: { userId }, select: { source: true, theme: true } });
  return parsePdfDesign(saved) ?? defaultPdfDesign;
}
