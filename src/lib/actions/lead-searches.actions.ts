"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchDraftScope, parseLeadSearchInput } from "@/lib/lead-research/search-input";

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
  const where = leadSearchDraftScope(user, id);
  if (!data || !where) return { success: false, error: "invalidInput" };
  try {
    // Ownership and draft state are checked in the same query as the write.
    const result = await prisma.leadSearch.updateMany({ where, data });
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
  const where = leadSearchDraftScope(user, id);
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
