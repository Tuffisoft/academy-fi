import { CITY_CATEGORIES } from "./city-catalog";
import { INDUSTRY_CATEGORIES } from "./industry-catalog";

export function industryLanguageForLocation(location: string, fallback: "de" | "en"): "de" | "en" {
  const parts = location.split(",").map(part => part.trim().toLocaleLowerCase("de"));
  const country = parts.at(-1) ?? "";
  if (["deutschland", "germany", "de"].includes(country)) return "de";
  if (parts.length > 1 && CITY_CATEGORIES.some(group => group.region.toLocaleLowerCase("de") === country)) return "de";
  if (parts.length > 1 && country) return "en";
  if (CITY_CATEGORIES.some(group => group.cities.some(city => city.toLocaleLowerCase("de") === parts[0]))) return "de";
  return fallback;
}

export function translateCatalogIndustry(value: string, language: "de" | "en") {
  const normalized = value.trim().toLocaleLowerCase();
  for (const group of INDUSTRY_CATEGORIES) {
    const item = group.items.find(item => item.de.toLocaleLowerCase() === normalized || item.en.toLocaleLowerCase() === normalized);
    if (item) return item[language];
  }
  return value;
}
