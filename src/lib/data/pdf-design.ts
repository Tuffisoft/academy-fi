import { requireAcademyUser } from "@/lib/session";
import "server-only";
import { prisma } from "@/lib/prisma";
import { defaultPdfDesign, parsePdfDesign } from "@/lib/lead-research/pdf/design";
import { selectStoredPdfTemplate } from "@/lib/lead-research/pdf/template-library";

export async function getPdfDesign(userId: string) {
  await requireAcademyUser();
  const saved = await prisma.pdfReportDesign.findUnique({ where: { userId }, select: { name: true, source: true, theme: true } });
  const design = parsePdfDesign(saved);
  // Exports use the published snapshot, including when its library entry changes.
  return design ?? defaultPdfDesign;
}

export async function getPdfDesignerState(userId: string) {
  await requireAcademyUser();
  const [liveDesign, active, templates] = await Promise.all([
    getPdfDesign(userId),
    prisma.pdfReportDesign.findUnique({ where: { userId }, select: { templateId: true } }),
    prisma.pdfReportTemplate.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
  ]);
  const liveTemplateId = active?.templateId ?? null;
  const templateId = templates.find(template => template.id === liveTemplateId)?.id ?? templates[0]?.id ?? null;
  const selected = templateId ? await selectStoredPdfTemplate(prisma, userId, templateId) : null;
  return { design: selected?.success ? selected.design : defaultPdfDesign, templateId, templates, liveDesign, liveTemplateId };
}
