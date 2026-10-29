import { z } from "zod";

export const MAX_LOCATION_LENGTH = 20;
export const MAX_SEARCH_RESULTS = 2_147_483_647;
export const AREA_SEARCH_TERM = "__area_search__";
export const MAX_AREA_SEARCH_RESULTS = 20;
export const MAX_AREA_SEARCH_CANDIDATES = 60;
export const AREA_SEARCH_CANDIDATE_MULTIPLIER = 3;

export function isAreaSearch(industry: string) {
  return industry === AREA_SEARCH_TERM;
}

export const leadSearchInputSchema = z.object({
  location: z.string().trim().min(1).max(MAX_LOCATION_LENGTH),
  radiusKm: z.number().min(0.1).max(Number.MAX_SAFE_INTEGER),
  industry: z.string().trim().min(1).max(200),
  maxResults: z.number().int().min(1).max(MAX_SEARCH_RESULTS),
  analyzeWebsites: z.boolean(),
}).refine(data => !isAreaSearch(data.industry) || data.maxResults <= MAX_AREA_SEARCH_RESULTS, {
  path: ["maxResults"],
  message: "areaResultsInvalid",
});

export type LeadSearchInput = z.infer<typeof leadSearchInputSchema>;

export function parseLeadSearchInput(input: unknown): LeadSearchInput | null {
  // Whitelist input: ownership and status always come from the server.
  const result = leadSearchInputSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function leadSearchScope(user: { id: string; role?: string | null }) {
  return user.role === "OWNER" ? {} : { userId: user.id };
}

export const MUTABLE_SEARCH_STATUSES = [
  "DRAFT",
  "FAILED",
  "COMPLETED",
  "CANCELLED",
] as const;
export function isLeadSearchMutable(status: string) {
  return MUTABLE_SEARCH_STATUSES.some((value) => value === status);
}

export function leadSearchMutableScope(
  user: { id: string; role?: string | null },
  id: unknown,
) {
  if (typeof id !== "string" || !id.trim() || id.length > 128) return null;
  return {
    ...leadSearchScope(user),
    id,
    status: { in: [...MUTABLE_SEARCH_STATUSES] },
  };
}
