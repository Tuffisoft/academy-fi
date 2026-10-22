import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAcademyUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { SavedLeadSummary } from "@/lib/lead-research/types";

export async function getSavedLeads(): Promise<SavedLeadSummary[]> {
  const user = await requireAcademyUser();
  const leads = await prisma.savedLead.findMany({
    where: leadSearchScope(user), orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, userId: true, placeId: true, sourceSearchId: true, createdAt: true, user: { select: { name: true } }, sourceSearch: { select: { location: true, industry: true } } },
  });
  return leads.map(({ user: author, sourceSearch, createdAt, ...lead }) => ({ ...lead, authorName: author.name, location: sourceSearch?.location ?? null, industry: sourceSearch?.industry ?? null, createdAt: createdAt.toISOString() }));
}
