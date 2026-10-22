"use client";

import { useEffect, useRef, useState } from "react";
import { loadLeadSearchResultsAction } from "@/lib/actions/lead-searches.actions";
import type { LivePlacesResult } from "./places-results";

type BatchResponse = Awaited<ReturnType<typeof loadLeadSearchResultsAction>>;
type CachedResult = { result: LivePlacesResult; nextOffset: number };
type Snapshot = { key: string; data: CachedResult | null; loading: boolean; error: string | null };

export function useLivePlaces(searchId: string | undefined, runId: string | null | undefined, count: number, enabled: boolean) {
  const cache = useRef(new Map<string, CachedResult>());
  const requests = useRef(new Map<string, Promise<BatchResponse>>());
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const key = JSON.stringify([searchId, runId]);

  useEffect(() => {
    if (!enabled || !searchId || count === 0) return;
    let disposed = false;
    const id = searchId;

    async function load() {
      let current = cache.current.get(key) ?? null;
      setSnapshot({ key, data: current, loading: true, error: null });
      try {
        while (!disposed && (current?.nextOffset ?? 0) < count) {
          const offset = current?.nextOffset ?? 0;
          const requestKey = JSON.stringify([id, runId, offset]);
          let request = requests.current.get(requestKey);
          if (!request) {
            request = loadLeadSearchResultsAction(id, offset);
            requests.current.set(requestKey, request);
          }
          let response: BatchResponse;
          try { response = await request; }
          finally { if (requests.current.get(requestKey) === request) requests.current.delete(requestKey); }
          if (!response.success) {
            if (!disposed) setSnapshot({ key, data: current, loading: false, error: response.error });
            return;
          }
          if (response.runId !== runId || response.nextOffset <= offset) {
            if (!disposed) setSnapshot({ key, data: current, loading: false, error: response.runId !== runId ? "googleBusy" : "googleResponse" });
            return;
          }
          // An in-flight paid response is retained for this view even when its tab was left.
          // Reusing the same promise also prevents duplicate calls in React Strict Mode.
          const existing = cache.current.get(key);
          if (existing && existing.nextOffset >= response.nextOffset) {
            current = existing;
          } else {
            const places = new Map((existing?.result.results ?? []).map((place) => [place.id, place]));
            for (const place of response.results) places.set(place.id, place);
            current = {
              nextOffset: response.nextOffset,
              result: { results: [...places.values()], partialError: response.partialError ?? existing?.result.partialError ?? null, resultLimit: response.resultLimit, resolvedLocation: response.resolvedLocation },
            };
            cache.current.set(key, current);
          }
          if (!disposed) setSnapshot({ key, data: current, loading: current.nextOffset < count, error: null });
          if (response.partialError === "googleQuota" || response.partialError === "googleAccess") break;
        }
        if (!disposed) setSnapshot({ key, data: current, loading: false, error: null });
      } catch {
        if (!disposed) setSnapshot({ key, data: current, loading: false, error: "googleUnavailable" });
      }
    }
    // Defer setup to let a Strict Mode cleanup cancel an unstarted load.
    void Promise.resolve().then(() => { if (!disposed) return load(); });
    return () => { disposed = true; };
  }, [searchId, runId, count, enabled, key]);

  const current = snapshot?.key === key ? snapshot : null;
  return { result: current?.data?.result ?? null, loading: enabled && count > 0 && (!current || current.loading), error: current?.error ?? null };
}
