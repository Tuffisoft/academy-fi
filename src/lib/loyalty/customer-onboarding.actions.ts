"use server";

import { getCurrentSession } from "@/lib/session";
import { createCustomerOrganization, CustomerAccountError } from "./customer-account";
import type { OrganizationCreationState } from "./portal.actions";

export async function createCustomerOrganizationAction(_previous: OrganizationCreationState, form: FormData): Promise<OrganizationCreationState> {
  const session = await getCurrentSession();
  if (!session) return { error: "UNAUTHENTICATED" };
  const name = form.get("name"), operationId = form.get("operationId");
  if (typeof name !== "string" || typeof operationId !== "string") return { error: "INVALID_INPUT" };
  try {
    return { error: null, ...await createCustomerOrganization(session.user.id, name, operationId) };
  } catch (error) {
    if (error instanceof CustomerAccountError && (error.code === "INVALID_INPUT" || error.code === "FORBIDDEN" || error.code === "CONFLICT")) return { error: error.code };
    return { error: "UNAVAILABLE" };
  }
}
