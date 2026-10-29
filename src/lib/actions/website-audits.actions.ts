"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { WebsiteReport } from "@/lib/lead-research/website-quality";
import { normalizeWebsiteReport } from "@/lib/lead-research/website-rating";
import { loadGooglePlaceDetails, PlacesError } from "@/lib/lead-research/google-places";

export async function getWebsiteReportAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id.trim() || id.length > 128) return { success: false as const };
  const row = await prisma.websiteAudit.findFirst({ where: { id, ...leadSearchScope(user), status: "COMPLETED" }, select: { report: true } });
  if (!row) return { success: false as const };
  return { success: true as const, report: row.report ? normalizeWebsiteReport(row.report as WebsiteReport) : null };
}

export async function loadAuditPlacesAction(ids: unknown) {
  const user = await requireUser();
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10 || !ids.every(id => typeof id === "string" && id.length > 0 && id.length <= 128) || new Set(ids).size !== ids.length) {
    return { success: false as const, error: "invalidInput" as const };
  }
  const rows = await prisma.websiteAudit.findMany({ where: { ...leadSearchScope(user), id: { in: ids } }, select: { id: true, placeId: true, userId: true } });
  if (rows.length !== ids.length) return { success: false as const, error: "notEditable" as const };
  const searches = await prisma.leadSearch.findMany({
    where: { ...leadSearchScope(user), OR: rows.map(row => ({ userId: row.userId, googlePlaceIds: { has: row.placeId } })) },
    orderBy: { updatedAt: "desc" },
    select: { id: true, userId: true, googlePlaceIds: true, location: true, industry: true },
  });
  const sources = Object.fromEntries(rows.flatMap(row => {
    const source = searches.find(search => search.userId === row.userId && search.googlePlaceIds.includes(row.placeId));
    return source ? [[row.id, { searchId: source.id, location: source.location, industry: source.industry }]] : [];
  })) as Record<string, { searchId: string; location: string; industry: string }>;
  try {
    // Display existing results only; never schedule searches or website audits here.
    const result = await loadGooglePlaceDetails([...new Set(rows.map(row => row.placeId))], process.env.GOOGLE_PLACES_API_KEY);
    return { success: true as const, places: result.results, sources, partialError: result.partialError };
  } catch (error) {
    return { success: false as const, error: error instanceof PlacesError ? error.code : "googleUnavailable" as const };
  }
}
