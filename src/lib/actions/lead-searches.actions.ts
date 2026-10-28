"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireUser } from "@/lib/session";
import {
  leadSearchMutableScope,
  leadSearchScope,
  parseLeadSearchInput,
} from "@/lib/lead-research/search-input";
import {
  loadGooglePlaceDetails,
  PlacesError,
} from "@/lib/lead-research/google-places";
import {
  expireSearchJobs,
  processLeadSearchJob,
} from "@/lib/lead-research/search-jobs";
import { SEARCH_JOB_TIMEOUT_MS } from "@/lib/lead-research/run-search-job";
import { queueWebsiteAudits } from "@/lib/lead-research/audit-jobs";

export async function runLeadSearchAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 128)
    return { success: false as const, error: "notEditable" as const };
  const log = (event: string, details: Record<string, unknown> = {}) => console.info("[lead-research]", { event, searchId: id, ...details });
  log("search.start_requested");
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key?.trim()) {
    log("search.start_rejected", { reason: "googleNotConfigured" });
    return { success: false as const, error: "googleNotConfigured" as const };
  }
  await expireSearchJobs(user);
  const search = await prisma.leadSearch.findFirst({
    where: { id, ...leadSearchScope(user) },
  });
  if (!search) {
    log("search.start_rejected", { reason: "notFound" });
    return { success: false as const, error: "notEditable" as const };
  }
  if (search.radiusKm > 50) {
    log("search.start_rejected", { reason: "googleRadius" });
    return { success: false as const, error: "googleRadius" as const };
  }
  const runId = randomUUID();
  const admission = await prisma.$transaction(async (tx) => {
    // Serialize admissions across Vercel instances without holding a transaction during Google calls.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261020, 4)::text`;
    if (
      await tx.websiteAudit.count({
        where: {
          userId: search.userId,
          status: { in: ["QUEUED", "RUNNING", "PAUSED"] },
        },
      })
    )
      return "auditing";
    const active = {
      status: { in: ["QUEUED", "RUNNING"] as ("QUEUED" | "RUNNING")[] },
      startedAt: { gte: new Date(Date.now() - SEARCH_JOB_TIMEOUT_MS) },
    };
    if (
      (await tx.leadSearch.count({
        where: { userId: search.userId, OR: [active, { status: "PAUSED" }] },
      })) > 0
    )
      return "busy";
    if ((await tx.leadSearch.count({ where: active })) >= 3) return "full";
    const claim = await tx.leadSearch.updateMany({
      where: {
        id,
        ...leadSearchScope(user),
        updatedAt: search.updatedAt,
        status: { in: ["DRAFT", "FAILED", "COMPLETED", "CANCELLED"] },
      },
      data: {
        status: "QUEUED",
        runId,
        analyzeWebsites: true,
        startedAt: new Date(),
        finishedAt: null,
        phase: "QUEUED",
        processedPages: 0,
        googlePlaceIds: [],
        pauseRequested: false,
        checkpoint: Prisma.DbNull,
        errorCode: null,
        resultLimit: false,
      },
    });
    return claim.count ? "accepted" : "busy";
  });
  if (admission !== "accepted") {
    log("search.start_rejected", { reason: admission });
    return {
      success: false as const,
      error:
        admission === "auditing"
          ? ("auditBusy" as const)
          : admission === "full"
            ? ("jobCapacity" as const)
            : ("googleBusy" as const),
    };
  }
  log("search.accepted", { runId });
  after(async () => {
    try {
      await processLeadSearchJob(id, runId);
    } catch {
      console.error("Lead search background job interrupted", runId);
    }
  });
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true as const, runId };
}

export async function cancelLeadSearchAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 128)
    return { success: false as const };
  const result = await prisma.leadSearch.updateMany({
    where: {
      id,
      ...leadSearchScope(user),
      status: { in: ["QUEUED", "RUNNING", "PAUSED"] },
    },
    data: {
      status: "CANCELLED",
      phase: "DONE",
      pauseRequested: false,
      finishedAt: new Date(),
    },
  });
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: result.count > 0 };
}

export async function pauseLeadSearchAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 128)
    return { success: false as const };
  const count = await prisma.$transaction(async (tx) => {
    const scope = { id, ...leadSearchScope(user) };
    const queued = await tx.leadSearch.updateMany({
      where: { ...scope, status: "QUEUED" },
      data: { status: "PAUSED", pauseRequested: false },
    });
    const running = await tx.leadSearch.updateMany({
      where: { ...scope, status: "RUNNING" },
      data: { pauseRequested: true },
    });
    return queued.count + running.count;
  });
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: count > 0 };
}

export async function resumeLeadSearchAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 128)
    return { success: false as const };
  if (!process.env.GOOGLE_PLACES_API_KEY?.trim())
    return { success: false as const };
  await expireSearchJobs(user);
  const runId = randomUUID();
  const accepted = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261020, 4)::text`;
    const search = await tx.leadSearch.findFirst({
      where: { id, ...leadSearchScope(user), status: "PAUSED" },
    });
    if (!search) return false;
    const active = {
      status: { in: ["QUEUED", "RUNNING"] as ("QUEUED" | "RUNNING")[] },
    };
    if (
      (await tx.leadSearch.count({
        where: { ...active, userId: search.userId },
      })) ||
      (await tx.leadSearch.count({ where: active })) >= 3
    )
      return false;
    const result = await tx.leadSearch.updateMany({
      where: {
        id,
        ...leadSearchScope(user),
        status: "PAUSED",
        runId: search.runId,
      },
      data: {
        status: "QUEUED",
        runId,
        pauseRequested: false,
        startedAt: new Date(),
        finishedAt: null,
        errorCode: null,
      },
    });
    return result.count > 0;
  });
  if (accepted)
    after(async () => {
      try {
        await processLeadSearchJob(id, runId);
      } catch {
        console.error("Resumed lead search interrupted", runId);
      }
    });
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: accepted };
}

export async function loadLeadSearchResultsAction(
  id: unknown,
  offset: unknown,
) {
  const user = await requireUser();
  if (
    typeof id !== "string" ||
    !id ||
    id.length > 128 ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 60
  )
    return { success: false as const, error: "invalidInput" as const };
  const search = await prisma.leadSearch.findFirst({
    where: {
      id,
      ...leadSearchScope(user),
      status: { in: ["COMPLETED", "FAILED", "CANCELLED", "PAUSED"] },
    },
  });
  if (!search)
    return { success: false as const, error: "notEditable" as const };
  const ids = search.googlePlaceIds.slice(offset, offset + 10);
  if (!ids.length)
    return {
      success: true as const,
      results: [],
      partialError: null,
      resolvedLocation: search.location,
      resultLimit: search.resultLimit,
      nextOffset: offset,
      total: search.googlePlaceIds.length,
      runId: search.runId,
    };
  try {
    if (offset === 0 && search.status === "COMPLETED") {
      // Older results acquire their missing audits without another business search.
      await queueWebsiteAudits(search.userId, search.googlePlaceIds);
      revalidatePath("/[locale]/tools/calem/lead-research", "page");
    }
    const result = await loadGooglePlaceDetails(
      ids,
      process.env.GOOGLE_PLACES_API_KEY,
    );
    return {
      success: true as const,
      ...result,
      resolvedLocation: search.location,
      resultLimit: search.resultLimit,
      nextOffset: offset + result.processedCount,
      total: search.googlePlaceIds.length,
      runId: search.runId,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof PlacesError
          ? error.code
          : ("googleUnavailable" as const),
    };
  }
}

export async function createLeadSearchAction(
  input: unknown,
): Promise<
  { success: true } | { success: false; error: "invalidInput" | "saveError" }
> {
  const user = await requireUser();
  const data = parseLeadSearchInput(input);
  if (!data) return { success: false, error: "invalidInput" };

  try {
    await prisma.leadSearch.create({
      data: {
        ...data,
        analyzeWebsites: true,
        userId: user.id,
        status: "DRAFT",
      },
    });
  } catch {
    return { success: false, error: "saveError" };
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true };
}

export async function updateLeadSearchAction(
  id: unknown,
  input: unknown,
): Promise<
  | { success: true }
  | { success: false; error: "invalidInput" | "saveError" | "notEditable" }
> {
  const user = await requireUser();
  const data = parseLeadSearchInput(input);
  const where = leadSearchMutableScope(user, id);
  if (!data || !where) return { success: false, error: "invalidInput" };
  try {
    // Ownership and inactive state are checked in the same query as the write.
    const result = await prisma.leadSearch.updateMany({
      where,
      data: {
        ...data,
        analyzeWebsites: true,
        status: "DRAFT",
        googlePlaceIds: [],
        runId: null,
        startedAt: null,
        finishedAt: null,
        phase: null,
        processedPages: 0,
        pauseRequested: false,
        checkpoint: Prisma.DbNull,
        errorCode: null,
        resultLimit: false,
      },
    });
    if (result.count === 0) return { success: false, error: "notEditable" };
  } catch {
    return { success: false, error: "saveError" };
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true };
}

export async function deleteLeadSearchAction(
  id: unknown,
): Promise<
  { success: true } | { success: false; error: "deleteError" | "notEditable" }
> {
  const user = await requireUser();
  const where = leadSearchMutableScope(user, id);
  if (!where) return { success: false, error: "notEditable" };
  try {
    const result = await prisma.leadSearch.deleteMany({ where });
    if (result.count === 0) return { success: false, error: "notEditable" };
  } catch {
    return { success: false, error: "deleteError" };
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true };
}
