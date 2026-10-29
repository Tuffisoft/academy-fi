import { z } from "zod";
import { MAX_LOCATION_LENGTH } from "./search-input";
import { CITY_CATEGORIES } from "./city-catalog";

export const cityAutocompleteInput = z.object({
  query: z.string().trim().min(3).max(MAX_LOCATION_LENGTH),
  language: z.enum(["de", "en"]),
});
export type CityPrediction = { id: string; label: string };
const responseSchema = z.object({
  suggestions: z.array(z.object({
    placePrediction: z.object({
      placeId: z.string(),
      text: z.object({ text: z.string() }),
    }).optional(),
  })).default([]),
});

export async function getCitySuggestions(
  input: z.infer<typeof cityAutocompleteInput>,
  apiKey: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<CityPrediction[]> {
  const response = await fetcher("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    cache: "no-store",
    redirect: "error",
    signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({ input: input.query, languageCode: input.language, includedPrimaryTypes: ["(cities)"] }),
  });
  if (!response.ok) throw new Error(`city_autocomplete_http_${response.status}`);
  const data = responseSchema.parse(await response.json());
  const unique = new Map<string, CityPrediction>();
  for (const suggestion of data.suggestions) {
    const prediction = suggestion.placePrediction;
    if (!prediction) continue;
    const label = prediction.text.text.trim();
    const country = label.split(",").at(-1)?.trim().toLocaleLowerCase();
    if (!label || label.length > MAX_LOCATION_LENGTH) continue;
    const german = ["deutschland", "germany", "de"].includes(country ?? "");
    const city = label.split(",")[0].trim().toLocaleLowerCase("de");
    // Keep local entries and only add German places missing from the catalogue.
    if (german && CITY_CATEGORIES.some(group => group.cities.some(local => local.toLocaleLowerCase("de") === city))) continue;
    unique.set(prediction.placeId, { id: prediction.placeId, label });
  }
  return [...unique.values()].slice(0, 5);
}
