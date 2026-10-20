import type { LeadSearchInput } from "./search-input";

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

export const GOOGLE_MAX_RESULTS = 60;
export const GOOGLE_MAX_RADIUS_KM = 50;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const RESULT_FIELDS = "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.attributions,nextPageToken";
type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
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

export async function searchGooglePlaces(input: LeadSearchInput, key: string | undefined, fetcher: Fetcher = fetch) {
  if (!key?.trim()) throw new PlacesError("googleNotConfigured");
  if (input.radiusKm > GOOGLE_MAX_RADIUS_KM) throw new PlacesError("googleRadius");

  async function request(body: Record<string, unknown>, fields: string) {
    let response: Response;
    try {
      response = await fetcher(ENDPOINT, {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key!, "X-Goog-FieldMask": fields },
        body: JSON.stringify(body),
      });
    } catch { throw new PlacesError("googleUnavailable"); }
    if (response.status === 429) throw new PlacesError("googleQuota");
    if ([401, 403].includes(response.status)) throw new PlacesError("googleAccess");
    if (!response.ok) throw new PlacesError("googleUnavailable");
    let data: unknown;
    try { data = await response.json(); } catch { throw new PlacesError("googleResponse"); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new PlacesError("googleResponse");
    const result = data as { places?: RawPlace[]; nextPageToken?: unknown };
    if (result.places !== undefined && (!Array.isArray(result.places) || result.places.some((p) => !p || typeof p !== "object"))) throw new PlacesError("googleResponse");
    return result;
  }

  const centerResponse = await request({ textQuery: input.location, pageSize: 1, languageCode: "de" }, "places.location,places.displayName,places.formattedAddress");
  const centerPlace = centerResponse.places?.[0];
  if (!point(centerPlace?.location)) throw new PlacesError("googleLocation");
  const center = centerPlace.location;
  const results: PlaceResult[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | null = null;
  let partialError: PlacesErrorCode | null = null;

  // Circle bias is followed by the user's radius filter, preserving Google's ordering.
  // Up to one location lookup and three business-search requests per explicit run.
  for (let page = 0; page < 3; page++) {
    let data: Awaited<ReturnType<typeof request>>;
    try {
      data = await request({
        textQuery: input.industry, pageSize: Math.min(20, input.maxResults), languageCode: "de",
        locationBias: { circle: { center, radius: input.radiusKm * 1000 } },
        ...(nextPageToken ? { pageToken: nextPageToken } : {}),
      }, RESULT_FIELDS);
    } catch (error) {
      if (!(error instanceof PlacesError) || results.length === 0) throw error;
      partialError = error.code;
      break;
    }
    for (const raw of (data.places ?? []).slice(0, 20)) {
      const id = text(raw.id);
      const name = text(raw.displayName?.text);
      if (!id || !name || seen.has(id) || !point(raw.location) || distanceKm(center, raw.location) > input.radiusKm) continue;
      seen.add(id);
      results.push({
        id, name, address: text(raw.formattedAddress), website: safePlacesUrl(raw.websiteUri), phone: text(raw.nationalPhoneNumber),
        mapsUrl: safePlacesUrl(raw.googleMapsUri) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`,
        attributions: Array.isArray(raw.attributions) ? raw.attributions.flatMap((a) => text(a?.provider) ? [{ name: text(a.provider)!, uri: safePlacesUrl(a.providerUri) }] : []) : [],
      });
      if (results.length >= input.maxResults) break;
    }
    nextPageToken = text(data.nextPageToken);
    if (!nextPageToken || results.length >= input.maxResults) break;
  }
  return {
    results, partialError,
    resolvedLocation: text(centerPlace.formattedAddress) ?? text(centerPlace.displayName?.text) ?? input.location,
    resultLimit: input.maxResults > GOOGLE_MAX_RESULTS || Boolean(nextPageToken && results.length < input.maxResults),
  };
}
