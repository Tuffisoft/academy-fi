"use server";

import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { auditWebsites } from "@/workflows/audit-websites";
import { auditControlScope, auditControlTransitions, type AuditControl } from "@/lib/lead-research/audit-controls";

export async function controlWebsiteAuditsAction(userId: unknown, batchId: unknown, command: AuditControl) {
  const user = await requireUser();
  const scope = auditControlScope(user, userId, batchId);
  if (!scope || !["pause", "resume", "cancel"].includes(command)) return { success: false as const };
  const transition = auditControlTransitions[command];
  const jobs = await prisma.$transaction(async tx => {
    // Serialize competing controls for the same batch. Worker claims remain atomic.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261021, 6)::text`;
    const rows = await tx.websiteAudit.findMany({ where: { ...scope, status: { in: [...transition.from] } }, select: { id: true, runToken: true } });
    if (!rows.length) return [];
    await tx.websiteAudit.updateMany({ where: { ...scope, id: { in: rows.map(row => row.id) }, status: { in: [...transition.from] } }, data: { status: transition.to, ...(command === "resume" ? { runToken: randomUUID() } : {}), ...(command === "cancel" ? { checkedAt: new Date(), errorCode: null } : {}) } });
    return command === "resume" ? tx.websiteAudit.findMany({ where: { ...scope, id: { in: rows.map(row => row.id) }, status: "QUEUED" }, select: { id: true, runToken: true } }) : rows;
  });
  if (command === "resume" && jobs.length) {
    try { await start(auditWebsites, [jobs.map(job => ({ id: job.id, token: job.runToken }))]); }
    catch {
      // Preserve resumability if durable dispatch fails. No provider request is retried.
      await prisma.websiteAudit.updateMany({ where: { ...scope, OR: jobs.map(job => ({ id: job.id, runToken: job.runToken })), status: "QUEUED" }, data: { status: "PAUSED" } });
      revalidatePath("/[locale]/tools/calem/lead-research", "page");
      return { success: false as const };
    }
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: jobs.length > 0 };
}
