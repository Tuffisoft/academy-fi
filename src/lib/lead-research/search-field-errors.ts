import type { ZodIssue } from "zod";
import { isAreaSearch, MAX_AREA_SEARCH_RESULTS, MAX_LOCATION_LENGTH, MAX_SEARCH_RADIUS_KM, MAX_SEARCH_RESULTS } from "./search-input";

export type SearchFieldError = { key: string; values?: { max?: number; min?: number } };

export function searchFieldErrors(input: Record<string, unknown>, issues: ZodIssue[]): Record<string, SearchFieldError> {
  const errors: Record<string, SearchFieldError> = {};
  for (const field of ["location", "industry", "radiusKm", "maxResults"]) {
    if (input[field] === undefined || input[field] === null || String(input[field]).trim() === "") {
      errors[field] = { key: `${field}Required` };
    }
  }
  for (const issue of issues) {
    const field = String(issue.path[0]);
    if (errors[field]) continue;
    if (field === "location" || field === "industry") {
      errors[field] = issue.code === "too_small"
        ? { key: `${field}Required` }
        : { key: "textTooLong", values: { max: field === "location" ? MAX_LOCATION_LENGTH : 200 } };
    } else if (field === "radiusKm" || field === "maxResults") {
      const value = Number(input[field]);
      const max = field === "radiusKm" ? MAX_SEARCH_RADIUS_KM : isAreaSearch(String(input.industry)) ? MAX_AREA_SEARCH_RESULTS : MAX_SEARCH_RESULTS;
      const min = field === "radiusKm" ? 0.1 : 1;
      errors[field] = !Number.isFinite(value) ? { key: "numberInvalid" }
        : value > max ? { key: "numberTooLarge", values: { max } }
        : value < min ? { key: "numberTooSmall", values: { min } }
        : field === "maxResults" && !Number.isInteger(value) ? { key: "numberWhole" }
        : { key: "numberInvalid" };
    }
  }
  return errors;
}
