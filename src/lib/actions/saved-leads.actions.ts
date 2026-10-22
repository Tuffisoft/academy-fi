"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import {
  loadGooglePlaceDetails,
  PlacesError,
} from "@/lib/lead-research/google-places";
import { queueWebsiteAudits } from "@/lib/lead-research/audit-jobs";

function validId(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= 512
  );
}

export async function saveLeadAction(searchId: unknown, placeId: unknown) {
  const user = await requireUser();
  if (!validId(searchId) || !validId(placeId))
    return { success: false as const, error: "invalidInput" as const };
  const search = await prisma.leadSearch.findFirst({
    where: {
      id: searchId,
      ...leadSearchScope(user),
      googlePlaceIds: { has: placeId },
    },
    select: { id: true },
  });
  if (!search)
    return { success: false as const, error: "notEditable" as const };
  try {
    await prisma.savedLead.upsert({
      where: { userId_placeId: { userId: user.id, placeId } },
      create: { userId: user.id, placeId, sourceSearchId: search.id },
      update: {},
    });
  } catch {
    return { success: false as const, error: "savedLeadError" as const };
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true as const };
}

export async function removeSavedLeadAction(id: unknown) {
  const user = await requireUser();
  if (!validId(id))
    return { success: false as const, error: "invalidInput" as const };
  try {
    const result = await prisma.savedLead.deleteMany({
      where: { id, ...leadSearchScope(user) },
    });
    if (!result.count)
      return { success: false as const, error: "notEditable" as const };
  } catch {
    return { success: false as const, error: "savedLeadError" as const };
  }
  revalidatePath("/[locale]/tools/calem/lead-research", "page");
  return { success: true as const };
}

export async function loadSavedLeadDetailsAction(ids: unknown) {
  const user = await requireUser();
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > 10 ||
    !ids.every(validId) ||
    new Set(ids).size !== ids.length
  )
    return { success: false as const, error: "invalidInput" as const };
  const leads = await prisma.savedLead.findMany({
    where: { id: { in: ids }, ...leadSearchScope(user) },
    select: { id: true, userId: true, placeId: true },
  });
  if (leads.length !== ids.length)
    return { success: false as const, error: "notEditable" as const };
  const lookup = new Map(leads.map((lead) => [lead.id, lead.placeId]));
  try {
    for (const ownerId of new Set(leads.map((lead) => lead.userId)))
      await queueWebsiteAudits(
        ownerId,
        leads
          .filter((lead) => lead.userId === ownerId)
          .map((lead) => lead.placeId),
      );
    revalidatePath("/[locale]/tools/calem/lead-research", "page");
    const result = await loadGooglePlaceDetails(
      [...new Set(ids.map((id) => lookup.get(id)!))],
      process.env.GOOGLE_PLACES_API_KEY,
    );
    return {
      success: true as const,
      results: result.results,
      partialError: result.partialError,
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
