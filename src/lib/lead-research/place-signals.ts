export const BUSINESS_STATUSES = ["OPERATIONAL", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "FUTURE_OPENING"] as const;
export type BusinessStatus = typeof BUSINESS_STATUSES[number];
export const DEFAULT_MINIMUM_GOOGLE_STARS = 3;
export type PlaceSignals = {
  businessStatus?: BusinessStatus | null;
  primaryType?: string | null;
  category?: string | null;
  rating?: number | null;
};
export type RawPlaceSignals = {
  businessStatus?: unknown;
  primaryType?: unknown;
  primaryTypeDisplayName?: { text?: unknown };
  rating?: unknown;
};

export function parsePlaceSignals(raw: RawPlaceSignals): PlaceSignals {
  return {
    businessStatus: BUSINESS_STATUSES.includes(raw.businessStatus as BusinessStatus) ? raw.businessStatus as BusinessStatus : null,
    primaryType: typeof raw.primaryType === "string" && raw.primaryType.trim() ? raw.primaryType : null,
    category: typeof raw.primaryTypeDisplayName?.text === "string" && raw.primaryTypeDisplayName.text.trim() ? raw.primaryTypeDisplayName.text : null,
    rating: typeof raw.rating === "number" && Number.isFinite(raw.rating) && raw.rating >= 1 && raw.rating <= 5 ? raw.rating : null,
  };
}

export function businessIsInactive(place: PlaceSignals) {
  return place.businessStatus === "CLOSED_PERMANENTLY" || place.businessStatus === "CLOSED_TEMPORARILY" || place.businessStatus === "FUTURE_OPENING";
}

export type PlaceSort = "default" | "status" | "starsHigh" | "starsLow";
export type LeadSuitability = "usable" | "review" | "unusable";
export function leadSuitability(place: PlaceSignals, minimumStars = DEFAULT_MINIMUM_GOOGLE_STARS): LeadSuitability {
  const rating = parsePlaceSignals(place).rating;
  if (place.businessStatus === "CLOSED_PERMANENTLY" || (rating != null && rating < minimumStars)) return "unusable";
  if (place.businessStatus !== "OPERATIONAL" || rating == null) return "review";
  return "usable";
}
export function matchesPlaceSignals(place: PlaceSignals, status: string, minimumStars: number) {
  return (status === "all" || (place.businessStatus ?? "UNKNOWN") === status) &&
    leadSuitability(place, minimumStars) !== "unusable";
}
export function comparePlaceSignals(a: PlaceSignals, b: PlaceSignals, sort: PlaceSort) {
  if (sort === "status") {
    const rank = (place: PlaceSignals) => place.businessStatus === "OPERATIONAL" ? 0 : !place.businessStatus ? 1 : place.businessStatus === "CLOSED_TEMPORARILY" ? 2 : place.businessStatus === "FUTURE_OPENING" ? 3 : 4;
    return rank(a) - rank(b);
  }
  if (sort === "starsHigh" || sort === "starsLow") {
    const first = parsePlaceSignals(a).rating;
    const second = parsePlaceSignals(b).rating;
    if (first == null) return second == null ? 0 : 1;
    if (second == null) return -1;
    return sort === "starsHigh" ? second - first : first - second;
  }
  return 0;
}
