import assert from "node:assert/strict";
import { test } from "node:test";
import { leadSearchMutableScope, leadSearchScope, MAX_SEARCH_RESULTS, parseLeadSearchInput } from "../src/lib/lead-research/search-input";

const valid = { location: "  Kiel  ", radiusKm: 12.5, industry: "  Bäckereien  ", maxResults: 250, analyzeWebsites: false };

test("edit and delete filters prevent foreign or already running campaigns from being changed", () => {
  const campaigns = [
    { id: "a", userId: "alice", status: "DRAFT" },
    { id: "b", userId: "bob", status: "DRAFT" },
    { id: "c", userId: "alice", status: "RUNNING" },
    { id: "d", userId: "alice", status: "COMPLETED" },
    { id: "e", userId: "alice", status: "QUEUED" },
  ];
  function matches(user: { id: string; role: string }, id: unknown) {
    const where = leadSearchMutableScope(user, id);
    return where ? campaigns.filter((row) => row.id === where.id && where.status.in.some((status) => status === row.status) && (!("userId" in where) || row.userId === where.userId)).length : 0;
  }
  const alice = { id: "alice", role: "INTERN" };
  const owner = { id: "owner", role: "OWNER" };
  assert.equal(matches(alice, "a"), 1);
  assert.equal(matches(alice, "b"), 0);
  assert.equal(matches(alice, "c"), 0);
  assert.equal(matches(owner, "b"), 1);
  assert.equal(matches(owner, "c"), 0);
  assert.equal(matches(alice, "d"), 1);
  assert.equal(matches(alice, "e"), 0);
  for (const id of [undefined, null, "", " ", {}, "x".repeat(129)]) assert.equal(matches(owner, id), 0);
});

test("searches accept custom locations, free industries and more than 100 results", () => {
  assert.deepEqual(parseLeadSearchInput(valid), { ...valid, location: "Kiel", industry: "Bäckereien" });
});

test("server rejects malformed input and values PostgreSQL cannot store", () => {
  for (const input of [null, "search", {},
    { ...valid, location: "   " }, { ...valid, industry: "x".repeat(201) },
    { ...valid, radiusKm: NaN }, { ...valid, radiusKm: Infinity }, { ...valid, radiusKm: 0 },
    { ...valid, radiusKm: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, maxResults: 0 }, { ...valid, maxResults: 1.5 },
    { ...valid, maxResults: MAX_SEARCH_RESULTS + 1 }, { ...valid, maxResults: "100" },
    { ...valid, analyzeWebsites: "false" },
  ]) assert.equal(parseLeadSearchInput(input), null);
});

test("client cannot supply an owner or a forged processing status", () => {
  const data = parseLeadSearchInput({ ...valid, userId: "other-user", status: "COMPLETED" });
  assert.ok(data);
  assert.equal("userId" in data, false);
  assert.equal("status" in data, false);
});

test("owners see all searches; interns and unknown roles are restricted to their own", () => {
  assert.deepEqual(leadSearchScope({ id: "owner", role: "OWNER" }), {});
  for (const role of ["INTERN", "owner", undefined, null]) {
    assert.deepEqual(leadSearchScope({ id: "intern-a", role }), { userId: "intern-a" });
  }
});
