import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAcademyUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { AuditSummary } from "@/lib/lead-research/audit-types";
import { Prisma } from "@/generated/prisma/client";
import { calculateQuality, validScore, type QualityParts } from "@/lib/lead-research/website-rating";

export async function getWebsiteAudits(): Promise<AuditSummary[]> {
  const user = await requireAcademyUser();
  // A terminated step is made visible as a failure; it is never silently billed again.
  await prisma.websiteAudit.updateMany({ where: { ...leadSearchScope(user), status: "RUNNING", startedAt: { lt: new Date(Date.now() - 120000) } }, data: { status: "FAILED", qualityScore: null, errorCode: "auditInterrupted", checkedAt: new Date() } });
  await prisma.websiteAudit.updateMany({ where: { ...leadSearchScope(user), status: "QUEUED", updatedAt: { lt: new Date(Date.now() - 90 * 60000) } }, data: { status: "FAILED", qualityScore: null, errorCode: "auditInterrupted", checkedAt: new Date() } });
  const rows = await prisma.websiteAudit.findMany({ where: leadSearchScope(user), select: { id: true, userId: true, placeId: true, status: true, qualityScore: true, checkedAt: true, errorCode: true, runToken: true, batchId: true, startedAt: true, updatedAt: true } });
  const ids = rows.filter(row => row.status === "COMPLETED").map(row => row.id);
  // Poll only the five scores, rather than transferring full reports on every poll.
  const scores = ids.length ? await prisma.$queryRaw<{ id: string; parts: QualityParts }[]>(Prisma.sql`
    SELECT id, jsonb_build_object(
      'performance', report #> '{mobile,performance}', 'seo', report #> '{mobile,seo}',
      'accessibility', report #> '{mobile,accessibility}', 'bestPractices', report #> '{mobile,bestPractices}',
      'design', CASE WHEN report #>> '{visual,status}' = 'completed' THEN report #> '{visual,score}' ELSE NULL END
    ) AS parts FROM "WebsiteAudit" WHERE id IN (${Prisma.join(ids)})`) : [];
  const byId = new Map(scores.map(row => [row.id, Object.fromEntries(Object.entries(row.parts).map(([key, value]) => [key, validScore(value)])) as QualityParts]));
  return rows.map(({ checkedAt, runToken, batchId, startedAt, updatedAt, ...row }) => {
    const parts = byId.get(row.id);
    return { ...row, qualityScore: parts ? calculateQuality(parts) : null, ...(parts ? { parts } : {}), batchId: batchId ?? runToken, checkedAt: checkedAt?.toISOString() ?? null, startedAt: startedAt?.toISOString() ?? null, updatedAt: updatedAt.toISOString() };
  });
}
