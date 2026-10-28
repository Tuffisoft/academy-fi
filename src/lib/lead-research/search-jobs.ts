import "server-only";
import { prisma } from "@/lib/prisma";
import { executeSearchJob, SEARCH_JOB_TIMEOUT_MS } from "./run-search-job";
import { leadSearchScope } from "./search-input";
import { queueWebsiteAudits } from "./audit-jobs";
import type { SearchCheckpoint } from "./google-places";

export async function expireSearchJobs(user: { id: string; role?: string | null }) {
  const cutoff = new Date(Date.now() - SEARCH_JOB_TIMEOUT_MS);
  await prisma.leadSearch.updateMany({
    where: { ...leadSearchScope(user), status: { in: ["QUEUED", "RUNNING"] }, pauseRequested: true, updatedAt: { lt: new Date(Date.now() - 20_000) } },
    data: { status: "PAUSED", pauseRequested: false },
  });
  await prisma.leadSearch.updateMany({
    where: { ...leadSearchScope(user), status: { in: ["QUEUED", "RUNNING"] }, pauseRequested: false, OR: [{ startedAt: { lt: cutoff } }, { startedAt: null, updatedAt: { lt: cutoff } }] },
    data: { status: "FAILED", phase: "DONE", pauseRequested: false, finishedAt: new Date(), errorCode: "jobInterrupted" },
  });
}

export async function processLeadSearchJob(id: string, runId: string) {
  const search = await prisma.leadSearch.findFirst({ where: { id, runId, status: "QUEUED" }, include: { user: { select: { banned: true } } } });
  if (!search) return;
  const where = { id, runId, status: "RUNNING" as const };
  if (search.user.banned) {
    await prisma.leadSearch.updateMany({ where: { id, runId, status: "QUEUED" }, data: { status: "FAILED", phase: "DONE", errorCode: "notEditable", finishedAt: new Date() } });
    return;
  }
  await executeSearchJob(search, process.env.GOOGLE_PLACES_API_KEY, {
    claim: async () => (await prisma.leadSearch.updateMany({ where: { id, runId, status: "QUEUED" }, data: { status: "RUNNING", phase: search.checkpoint ? "SEARCHING" : "LOCATING" } })).count > 0,
    progress: (progress) => prisma.$transaction(async (tx) => {
      const saved = await tx.leadSearch.updateMany({ where, data: { phase: progress.phase, processedPages: progress.processedPages, googlePlaceIds: progress.placeIds, ...(progress.checkpoint ? { checkpoint: progress.checkpoint } : {}) } });
      if (!saved.count) return false;
      const paused = await tx.leadSearch.updateMany({ where: { ...where, pauseRequested: true }, data: { status: "PAUSED", pauseRequested: false } });
      return !paused.count;
    }),
    complete: async (result) => {
      return queueWebsiteAudits(search.userId, result.placeIds, { id, runId, resultLimit: result.resultLimit, errorCode: result.errorCode });
    },
    fail: async (errorCode) => { await prisma.leadSearch.updateMany({ where, data: { status: "FAILED", phase: "DONE", pauseRequested: false, errorCode, finishedAt: new Date() } }); },
  }, undefined, { checkpoint: search.checkpoint as SearchCheckpoint | null, processedPages: search.processedPages, placeIds: search.googlePlaceIds }, { searchId: id, runId });
}
