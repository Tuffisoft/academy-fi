import type { PlaceResult } from "./google-places";
import type { SavedLeadSummary } from "./types";

function csvCell(value: string | null) {
  const text = value ?? "";
  const safe = /^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function savedLeadsCsv(leads: { lead: SavedLeadSummary; place: PlaceResult }[]) {
  const rows = [
    ["Firma", "Adresse", "Website", "Telefon", "Branche", "Suchort", "Google Maps", "Google Place ID"],
    ...leads.map(({ lead, place }) => [place.name, place.address, place.website, place.phone, lead.industry, lead.location, place.mapsUrl, place.id]),
  ];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
