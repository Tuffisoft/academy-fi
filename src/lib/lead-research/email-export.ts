import type { PlaceResult } from "./google-places";
import { BUSINESS_STATUSES, parsePlaceSignals, type BusinessStatus } from "./place-signals";

export type LeadExportEmailInput = {
  requestId: string;
  leadIds: string[];
  places: PlaceResult[];
};

export function parseLeadExportEmailInput(input: unknown): LeadExportEmailInput | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (typeof data.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(data.requestId)) return null;
  if (!Array.isArray(data.leadIds) || !data.leadIds.length || data.leadIds.length > 10_000 ||
    !data.leadIds.every(id => typeof id === "string" && id.length > 0 && id.length <= 512) ||
    new Set(data.leadIds).size !== data.leadIds.length) return null;
  if (!Array.isArray(data.places) || data.places.length > data.leadIds.length) return null;
  const places: PlaceResult[] = [];
  for (const value of data.places) {
    if (!value || typeof value !== "object") return null;
    const place = value as Record<string, unknown>;
    if (typeof place.id !== "string" || !place.id || place.id.length > 512 ||
      typeof place.name !== "string" || !place.name.trim() || place.name.length > 1000 ||
      typeof place.mapsUrl !== "string" || place.mapsUrl.length > 4096) return null;
    for (const [key, limit] of [["address", 2000], ["website", 4096], ["phone", 200]] as const) {
      if (place[key] !== null && (typeof place[key] !== "string" || place[key].length > limit)) return null;
    }
    for (const key of ["category", "primaryType"] as const) {
      if (place[key] != null && (typeof place[key] !== "string" || place[key].length > 200)) return null;
    }
    if (place.businessStatus != null && !BUSINESS_STATUSES.includes(place.businessStatus as BusinessStatus)) return null;
    if (place.rating != null && (typeof place.rating !== "number" || !Number.isFinite(place.rating) || place.rating < 1 || place.rating > 5)) return null;
    // Only CSV fields are accepted. No attachment URLs or HTML are supplied by clients.
    places.push({ id: place.id, name: place.name, mapsUrl: place.mapsUrl,
      address: place.address as string | null, website: place.website as string | null,
      phone: place.phone as string | null, attributions: [],
      ...parsePlaceSignals({ businessStatus: place.businessStatus, primaryType: place.primaryType,
        primaryTypeDisplayName: { text: place.category }, rating: place.rating }),
    });
  }
  if (new Set(places.map(place => place.id)).size !== places.length) return null;
  const result = { requestId: data.requestId, leadIds: data.leadIds as string[], places };
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > 750_000) return null;
  return result;
}

export function leadExportEmailContent({ name, count, missingCount, csv }: {
  name: string; count: number; missingCount: number; csv: string;
}) {
  const warning = missingCount > 0
    ? `Bei ${missingCount} Leads waren die Firmendaten nicht verfügbar. Diese Zeilen enthalten die Google Place ID und die vorhandenen Kampagnendaten.`
    : "";
  const introduction = `im Anhang finden Sie ${count} Leads, welche von ${name} gefunden wurden.`;
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
  return {
    subject: `Studio Fi: ${count} gespeicherte Leads`,
    text: `Guten Tag Herr Fi,\n\n${introduction}\n\n${warning ? `${warning}\n\n` : ""}Mit freundlichen Grüßen\n${name}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1f2937"><p>Guten Tag Herr Fi,</p><p>${escapeHtml(introduction)}</p>${warning ? `<p>${escapeHtml(warning)}</p>` : ""}<p>Mit freundlichen Grüßen<br>${escapeHtml(name)}</p></div>`,
    attachments: [{ filename: "studio-fi-leads.csv", content: Buffer.from(csv, "utf8"), contentType: "text/csv; charset=utf-8" }],
  };
}
