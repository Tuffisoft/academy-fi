"use server";

import { requireUser } from "@/lib/session";
import { getSavedLeads } from "@/lib/data/saved-leads";
import { getLeadExportEmailSettings, sendLeadExportEmail } from "@/lib/email";
import { parseLeadExportEmailInput } from "@/lib/lead-research/email-export";
import { savedLeadsCsv } from "@/lib/lead-research/export-csv";

export async function emailSavedLeadsAction(input: unknown) {
  const user = await requireUser();
  if (!getLeadExportEmailSettings().configured) return { success: false as const, error: "csvEmailNotConfigured" as const };
  const data = parseLeadExportEmailInput(input);
  if (!data) return { success: false as const, error: "csvEmailInvalid" as const };
  // Read ownership, campaign snapshots and the complete list from the server.
  const leads = await getSavedLeads();
  const leadIds = new Set(leads.map(lead => lead.id));
  if (leads.length !== data.leadIds.length || data.leadIds.some(id => !leadIds.has(id))) {
    return { success: false as const, error: "csvEmailLeadsChanged" as const };
  }
  const allowedPlaces = new Set(leads.map(lead => lead.placeId));
  if (data.places.some(place => !allowedPlaces.has(place.id))) return { success: false as const, error: "csvEmailInvalid" as const };
  const byPlace = new Map(data.places.map(place => [place.id, place]));
  const entries = leads.map(lead => ({ lead, place: byPlace.get(lead.placeId) }));
  const missingCount = entries.filter(entry => !entry.place).length;
  try {
    await sendLeadExportEmail({
      name: [...new Set(leads.map(lead => lead.authorName))].join(", "),
      count: leads.length, missingCount, csv: savedLeadsCsv(entries),
      requestId: data.requestId, userId: user.id,
    });
    return { success: true as const, missingCount, recipient: getLeadExportEmailSettings().recipient! };
  } catch {
    return { success: false as const, error: "csvEmailError" as const };
  }
}
