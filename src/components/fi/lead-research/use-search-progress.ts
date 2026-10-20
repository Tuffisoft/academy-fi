"use client";

import { useEffect, useState } from "react";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import type { AuditSummary } from "@/lib/lead-research/audit-types";

export function useSearchProgress(initial: LeadSearchSummary[], initialAudits: AuditSummary[]) {
  const [snapshot, setSnapshot] = useState<{ source: LeadSearchSummary[]; searches: LeadSearchSummary[]; audits: AuditSummary[]; error: boolean } | null>(null);
  const searches = snapshot?.source === initial ? snapshot.searches : initial;
  const audits = snapshot?.source === initial ? snapshot.audits : initialAudits;
  const active = searches.some((search) => search.status === "RUNNING" || search.status === "QUEUED") || audits.some((audit) => ["RUNNING", "QUEUED"].includes(audit.status));

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    const controller = new AbortController();

    async function poll() {
      if (disposed || inFlight) return;
      if (document.visibilityState === "hidden") { timer = setTimeout(poll, 5000); return; }
      inFlight = true;
      let again = true;
      let delay = 2500;
      try {
        const response = await fetch("/api/lead-searches/status", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok) { if (response.status === 401) again = false; throw new Error("status request failed"); }
        const data = await response.json() as { searches: LeadSearchSummary[]; audits: AuditSummary[] };
        if (!Array.isArray(data.searches) || !Array.isArray(data.audits)) throw new Error("invalid status response");
        if (!disposed) setSnapshot({ source: initial, searches: data.searches, audits: data.audits, error: false });
        again = data.searches.some((search) => search.status === "RUNNING" || search.status === "QUEUED") || data.audits.some((audit) => ["RUNNING", "QUEUED"].includes(audit.status));
      } catch {
        if (!disposed) setSnapshot((current) => ({ source: initial, searches: current?.source === initial ? current.searches : initial, audits: current?.source === initial ? current.audits : initialAudits, error: true }));
        delay = 5000;
      } finally {
        inFlight = false;
        if (!disposed && again) timer = setTimeout(poll, delay);
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void poll(); } };
    timer = setTimeout(poll, 500);
    document.addEventListener("visibilitychange", onVisible);
    return () => { disposed = true; clearTimeout(timer); controller.abort(); document.removeEventListener("visibilitychange", onVisible); };
  }, [initial, initialAudits, active]);

  return { searches, audits, statusError: snapshot?.source === initial && snapshot.error };
}
