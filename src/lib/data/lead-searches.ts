import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { LeadSearchSummary } from "@/lib/lead-research/types";

export async function getLeadSearches(): Promise<LeadSearchSummary[]> {
  const user = await requireUser();
  const searches = await prisma.leadSearch.findMany({
    where: leadSearchScope(user),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true, location: true, industry: true, radiusKm: true, maxResults: true,
      analyzeWebsites: true, status: true, createdAt: true,
      user: { select: { name: true } },
    },
  });
  return searches.map(({ user: author, createdAt, ...search }) => ({
    ...search, authorName: author.name, createdAt: createdAt.toISOString(),
  }));
}
