export const MAX_SEARCH_RESULTS = 2_147_483_647;

export type LeadSearchInput = {
  location: string;
  radiusKm: number;
  industry: string;
  maxResults: number;
  analyzeWebsites: boolean;
};

export function parseLeadSearchInput(input: unknown): LeadSearchInput | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (typeof data.location !== "string" || typeof data.industry !== "string") return null;
  const location = data.location.trim();
  const industry = data.industry.trim();
  if (!location || location.length > 200 || !industry || industry.length > 200) return null;
  if (typeof data.radiusKm !== "number" || !Number.isFinite(data.radiusKm) || data.radiusKm < 0.1 || data.radiusKm > Number.MAX_SAFE_INTEGER) return null;
  if (typeof data.maxResults !== "number" || !Number.isInteger(data.maxResults) || data.maxResults < 1 || data.maxResults > MAX_SEARCH_RESULTS) return null;
  if (typeof data.analyzeWebsites !== "boolean") return null;
  // Whitelist input: ownership and status always come from the server.
  return { location, industry, radiusKm: data.radiusKm, maxResults: data.maxResults, analyzeWebsites: data.analyzeWebsites };
}

export function leadSearchScope(user: { id: string; role?: string | null }) {
  return user.role === "OWNER" ? {} : { userId: user.id };
}

export const MUTABLE_SEARCH_STATUSES = ["DRAFT", "FAILED", "COMPLETED", "CANCELLED"] as const;
export function isLeadSearchMutable(status: string) {
  return MUTABLE_SEARCH_STATUSES.some((value) => value === status);
}

export function leadSearchMutableScope(user: { id: string; role?: string | null }, id: unknown) {
  if (typeof id !== "string" || !id.trim() || id.length > 128) return null;
  return { ...leadSearchScope(user), id, status: { in: [...MUTABLE_SEARCH_STATUSES] } };
}
