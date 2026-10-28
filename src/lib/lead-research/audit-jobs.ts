import "server-only";
import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { auditWebsites } from "@/workflows/audit-websites";
import { executeWebsiteAudit } from "./run-website-audit";
import { MAX_PARALLEL_WEBSITE_AUDITS } from "./audit-scheduling";

export type AuditTicket = { id: string; token: string };

export async function queueWebsiteAudits(
  userId: string,
  placeIds: string[],
  search?: {
    id: string;
    runId: string;
    resultLimit: boolean;
    errorCode: string | null;
  },
) {
  const log = (event: string, details: Record<string, unknown> = {}) =>
    console.info("[lead-audit]", { event, ...details });
  const ids = [...new Set(placeIds)].slice(0, 60);
  const runToken = randomUUID();
  const prepared = await prisma.$transaction(async (tx) => {
    // Search completion and audit visibility are atomic, so a status poll never
    // stops in the gap between finishing the search and creating its audits.
    if (search) {
      const completed = await tx.leadSearch.updateMany({
        where: {
          id: search.id,
          runId: search.runId,
          status: "RUNNING",
          pauseRequested: false,
        },
        data: {
          status: "COMPLETED",
          phase: "DONE",
          googlePlaceIds: ids,
          resultLimit: search.resultLimit,
          errorCode: search.errorCode,
          finishedAt: new Date(),
        },
      });
      if (!completed.count) return { completed: false, jobs: [] };
    }
    // Concurrent searches share a pending check for the same user and place.
    await tx.websiteAudit.createMany({
      data: ids.map((placeId) => ({
        userId,
        placeId,
        runToken,
        batchId: runToken,
      })),
      skipDuplicates: true,
    });
    if (search)
      await tx.websiteAudit.updateMany({
        where: {
          userId,
          placeId: { in: ids },
          status: { notIn: ["QUEUED", "RUNNING", "PAUSED"] },
        },
        data: {
          status: "QUEUED",
          runToken,
          batchId: runToken,
          qualityScore: null,
          report: Prisma.DbNull,
          startedAt: null,
          checkedAt: null,
          errorCode: null,
        },
      });
    const jobs = await tx.websiteAudit.findMany({
      where: { userId, runToken, placeId: { in: ids }, status: "QUEUED" },
      select: { id: true, runToken: true },
    });
    return { completed: true, jobs };
  });
  const { jobs } = prepared;
  log("audit.batch_queued", {
    searchId: search?.id,
    runId: search?.runId,
    requestedCount: ids.length,
    queuedCount: jobs.length,
    searchCompleted: prepared.completed,
  });
  if (!jobs.length) return prepared.completed;
  try {
    await start(auditWebsites, [
      jobs.map((job) => ({ id: job.id, token: job.runToken })),
    ]);
  } catch {
    log("audit.batch_start_failed", {
      searchId: search?.id,
      runId: search?.runId,
      queuedCount: jobs.length,
      errorCode: "auditQueueError",
    });
    await prisma.websiteAudit.updateMany({
      where: {
        OR: jobs.map((job) => ({ id: job.id, runToken: job.runToken })),
        status: "QUEUED",
      },
      data: {
        status: "FAILED",
        errorCode: "auditQueueError",
        checkedAt: new Date(),
      },
    });
  }
  return prepared.completed;
}

export async function processWebsiteAudit(ticket: AuditTicket) {
  const log = (event: string, details: Record<string, unknown> = {}) =>
    console.info("[lead-audit]", { event, auditId: ticket.id, ...details });
  const where = { id: ticket.id, runToken: ticket.token };
  const audit = await prisma.websiteAudit.findFirst({
    where,
    include: { user: { select: { banned: true } } },
  });
  if (!audit) {
    log("audit.skipped", { reason: "not_found" });
    return "skip";
  }
  if (audit.status !== "QUEUED") {
    log("audit.skipped", { reason: "not_queued", status: audit.status });
    return "skip";
  }
  if (audit.user.banned) {
    await failWebsiteAudit(ticket, "notEditable");
    return "skip";
  }
  const running = { ...where, status: "RUNNING" };
  let claimed = false;
  try {
    return await executeWebsiteAudit(
      audit.placeId,
      {
        auditId: ticket.id,
        claim: () =>
          prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261020, 5)::text`;
            const cutoff = new Date(Date.now() - 120000);
            await tx.websiteAudit.updateMany({
              where: { status: "RUNNING", startedAt: { lt: cutoff } },
              data: {
                status: "FAILED",
                qualityScore: null,
                errorCode: "auditInterrupted",
                checkedAt: new Date(),
              },
            });
            // A cancelled provider call may still be in flight. Keep its slot until
            // this worker exits (or the timeout elapses) to preserve the global limit.
            if (
              (await tx.websiteAudit.count({
                where: {
                  OR: [
                    { status: "RUNNING" },
                    { status: "CANCELLED", startedAt: { gte: cutoff } },
                  ],
                },
              })) >= MAX_PARALLEL_WEBSITE_AUDITS
            )
              return "busy" as const;
            const result = await tx.websiteAudit.updateMany({
              where: { ...where, status: "QUEUED" },
              data: {
                status: "RUNNING",
                startedAt: new Date(),
                errorCode: null,
              },
            });
            claimed = result.count > 0;
            log(claimed ? "audit.started" : "audit.claim_skipped", {
              reason: claimed ? undefined : "state_changed",
            });
            return result.count ? ("claimed" as const) : ("skip" as const);
          }),
        active: async () =>
          Boolean(
            await prisma.websiteAudit.findFirst({
              where: {
                ...running,
                user: { OR: [{ banned: false }, { banned: null }] },
              },
              select: { id: true },
            }),
          ),
        complete: async (report) => {
          const status = report ? "COMPLETED" : "NO_WEBSITE";
          const result = await prisma.websiteAudit.updateMany({
            where: running,
            data: {
              status,
              qualityScore: report?.qualityScore ?? null,
              ...(report ? { report } : {}),
              checkedAt: new Date(),
              errorCode: null,
            },
          });
          log("audit.completed", {
            status,
            visualStatus: report?.visual?.status,
            saved: result.count > 0,
          });
        },
        fail: (code) => {
          log("audit.failed", { errorCode: code });
          return failWebsiteAudit(ticket, code);
        },
      },
      process.env.GOOGLE_PLACES_API_KEY,
      process.env.PAGESPEED_API_KEY,
    );
  } finally {
    if (claimed)
      await prisma.websiteAudit.updateMany({
        where: { ...where, status: "CANCELLED", startedAt: { not: null } },
        data: { startedAt: null },
      });
  }
}

export async function failWebsiteAudit(ticket: AuditTicket, errorCode: string) {
  const result = await prisma.websiteAudit.updateMany({
    where: {
      id: ticket.id,
      runToken: ticket.token,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    data: {
      status: "FAILED",
      qualityScore: null,
      errorCode,
      checkedAt: new Date(),
    },
  });
  console.info("[lead-audit]", {
    event: "audit.failure_persisted",
    auditId: ticket.id,
    errorCode,
    saved: result.count > 0,
  });
}
