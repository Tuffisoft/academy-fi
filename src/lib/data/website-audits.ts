import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { AuditSummary } from "@/lib/lead-research/audit-types";

export async function getWebsiteAudits(): Promise<AuditSummary[]> {
  const user = await requireUser();
  // A terminated step is made visible as a failure; it is never silently billed again.
  await prisma.websiteAudit.updateMany({ where: { ...leadSearchScope(user), status: "RUNNING", startedAt: { lt: new Date(Date.now() - 120000) } }, data: { status: "FAILED", qualityScore: null, errorCode: "auditInterrupted", checkedAt: new Date() } });
  await prisma.websiteAudit.updateMany({ where: { ...leadSearchScope(user), status: "QUEUED", updatedAt: { lt: new Date(Date.now() - 90 * 60000) } }, data: { status: "FAILED", qualityScore: null, errorCode: "auditInterrupted", checkedAt: new Date() } });
  const rows = await prisma.websiteAudit.findMany({ where: leadSearchScope(user), select: { id: true, userId: true, placeId: true, status: true, qualityScore: true, checkedAt: true, errorCode: true, runToken: true, startedAt: true, updatedAt: true } });
  return rows.map(({ checkedAt, runToken, startedAt, updatedAt, ...row }) => ({ ...row, batchId: runToken, checkedAt: checkedAt?.toISOString() ?? null, startedAt: startedAt?.toISOString() ?? null, updatedAt: updatedAt.toISOString() }));
}
