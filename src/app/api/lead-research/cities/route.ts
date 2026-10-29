import { getCurrentSession } from "@/lib/session";
import { cityAutocompleteInput, getCitySuggestions } from "@/lib/lead-research/city-autocomplete";

export async function POST(request: Request) {
  if (!(await getCurrentSession())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const input = cityAutocompleteInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (process.env.GOOGLE_CITY_AUTOCOMPLETE_ENABLED?.trim().toLowerCase() === "false") {
    return Response.json({ disabled: true, suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return Response.json({ error: "unavailable" }, { status: 503 });
  try {
    const suggestions = await getCitySuggestions(input.data, key, AbortSignal.any([request.signal, AbortSignal.timeout(5000)]));
    return Response.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
