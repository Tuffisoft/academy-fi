import assert from "node:assert/strict";
import { test } from "node:test";
import { distanceKm, loadGooglePlaceDetails, PlacesError, safePlacesUrl, searchGooglePlaces } from "../src/lib/lead-research/google-places";

const input = { location: "Hamburg", industry: "Elektriker", radiusKm: 20, maxResults: 100, analyzeWebsites: true };
const center = { latitude: 53.55, longitude: 9.99 };
const place = (id: string, extra: Record<string, unknown> = {}) => ({ id, displayName: { text: `Business ${id}` }, location: center, ...extra });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const location = () => json({ places: [{ location: center, formattedAddress: "Hamburg, Deutschland" }] });

test("background search reports actual pages and IDs without requesting contact fields", async () => {
  const progress: unknown[] = [];
  let calls = 0;
  await searchGooglePlaces(input, "key", async (_url, init) => {
    calls++;
    if (calls === 1) return location();
    const mask = (init.headers as Record<string, string>)["X-Goog-FieldMask"];
    assert.ok(!mask.includes("websiteUri"));
    assert.ok(!mask.includes("PhoneNumber"));
    return json({ places: [place("a")] });
  }, async (data) => { progress.push(data); }, false);
  assert.deepEqual(progress, [
    { phase: "LOCATING", processedPages: 0, placeIds: [] },
    { phase: "SEARCHING", processedPages: 0, placeIds: [] },
    { phase: "SEARCHING", processedPages: 1, placeIds: ["a"] },
  ]);
});

test("explicit detail retrieval is bounded to ten requests and three concurrent requests", async () => {
  let active = 0;
  let maximum = 0;
  let calls = 0;
  const result = await loadGooglePlaceDetails(Array.from({ length: 20 }, (_, index) => `id-${index}`), "key", async (url, init) => {
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active--;
    assert.equal(init.cache, "no-store");
    return json(place(decodeURIComponent(url.split("/").at(-1)!)));
  });
  assert.equal(calls, 10);
  assert.ok(maximum <= 3);
  assert.equal(result.processedCount, 10);
  assert.equal(result.results.length, 10);
});

test("detail quota errors stop subsequent batches and retain successful responses", async () => {
  let calls = 0;
  const result = await loadGooglePlaceDetails(["a", "b", "c", "d", "e"], "key", async (url) => {
    calls++;
    return url.endsWith("/a") ? json(place("a")) : json({}, 429);
  });
  assert.equal(calls, 3);
  assert.equal(result.processedCount, 3);
  assert.equal(result.results.length, 1);
  assert.equal(result.partialError, "googleQuota");
});

test("Google search uses server headers, bounded pagination, radius filtering and ID deduplication", async () => {
  const calls: RequestInit[] = [];
  const responses = [location(), json({ places: [place("a"), place("a"), place("outside", { location: { latitude: 52, longitude: 9 } }), place("unsafe", { websiteUri: "javascript:alert(1)" })], nextPageToken: "next" }), json({ places: [place("a"), place("b", { websiteUri: "https://example.com", attributions: [{ provider: "Data provider", providerUri: "https://example.com/credit" }] })] })];
  const result = await searchGooglePlaces(input, "test-key", async (_url, init) => { calls.push(init); return responses.shift()!; });
  assert.deepEqual(result.results.map((p) => p.id), ["a", "unsafe", "b"]);
  assert.equal(result.results[1].website, null);
  assert.equal(result.results[2].attributions[0].name, "Data provider");
  assert.equal(result.resolvedLocation, "Hamburg, Deutschland");
  assert.equal(calls.length, 3);
  assert.equal(calls[0].cache, "no-store");
  assert.equal((calls[0].headers as Record<string, string>)["X-Goog-Api-Key"], "test-key");
  assert.equal(JSON.parse(String(calls[1].body)).locationBias.circle.radius, 20_000);
  assert.equal(JSON.parse(String(calls[2].body)).pageToken, "next");
  assert.ok(!JSON.stringify(result).includes("test-key"));
});

test("search stops at requested count and never makes more than four upstream requests", async () => {
  let count = 0;
  const result = await searchGooglePlaces({ ...input, maxResults: 2 }, "key", async () => ++count === 1 ? location() : json({ places: [place("a"), place("b"), place("c")], nextPageToken: "more" }));
  assert.equal(result.results.length, 2);
  assert.equal(count, 2);
  count = 0;
  const capped = await searchGooglePlaces(input, "key", async () => ++count === 1 ? location() : json({ places: Array.from({ length: 20 }, (_, i) => place(`${count}-${i}`)), nextPageToken: "more" }));
  assert.equal(count, 4);
  assert.equal(capped.results.length, 60);
  assert.equal(capped.resultLimit, true);
});

test("missing key and unsupported radius make no billable request", async () => {
  const never = async () => { throw new Error("must not fetch"); };
  await assert.rejects(searchGooglePlaces(input, undefined, never), (e: unknown) => e instanceof PlacesError && e.code === "googleNotConfigured");
  await assert.rejects(searchGooglePlaces({ ...input, radiusKm: 51 }, "key", never), (e: unknown) => e instanceof PlacesError && e.code === "googleRadius");
});

test("provider errors do not expose response bodies or credentials and partial results survive", async () => {
  await assert.rejects(searchGooglePlaces(input, "secret", async () => json({ error: "private upstream message" }, 403)), (e: unknown) => e instanceof PlacesError && e.code === "googleAccess" && !e.message.includes("private"));
  let count = 0;
  const result = await searchGooglePlaces(input, "key", async () => {
    count++;
    if (count === 1) return location();
    if (count === 2) return json({ places: [place("a")], nextPageToken: "next" });
    return json({}, 429);
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.partialError, "googleQuota");
});

test("empty, malformed and network-error responses are handled without inventing results", async () => {
  await assert.rejects(searchGooglePlaces(input, "key", async () => json({ places: [] })), (e: unknown) => e instanceof PlacesError && e.code === "googleLocation");
  await assert.rejects(searchGooglePlaces(input, "key", async () => json({ places: [null] })), (e: unknown) => e instanceof PlacesError && e.code === "googleResponse");
  await assert.rejects(searchGooglePlaces(input, "key", async () => { throw new Error("network"); }), (e: unknown) => e instanceof PlacesError && e.code === "googleUnavailable");
  let count = 0;
  const empty = await searchGooglePlaces(input, "key", async () => ++count === 1 ? location() : json({}));
  assert.equal(empty.results.length, 0);
});

test("distance calculation and external URLs reject unsafe values", () => {
  assert.equal(distanceKm(center, center), 0);
  assert.ok(distanceKm(center, { latitude: 52.52, longitude: 13.405 }) > 200);
  for (const value of ["javascript:alert(1)", "data:text/html,hi", "https://user:secret@example.com", "broken", null]) assert.equal(safePlacesUrl(value), null);
});
