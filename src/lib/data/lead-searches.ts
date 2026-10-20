import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { expireSearchJobs } from "@/lib/lead-research/search-jobs";

export async function getLeadSearches(): Promise<LeadSearchSummary[]> {
  const user = await requireUser();
  await expireSearchJobs(user);
  const searches = await prisma.leadSearch.findMany({
    where: leadSearchScope(user),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true, userId: true, location: true, industry: true, radiusKm: true, maxResults: true,
      analyzeWebsites: true, status: true, createdAt: true, googlePlaceIds: true,
      runId: true, startedAt: true, finishedAt: true, phase: true, processedPages: true, errorCode: true, resultLimit: true,
      user: { select: { name: true } },
    },
  });
  return searches.map(({ user: author, createdAt, startedAt, finishedAt, googlePlaceIds, ...search }) => ({
    ...search, authorName: author.name, resultCount: googlePlaceIds.length, createdAt: createdAt.toISOString(), startedAt: startedAt?.toISOString() ?? null, finishedAt: finishedAt?.toISOString() ?? null,
  }));
}
