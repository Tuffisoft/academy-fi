import assert from "node:assert/strict";
import { test } from "node:test";
import { executeSearchJob, type SearchJobStore } from "../src/lib/lead-research/run-search-job";
import { PlacesError, type searchGooglePlaces } from "../src/lib/lead-research/google-places";

const input = { location: "Kiel", industry: "Bäckereien", radiusKm: 10, maxResults: 20, analyzeWebsites: true };
const result: Awaited<ReturnType<typeof searchGooglePlaces>> = {
  results: [{ id: "place-1", name: "Never persist this name", address: "Private fixture address", website: "https://example.com/", phone: "123", mapsUrl: "https://maps.google.com/", attributions: [] }],
  resolvedLocation: "Never persist this location", partialError: null, resultLimit: false,
};

function store(overrides: Partial<SearchJobStore> = {}): SearchJobStore {
  return { claim: async () => true, progress: async () => true, complete: async () => true, fail: async () => {}, ...overrides };
}

test("a cancelled or already claimed job never starts a Google request", async () => {
  let calls = 0;
  await executeSearchJob(input, "key", store({ claim: async () => false }), async () => { calls++; return result; });
  assert.equal(calls, 0);
});

test("one queued job can be claimed only once even with concurrent worker delivery", async () => {
  let claimed = false;
  let calls = 0;
  const data = store({ claim: async () => { if (claimed) return false; claimed = true; return true; } });
  const provider = async () => { calls++; return result; };
  await Promise.all([executeSearchJob(input, "key", data, provider), executeSearchJob(input, "key", data, provider)]);
  assert.equal(calls, 1);
});

test("worker stores only place references and internal progress, never Google business data", async () => {
  let saved: unknown;
  await executeSearchJob(input, "key", store({ complete: async (data) => { saved = data; return true; } }), async (_input, _key, _fetch, onProgress, includeContacts) => {
    assert.equal(includeContacts, false);
    await onProgress?.({ phase: "SEARCHING", processedPages: 1, placeIds: ["place-1"] });
    return result;
  });
  assert.deepEqual(saved, { placeIds: ["place-1"], resultLimit: false, errorCode: null });
  assert.ok(!JSON.stringify(saved).includes("Never persist"));
});

test("cancellation during progress stops further Google work without overwriting the cancelled status", async () => {
  let nextRequest = false;
  let completed = false;
  let failed = false;
  await executeSearchJob(input, "key", store({ progress: async () => false, complete: async () => { completed = true; return true; }, fail: async () => { failed = true; } }), async (_input, _key, _fetch, onProgress) => {
    await onProgress?.({ phase: "SEARCHING", processedPages: 1, placeIds: ["place-1"] });
    nextRequest = true;
    return result;
  });
  assert.equal(nextRequest, false);
  assert.equal(completed, false);
  assert.equal(failed, false);
});

test("late results cannot overwrite a newer run or a cancellation", async () => {
  let failures = 0;
  await executeSearchJob(input, "key", store({ complete: async () => false, fail: async () => { failures++; } }), async () => result);
  assert.equal(failures, 0);
});

test("provider failures are recorded as safe codes without an automatic paid retry", async () => {
  let calls = 0;
  let error: string | null = null;
  await executeSearchJob(input, "secret", store({ fail: async (code) => { error = code; } }), async () => { calls++; throw new PlacesError("googleQuota"); });
  assert.equal(calls, 1);
  assert.equal(error, "googleQuota");
});
