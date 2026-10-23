"use server";

import { getCurrentSession } from "@/lib/session";
import { createOrganization, OrganizationAccessError } from "./organizations";

export type OrganizationCreationState = { error: "INVALID_INPUT" | "FORBIDDEN" | "CONFLICT" | "UNAUTHENTICATED" | "UNAVAILABLE" | null; slug?: string };

export async function createOrganizationAction(_previous: OrganizationCreationState, formData: FormData): Promise<OrganizationCreationState> {
  const session = await getCurrentSession();
  if (!session) return { error: "UNAUTHENTICATED" };
  const name = formData.get("name"), operationId = formData.get("operationId");
  if (typeof name !== "string" || typeof operationId !== "string") return { error: "INVALID_INPUT" };
  let organization;
  try {
    organization = await createOrganization(session.user.id, name, operationId);
  } catch (error) {
    if (error instanceof OrganizationAccessError && error.code !== "LIMIT_REACHED") return { error: error.code };
    return { error: "UNAVAILABLE" };
  }
  return { error: null, slug: organization.slug };
}
