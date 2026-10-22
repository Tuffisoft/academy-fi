import { PlacesError, searchGooglePlaces, type SearchProgress, type SearchResume } from "./google-places";
import type { LeadSearchInput } from "./search-input";

export const SEARCH_JOB_TIMEOUT_MS = 120_000;
export type SearchJobStore = {
  claim: () => Promise<boolean>;
  progress: (progress: SearchProgress) => Promise<boolean>;
  complete: (result: { placeIds: string[]; resultLimit: boolean; errorCode: string | null }) => Promise<boolean>;
  fail: (errorCode: string) => Promise<void>;
};
class JobStopped extends Error {}

export async function executeSearchJob(input: LeadSearchInput, key: string | undefined, store: SearchJobStore, provider = searchGooglePlaces, resume?: SearchResume) {
  if (!await store.claim()) return;
  try {
    const result = await provider(input, key, fetch, async (progress) => {
      if (!await store.progress(progress)) throw new JobStopped();
    }, false, resume);
    await store.complete({ placeIds: result.results.map((place) => place.id), resultLimit: result.resultLimit, errorCode: result.partialError });
  } catch (error) {
    if (error instanceof JobStopped) return;
    await store.fail(error instanceof PlacesError ? error.code : "googleUnavailable");
  }
}
