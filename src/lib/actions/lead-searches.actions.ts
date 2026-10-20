"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchMutableScope, leadSearchScope, parseLeadSearchInput } from "@/lib/lead-research/search-input";
import { PlacesError, searchGooglePlaces } from "@/lib/lead-research/google-places";

export async function runLeadSearchAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 128) return { success: false as const, error: "notEditable" as const };
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key?.trim()) return { success: false as const, error: "googleNotConfigured" as const };
  const search = await prisma.leadSearch.findFirst({ where: { id, ...leadSearchScope(user) } });
  if (!search) return { success: false as const, error: "notEditable" as const };
  if (search.radiusKm > 50) return { success: false as const, error: "googleRadius" as const };
  const startedAt = new Date();
  const staleBefore = new Date(startedAt.getTime() - 120_000);
  const claim = await prisma.leadSearch.updateMany({
    where: {
      id, ...leadSearchScope(user), updatedAt: search.updatedAt,
      OR: [{ status: { in: ["DRAFT", "FAILED", "COMPLETED"] } }, { status: "RUNNING", updatedAt: { lt: staleBefore } }],
    },
    data: { status: "RUNNING", updatedAt: startedAt },
  });
  if (!claim.count) return { success: false as const, error: "googleBusy" as const };
  const runWhere = { id, status: "RUNNING" as const, updatedAt: startedAt };
  try {
    const result = await searchGooglePlaces(search, key);
    const saved = await prisma.leadSearch.updateMany({
      where: runWhere, data: { status: "COMPLETED", googlePlaceIds: result.results.map((place) => place.id) },
    });
    if (!saved.count) return { success: false as const, error: "googleBusy" as const };
    revalidatePath("/[locale]/lead-research", "page");
    return { success: true as const, ...result };
  } catch (error) {
    await prisma.leadSearch.updateMany({ where: runWhere, data: { status: "FAILED" } });
    revalidatePath("/[locale]/lead-research", "page");
    return { success: false as const, error: error instanceof PlacesError ? error.code : "googleUnavailable" as const };
  }
}

export async function createLeadSearchAction(input: unknown): Promise<
  { success: true } | { success: false; error: "invalidInput" | "saveError" }
> {
  const user = await requireUser();
  const data = parseLeadSearchInput(input);
  if (!data) return { success: false, error: "invalidInput" };

  try {
    await prisma.leadSearch.create({ data: { ...data, userId: user.id, status: "DRAFT" } });
  } catch {
    return { success: false, error: "saveError" };
  }
  revalidatePath("/[locale]/lead-research", "page");
  return { success: true };
}

export async function updateLeadSearchAction(id: unknown, input: unknown): Promise<
  { success: true } | { success: false; error: "invalidInput" | "saveError" | "notEditable" }
> {
  const user = await requireUser();
  const data = parseLeadSearchInput(input);
  const where = leadSearchMutableScope(user, id);
  if (!data || !where) return { success: false, error: "invalidInput" };
  try {
    // Ownership and inactive state are checked in the same query as the write.
    const result = await prisma.leadSearch.updateMany({ where, data: { ...data, status: "DRAFT", googlePlaceIds: [] } });
    if (result.count === 0) return { success: false, error: "notEditable" };
  } catch {
    return { success: false, error: "saveError" };
  }
  revalidatePath("/[locale]/lead-research", "page");
  return { success: true };
}

export async function deleteLeadSearchAction(id: unknown): Promise<
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
  revalidatePath("/[locale]/lead-research", "page");
  return { success: true };
}
