import { PlacesError, searchGooglePlaces, type SearchDiagnosticContext, type SearchProgress, type SearchResume } from "./google-places";
import type { LeadSearchInput } from "./search-input";

export const SEARCH_JOB_TIMEOUT_MS = 120_000;
export type SearchJobStore = {
  claim: () => Promise<boolean>;
  progress: (progress: SearchProgress) => Promise<boolean>;
  complete: (result: { placeIds: string[]; resultLimit: boolean; errorCode: string | null }) => Promise<boolean>;
  fail: (errorCode: string) => Promise<void>;
};
class JobStopped extends Error {}

export async function executeSearchJob(input: LeadSearchInput, key: string | undefined, store: SearchJobStore, provider = searchGooglePlaces, resume?: SearchResume, diagnostics?: SearchDiagnosticContext) {
  const log = (event: string, details: Record<string, unknown> = {}) => {
    if (diagnostics) console.info("[lead-research]", { event, ...diagnostics, ...details });
  };
  if (!await store.claim()) {
    log("search.claim_skipped");
    return;
  }
  log("search.started", { resumed: Boolean(resume) });
  try {
    const result = await provider(input, key, fetch, async (progress) => {
      if (!await store.progress(progress)) throw new JobStopped();
    }, false, resume, diagnostics);
    const completed = await store.complete({ placeIds: result.results.map((place) => place.id), resultLimit: result.resultLimit, errorCode: result.partialError });
    log("search.finished", { acceptedCount: result.results.length, partialError: result.partialError, resultLimit: result.resultLimit, saved: completed });
  } catch (error) {
    if (error instanceof JobStopped) {
      log("search.stopped");
      return;
    }
    const errorCode = error instanceof PlacesError ? error.code : "googleUnavailable";
    log("search.failed", { errorCode });
    await store.fail(errorCode);
  }
}
