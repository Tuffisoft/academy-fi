import type { PlaceResult } from "./google-places";
import type { SavedLeadSummary } from "./types";
import { isAreaSearch } from "./search-input";

function csvCell(value: string | null) {
  const text = value ?? "";
  const safe = /^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function savedLeadsCsv(leads: { lead: SavedLeadSummary; place?: PlaceResult }[]) {
  const rows = [
    ["Firma", "Adresse", "Website", "Telefon", "Branche", "Suchort", "Google Maps", "Google Place ID"],
    ...leads.map(({ lead, place }) => [place?.name ?? null, place?.address ?? null, place?.website ?? null, place?.phone ?? null, lead.industry && isAreaSearch(lead.industry) ? "Alle Branchen" : lead.industry, lead.location, place?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=Company&query_place_id=${encodeURIComponent(lead.placeId)}`, lead.placeId]),
  ];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export async function prepareSavedLeadsExport(
  leads: SavedLeadSummary[],
  cache: Map<string, PlaceResult>,
  load: (ids: string[]) => Promise<{ success: boolean; results?: PlaceResult[]; partialError?: string | null }>,
) {
  const missing = [...new Map(leads.filter(lead => !cache.has(lead.placeId)).map(lead => [lead.placeId, lead])).values()];
  for (let offset = 0; offset < missing.length; offset += 10) {
    let response: Awaited<ReturnType<typeof load>>;
    try { response = await load(missing.slice(offset, offset + 10).map(lead => lead.id)); }
    catch { break; }
    if (response.success) {
      for (const place of response.results ?? []) cache.set(place.id, place);
    }
    // Stop on provider failures rather than repeat billable requests. Every saved
    // lead still gets a CSV row, with its Place ID and the available internal data.
    if (!response.success || response.partialError) break;
  }
  const entries = leads.map(lead => ({ lead, place: cache.get(lead.placeId) }));
  return { csv: savedLeadsCsv(entries), missingCount: entries.filter(entry => !entry.place).length };
}
