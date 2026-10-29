import { loadGooglePlaceDetails, PlacesError } from "./google-places";
import { businessIsInactive, leadSuitability } from "./place-signals";
import {
  inspectWebsite,
  QualityError,
  type WebsiteReport,
} from "./website-quality";

export type AuditStore = {
  auditId?: string;
  claim: () => Promise<"claimed" | "busy" | "skip">;
  active: () => Promise<boolean>;
  complete: (report: WebsiteReport | null, skipReason?: "INACTIVE" | "LOW_RATING") => Promise<void>;
  fail: (code: string) => Promise<void>;
};
export async function executeWebsiteAudit(
  placeId: string,
  store: AuditStore,
  placesKey?: string,
  pageSpeedKey?: string,
  details = loadGooglePlaceDetails,
  inspect = inspectWebsite,
) {
  let stage = "google_place_details";
  const claim = await store.claim();
  if (claim !== "claimed") return claim;
  try {
    const result = await details([placeId], placesKey);
    if (!(await store.active())) return "skip";
    const place = result.results.find((item) => item.id === placeId);
    if (!place) throw new QualityError("auditUnavailable");
    if (businessIsInactive(place)) {
      await store.complete(null, "INACTIVE");
      return "done";
    }
    if (leadSuitability(place) === "unusable") {
      await store.complete(null, "LOW_RATING");
      return "done";
    }
    if (!place.website) {
      await store.complete(null);
      return "done";
    }
    stage = "website_inspection";
    const report = await inspect(place.website, pageSpeedKey, undefined, {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_DESIGN_MODEL,
      active: store.active,
      auditId: store.auditId,
    });
    if (await store.active()) await store.complete(report);
  } catch (error) {
    const errorCode =
      error instanceof QualityError || error instanceof PlacesError
        ? error.code
        : "auditUnavailable";
    console.warn("[lead-audit]", {
      event: "audit.processing_failed",
      auditId: store.auditId,
      stage,
      errorCode,
      reason:
        error instanceof QualityError
          ? error.reason
          : error instanceof Error
            ? error.name
            : "unknown",
    });
    await store.fail(errorCode);
  }
  return "done";
}
