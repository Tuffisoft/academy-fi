import { AREA_SEARCH_CANDIDATE_MULTIPLIER, MAX_AREA_SEARCH_CANDIDATES, isAreaSearch, type LeadSearchInput } from "./search-input";

export type PlaceResult = {
  id: string;
  name: string;
  address: string | null;
  website: string | null;
  phone: string | null;
  mapsUrl: string;
  attributions: { name: string; uri: string | null }[];
};

export type PlacesErrorCode = "googleNotConfigured" | "googleRadius" | "googleLocation" | "googleQuota" | "googleAccess" | "googleUnavailable" | "googleResponse";
export class PlacesError extends Error {
  constructor(public readonly code: PlacesErrorCode) { super(code); }
}

export const GOOGLE_MAX_RESULTS = MAX_AREA_SEARCH_CANDIDATES;
export const GOOGLE_MAX_RADIUS_KM = 50;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const RESULT_FIELDS = "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.attributions,nextPageToken";
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type SearchCheckpoint = { center: Point; nextPageToken: string | null; done: boolean };
export type SearchResume = { checkpoint: SearchCheckpoint | null; processedPages: number; placeIds: string[] };
export type SearchProgress = { phase: "LOCATING" | "SEARCHING"; processedPages: number; placeIds: string[]; checkpoint?: SearchCheckpoint };
export type SearchDiagnosticContext = { searchId: string; runId: string };
type Point = { latitude: number; longitude: number };
type RawPlace = {
  id?: unknown; displayName?: { text?: unknown }; formattedAddress?: unknown;
  location?: Point; websiteUri?: unknown; nationalPhoneNumber?: unknown; googleMapsUri?: unknown;
  attributions?: { provider?: unknown; providerUri?: unknown }[];
};

function point(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const p = value as Point;
  return Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 && Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180;
}

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
export function safePlacesUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function distanceKm(a: Point, b: Point) {
  const radians = (value: number) => value * Math.PI / 180;
  const dlat = radians(b.latitude - a.latitude);
  const dlon = radians(b.longitude - a.longitude);
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export async function searchGooglePlaces(input: LeadSearchInput, key: string | undefined, fetcher: Fetcher = fetch, onProgress?: (progress: SearchProgress) => Promise<void>, includeContactDetails = true, resume?: SearchResume, diagnostics?: SearchDiagnosticContext) {
  if (!key?.trim()) throw new PlacesError("googleNotConfigured");
  if (input.radiusKm > GOOGLE_MAX_RADIUS_KM) throw new PlacesError("googleRadius");
  const areaSearch = isAreaSearch(input.industry);
  const candidateLimit = areaSearch ? Math.min(input.maxResults * AREA_SEARCH_CANDIDATE_MULTIPLIER, GOOGLE_MAX_RESULTS) : input.maxResults;
  const textQuery = areaSearch ? "local businesses" : input.industry;
  const languageCode = areaSearch ? "en" : "de";
  const log = (event: string, details: Record<string, unknown> = {}) => {
    if (diagnostics) console.info("[lead-research]", { event, ...diagnostics, ...details });
  };

  async function request(body: Record<string, unknown>, fields: string, requestType: "location" | "business") {
    let response: Response;
    try {
      response = await fetcher(ENDPOINT, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key!, "X-Goog-FieldMask": fields },
        body: JSON.stringify(body),
      });
    } catch {
      log("google.request_failed", { requestType, reason: "network" });
      throw new PlacesError("googleUnavailable");
    }
    if (!response.ok) {
      log("google.request_failed", { requestType, status: response.status });
      if (response.status === 429) throw new PlacesError("googleQuota");
      if ([401, 403].includes(response.status)) throw new PlacesError("googleAccess");
      throw new PlacesError("googleUnavailable");
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      log("google.invalid_response", { requestType, reason: "json" });
      throw new PlacesError("googleResponse");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      log("google.invalid_response", { requestType, reason: "shape" });
      throw new PlacesError("googleResponse");
    }
    const result = data as { places?: RawPlace[]; nextPageToken?: unknown };
    if (result.places !== undefined && (!Array.isArray(result.places) || result.places.some((p) => !p || typeof p !== "object"))) {
      log("google.invalid_response", { requestType, reason: "places" });
      throw new PlacesError("googleResponse");
    }
    log("google.response", { requestType, status: response.status, returnedCount: result.places?.length ?? 0, hasNextPage: Boolean(result.nextPageToken) });
    return result;
  }

  if (resume && includeContactDetails) throw new PlacesError("googleResponse");
  let centerPlace: RawPlace | undefined;
  let center = resume?.checkpoint?.center;
  if (!center) {
    await onProgress?.({ phase: "LOCATING", processedPages: 0, placeIds: [] });
    const centerResponse = await request({ textQuery: input.location, pageSize: 1, languageCode }, "places.location,places.displayName,places.formattedAddress", "location");
    centerPlace = centerResponse.places?.[0];
    if (!point(centerPlace?.location)) {
      log("search.location_not_resolved", { returnedCount: centerResponse.places?.length ?? 0, hasCoordinates: false });
      throw new PlacesError("googleLocation");
    }
    center = centerPlace.location;
  }
  const results: PlaceResult[] = (resume?.placeIds ?? []).map(id => ({ id, name: "", address: null, website: null, phone: null, mapsUrl: `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(id)}`, attributions: [] }));
  const seen = new Set(results.map(result => result.id));
  let nextPageToken: string | null = resume?.checkpoint?.nextPageToken ?? null;
  const startPage = resume?.processedPages ?? 0;
  let processedPageCount = startPage;
  let partialError: PlacesErrorCode | null = null;
  await onProgress?.({ phase: "SEARCHING", processedPages: startPage, placeIds: results.map(result => result.id), checkpoint: { center, nextPageToken, done: resume?.checkpoint?.done ?? false } });

  // Circle bias is followed by the user's radius filter, preserving Google's ordering.
  // Up to one location lookup and three business-search requests per explicit run.
  for (let page = startPage; page < 3 && results.length < candidateLimit && !resume?.checkpoint?.done; page++) {
    let data: Awaited<ReturnType<typeof request>>;
    try {
      data = await request({
        textQuery, pageSize: Math.min(20, candidateLimit), languageCode,
        locationBias: { circle: { center, radius: input.radiusKm * 1000 } },
        ...(nextPageToken ? { pageToken: nextPageToken } : {}),
      }, includeContactDetails ? RESULT_FIELDS : "places.id,places.displayName,places.location,nextPageToken", "business");
    } catch (error) {
      if (!(error instanceof PlacesError) || results.length === 0) throw error;
      partialError = error.code;
      log("search.partial_error", { page: page + 1, errorCode: error.code, acceptedCount: results.length });
      break;
    }
    const pageCounts = { returnedCount: data.places?.length ?? 0, missingId: 0, missingName: 0, duplicate: 0, invalidLocation: 0, outsideRadius: 0, accepted: 0 };
    for (const raw of (data.places ?? []).slice(0, 20)) {
      const id = text(raw.id);
      const name = text(raw.displayName?.text);
      if (!id) { pageCounts.missingId++; continue; }
      if (!name) { pageCounts.missingName++; continue; }
      if (seen.has(id)) { pageCounts.duplicate++; continue; }
      if (!point(raw.location)) { pageCounts.invalidLocation++; continue; }
      if (distanceKm(center, raw.location) > input.radiusKm) { pageCounts.outsideRadius++; continue; }
      seen.add(id);
      pageCounts.accepted++;
      results.push({
        id, name, address: text(raw.formattedAddress), website: safePlacesUrl(raw.websiteUri), phone: text(raw.nationalPhoneNumber),
        mapsUrl: safePlacesUrl(raw.googleMapsUri) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`,
        attributions: Array.isArray(raw.attributions) ? raw.attributions.flatMap((a) => text(a?.provider) ? [{ name: text(a.provider)!, uri: safePlacesUrl(a.providerUri) }] : []) : [],
      });
      if (results.length >= candidateLimit) break;
    }
    nextPageToken = text(data.nextPageToken);
    processedPageCount = page + 1;
    log("search.page_processed", { page: page + 1, ...pageCounts, totalAccepted: results.length, hasNextPage: Boolean(nextPageToken) });
    await onProgress?.({ phase: "SEARCHING", processedPages: page + 1, placeIds: results.map((result) => result.id), checkpoint: { center, nextPageToken, done: !nextPageToken || results.length >= candidateLimit || page === 2 } });
    if (!nextPageToken || results.length >= candidateLimit) break;
  }
  const resultLimit = areaSearch
    ? Boolean(nextPageToken && (results.length >= candidateLimit || processedPageCount >= 3))
    : input.maxResults > GOOGLE_MAX_RESULTS || Boolean(nextPageToken && results.length < candidateLimit);
  log("search.completed", { processedPages: processedPageCount, acceptedCount: results.length, requestedResultCount: input.maxResults, candidateLimit, areaSearch, partialError, resultLimit });
  return {
    results, partialError,
    resolvedLocation: text(centerPlace?.formattedAddress) ?? text(centerPlace?.displayName?.text) ?? input.location,
    resultLimit,
  };
}

export async function loadGooglePlaceDetails(ids: string[], key: string | undefined, fetcher: Fetcher = fetch): Promise<{ results: PlaceResult[]; partialError: PlacesErrorCode | null; processedCount: number }> {
  if (!key?.trim()) throw new PlacesError("googleNotConfigured");
  const results: PlaceResult[] = [];
  let partialError: PlacesErrorCode | null = null;
  let processedCount = 0;
  const fields = "id,displayName,formattedAddress,websiteUri,nationalPhoneNumber,googleMapsUri,attributions";
  // Batches of three, at most ten explicitly requested Places Details calls.
  for (let offset = 0; offset < Math.min(ids.length, 10); offset += 3) {
    const batch = await Promise.all(ids.slice(offset, Math.min(offset + 3, 10)).map(async (id) => {
      try {
        const response = await fetcher(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
          method: "GET", cache: "no-store", signal: AbortSignal.timeout(10000),
          headers: { "X-Goog-Api-Key": key!, "X-Goog-FieldMask": fields },
        });
        if (!response.ok) throw new PlacesError(response.status === 429 ? "googleQuota" : [401, 403].includes(response.status) ? "googleAccess" : "googleUnavailable");
        const raw = await response.json() as RawPlace;
        const name = text(raw?.displayName?.text);
        if (!name || raw.id !== id) throw new PlacesError("googleResponse");
        return { place: {
          id, name, address: text(raw.formattedAddress), website: safePlacesUrl(raw.websiteUri), phone: text(raw.nationalPhoneNumber),
          mapsUrl: safePlacesUrl(raw.googleMapsUri) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`,
          attributions: Array.isArray(raw.attributions) ? raw.attributions.flatMap((a) => text(a?.provider) ? [{ name: text(a.provider)!, uri: safePlacesUrl(a.providerUri) }] : []) : [],
        } satisfies PlaceResult, error: null };
      } catch (error) { return { place: null, error: error instanceof PlacesError ? error.code : "googleUnavailable" as const }; }
    }));
    for (const item of batch) {
      if (item.place) results.push(item.place);
      if (item.error) partialError = item.error;
    }
    processedCount += batch.length;
    if (partialError === "googleQuota" || partialError === "googleAccess") break;
  }
  if (results.length === 0 && partialError) throw new PlacesError(partialError);
  return { results, partialError, processedCount };
}
