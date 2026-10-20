import "server-only";
import { prisma } from "@/lib/prisma";
import { executeSearchJob, SEARCH_JOB_TIMEOUT_MS } from "./run-search-job";
import { leadSearchScope } from "./search-input";
import { queueWebsiteAudits } from "./audit-jobs";

export async function expireSearchJobs(user: { id: string; role?: string | null }) {
  const cutoff = new Date(Date.now() - SEARCH_JOB_TIMEOUT_MS);
  await prisma.leadSearch.updateMany({
    where: { ...leadSearchScope(user), status: { in: ["QUEUED", "RUNNING"] }, OR: [{ startedAt: { lt: cutoff } }, { startedAt: null, updatedAt: { lt: cutoff } }] },
    data: { status: "FAILED", phase: "DONE", finishedAt: new Date(), errorCode: "jobInterrupted" },
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
    claim: async () => (await prisma.leadSearch.updateMany({ where: { id, runId, status: "QUEUED" }, data: { status: "RUNNING", phase: "LOCATING" } })).count > 0,
    progress: async (progress) => (await prisma.leadSearch.updateMany({ where, data: { phase: progress.phase, processedPages: progress.processedPages, googlePlaceIds: progress.placeIds } })).count > 0,
    complete: async (result) => {
      return queueWebsiteAudits(search.userId, result.placeIds, { id, runId, resultLimit: result.resultLimit, errorCode: result.errorCode });
    },
    fail: async (errorCode) => { await prisma.leadSearch.updateMany({ where, data: { status: "FAILED", phase: "DONE", errorCode, finishedAt: new Date() } }); },
  });
}
