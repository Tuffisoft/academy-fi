import { isIP } from "node:net";
import { normalizeWebsiteReport, type QualityParts, type QualityTopic } from "./website-rating";
import { assessVisualDesign, screenshotData, type VisualDesign, type VisualOptions } from "./visual-design";
export { calculateQuality, QUALITY_WEIGHTS, type QualityParts } from "./website-rating";

export type QualityErrorCode = "auditUnavailable" | "auditTimeout" | "auditQuota" | "auditAccess" | "auditResponse" | "auditUnreachable" | "auditUnsafeUrl";
export class QualityError extends Error {
  constructor(public readonly code: QualityErrorCode) { super(code); }
}
export type WebsiteReport = {
  version: 1 | 2;
  checkedAt: string;
  url: string;
  qualityScore: number | null;
  parts: QualityParts | { mobilePerformance: number | null; desktopPerformance: number | null; seo: number | null; accessibility: number | null; bestPractices: number | null };
  visual?: VisualDesign;
  mobile: DeviceReport;
  desktop: DeviceReport;
};
type DeviceReport = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  https: boolean;
  metrics: { lcpMs: number | null; fcpMs: number | null; tbtMs: number | null; cls: number | null };
  checks: { id: string; passed: boolean | null }[];
  issues: { id: string; title: string; description: string; value: string | null; categories?: QualityTopic[] }[];
  warnings: string[];
  lighthouseVersion: string | null;
};
type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const text = (value: unknown, max = 1000) => typeof value === "string" && value.trim() ? value.slice(0, max) : null;
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const score = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? Math.round(value * 100) : null;

// We send only public HTTP(S) hostnames to the fixed PageSpeed endpoint. The app
// never fetches arbitrary business URLs itself, including redirects or DNS targets.
export function publicWebsiteUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || !host.includes(".") || isIP(host) || host.includes(":")) return null;
    if (["localhost", "local", "internal", "test", "invalid", "example", "onion"].some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) return null;
    if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some((label) => !label || label.startsWith("-") || label.endsWith("-"))) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function parseDevice(data: unknown): { report: DeviceReport; url: string; checkedAt: string; screenshot: string | null } {
  const root = object(data);
  const lighthouse = object(root.lighthouseResult);
  if (object(lighthouse.runtimeError).code) throw new QualityError("auditUnreachable");
  const url = publicWebsiteUrl(lighthouse.finalUrl);
  const checkedAt = text(lighthouse.fetchTime, 64);
  if (!url || !checkedAt || !Number.isFinite(Date.parse(checkedAt))) throw new QualityError("auditResponse");
  const categories = object(lighthouse.categories);
  const audits = object(lighthouse.audits);
  if (object(audits["http-status-code"]).score === 0) throw new QualityError("auditUnreachable");
  const getScore = (id: string) => score(object(categories[id]).score);
  const performance = getScore("performance");
  if (performance === null && Object.keys(categories).length === 0) throw new QualityError("auditResponse");
  const included = new Set<string>();
  const membership = new Map<string, QualityTopic[]>();
  for (const key of ["performance", "seo", "accessibility", "best-practices"]) {
    const refs = object(categories[key]).auditRefs;
    if (Array.isArray(refs)) for (const ref of refs) {
      const item = object(ref);
      if (typeof item.id === "string" && typeof item.weight === "number" && item.weight > 0) {
        included.add(item.id);
        membership.set(item.id, [...(membership.get(item.id) ?? []), key === "best-practices" ? "bestPractices" : key as QualityTopic]);
      }
    }
  }
  const issues = [...included].flatMap((id) => {
    const audit = object(audits[id]);
    const title = text(audit.title, 500);
    return typeof audit.score === "number" && audit.score >= 0 && audit.score < 1 && title && ["numeric", "binary"].includes(String(audit.scoreDisplayMode))
      ? [{ id, title, description: text(audit.description, 1500) ?? "", value: text(audit.displayValue, 200), categories: membership.get(id) }] : [];
  }).slice(0, 30);
  const metric = (id: string) => finite(object(audits[id]).numericValue);
  const checks = ["viewport", "document-title", "meta-description", "is-crawlable", "is-on-https"].map((id) => {
    const value = object(audits[id]).score;
    return { id, passed: value === 1 ? true : value === 0 ? false : null };
  });
  return { url, checkedAt: new Date(checkedAt).toISOString(), screenshot: screenshotData(object(object(audits["final-screenshot"]).details).data), report: {
    performance, seo: getScore("seo"), accessibility: getScore("accessibility"), bestPractices: getScore("best-practices"),
    https: new URL(url).protocol === "https:",
    metrics: { lcpMs: metric("largest-contentful-paint"), fcpMs: metric("first-contentful-paint"), tbtMs: metric("total-blocking-time"), cls: metric("cumulative-layout-shift") },
    checks, issues, lighthouseVersion: text(lighthouse.lighthouseVersion, 40),
    warnings: Array.isArray(lighthouse.runWarnings) ? lighthouse.runWarnings.flatMap((warning) => text(warning, 1000) ? [text(warning, 1000)!] : []).slice(0, 10) : [],
  } };
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export async function inspectWebsite(website: string, key?: string, fetcher: Fetcher = fetch, visualOptions: VisualOptions = {}): Promise<WebsiteReport & { parts: QualityParts }> {
  const target = publicWebsiteUrl(website);
  if (!target) throw new QualityError("auditUnsafeUrl");
  async function run(strategy: "mobile" | "desktop") {
    const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    url.searchParams.set("url", target!);
    url.searchParams.set("strategy", strategy);
    url.searchParams.set("locale", "de");
    for (const category of ["performance", "seo", "accessibility", "best-practices"]) url.searchParams.append("category", category);
    if (key?.trim()) url.searchParams.set("key", key.trim());
    let response: Response;
    try { response = await fetcher(url.href, { method: "GET", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(75000) }); }
    catch (error) { throw new QualityError(error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "auditTimeout" : "auditUnavailable"); }
    if (!response.ok) throw new QualityError(response.status === 429 ? "auditQuota" : [401, 403].includes(response.status) ? "auditAccess" : "auditUnavailable");
    let data: unknown;
    try { data = await response.json(); } catch { throw new QualityError("auditResponse"); }
    return parseDevice(data);
  }
  // Two bounded requests, no automatic paid retries. Both finish before the
  // worker releases its claim, even if one strategy fails.
  const results = await Promise.allSettled([run("mobile"), run("desktop")]);
  for (const item of results) if (item.status === "rejected") throw item.reason;
  const mobile = (results[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof run>>>).value;
  const desktop = (results[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof run>>>).value;
  const visual = await assessVisualDesign(mobile.screenshot, visualOptions);
  const parts: QualityParts = { performance: null, seo: null, accessibility: null, bestPractices: null, design: null };
  return normalizeWebsiteReport({ version: 2, checkedAt: mobile.checkedAt, url: mobile.url, parts, qualityScore: null, mobile: mobile.report, desktop: desktop.report, visual });
}
