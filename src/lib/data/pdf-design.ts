import "server-only";
import { prisma } from "@/lib/prisma";
import { defaultPdfDesign, parsePdfDesign } from "@/lib/lead-research/pdf/design";
import { legacyPdfDesign } from "@/lib/lead-research/pdf/legacy-design";

export async function getPdfDesign(userId: string) {
  const saved = await prisma.pdfReportDesign.findUnique({ where: { userId }, select: { source: true, theme: true } });
  const design = parsePdfDesign(saved);
  // Upgrade saved copies of the previous stock template, preserving custom JSX.
  if (design?.source === legacyPdfDesign.source) return { ...defaultPdfDesign, theme: design.theme };
  return design ?? defaultPdfDesign;
}
