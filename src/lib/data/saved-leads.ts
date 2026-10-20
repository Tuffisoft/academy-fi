import "server-only";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { SavedLeadSummary } from "@/lib/lead-research/types";

export async function getSavedLeads(): Promise<SavedLeadSummary[]> {
  const user = await requireUser();
  const leads = await prisma.savedLead.findMany({
    where: leadSearchScope(user), orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, userId: true, placeId: true, sourceSearchId: true, createdAt: true, user: { select: { name: true } } },
  });
  return leads.map(({ user: author, createdAt, ...lead }) => ({ ...lead, authorName: author.name, createdAt: createdAt.toISOString() }));
}
