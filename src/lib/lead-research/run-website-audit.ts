import { loadGooglePlaceDetails, PlacesError } from "./google-places";
import { inspectWebsite, QualityError, type WebsiteReport } from "./website-quality";

export type AuditStore = {
  claim: () => Promise<"claimed" | "busy" | "skip">;
  active: () => Promise<boolean>;
  complete: (report: WebsiteReport | null) => Promise<void>;
  fail: (code: string) => Promise<void>;
};
export async function executeWebsiteAudit(placeId: string, store: AuditStore, placesKey?: string, pageSpeedKey?: string, details = loadGooglePlaceDetails, inspect = inspectWebsite) {
  const claim = await store.claim();
  if (claim !== "claimed") return claim;
  try {
    const result = await details([placeId], placesKey);
    if (!await store.active()) return "skip";
    const place = result.results.find((item) => item.id === placeId);
    if (!place) throw new QualityError("auditUnavailable");
    if (!place.website) { await store.complete(null); return "done"; }
    const report = await inspect(place.website, pageSpeedKey);
    if (await store.active()) await store.complete(report);
  } catch (error) {
    await store.fail(error instanceof QualityError || error instanceof PlacesError ? error.code : "auditUnavailable");
  }
  return "done";
}
