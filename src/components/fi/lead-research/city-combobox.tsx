"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CITY_CATEGORIES } from "@/lib/lead-research/city-catalog";
import { MAX_LOCATION_LENGTH } from "@/lib/lead-research/search-input";
import { GroupedSuggestionInput, type SuggestionFieldProps } from "./grouped-suggestion-input";
import type { CityPrediction } from "@/lib/lead-research/city-autocomplete";

const groups = CITY_CATEGORIES.map(({ region, cities }) => ({
  value: region,
  items: [...cities].sort((a, b) => a.localeCompare(b, "de")).map(city => ({ key: `${region}:${city}`, label: city, category: region })),
}));

export function CityCombobox(props: SuggestionFieldProps) {
  const t = useTranslations("leadResearch");
  const language = useLocale() === "de" ? "de" : "en";
  const [open, setOpen] = useState(false);
  const [lookupDisabled, setLookupDisabled] = useState(false);
  const [input, setInput] = useState({ value: props.defaultValue ?? "", selected: true });
  const [snapshot, setSnapshot] = useState<{ key: string; suggestions: CityPrediction[]; failed: boolean } | null>(null);
  const query = input.value.trim();
  const eligible = open && !props.disabled && !lookupDisabled && !input.selected && query.length >= 3 && query.length <= MAX_LOCATION_LENGTH;
  const key = JSON.stringify([query, language]);
  useEffect(() => {
    if (!eligible) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/lead-research/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, language }),
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("unavailable");
        const data: { suggestions: CityPrediction[]; disabled?: boolean } = await response.json();
        if (!controller.signal.aborted) {
          if (data.disabled) setLookupDisabled(true);
          setSnapshot({ key, suggestions: data.suggestions, failed: false });
        }
      } catch {
        if (!controller.signal.aborted) setSnapshot({ key, suggestions: [], failed: true });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [eligible, key, query, language]);

  const current = eligible && snapshot?.key === key ? snapshot : null;
  const suggestions = current?.suggestions ?? [];
  const googleGroups = [true, false].map(german => {
    const title = t(german ? "cityGoogleGerman" : "cityInternational");
    return {
      value: title,
      google: true,
      items: suggestions.filter(city => /,\s*(Deutschland|Germany|DE)$/i.test(city.label) === german)
        .map(city => ({ key: `google:${city.id}`, label: city.label, category: title })),
    };
  }).filter(group => group.items.length > 0);
  const combined = [...groups, ...googleGroups];
  const status = eligible ? !current ? t("citySearching") : current.failed ? t("cityLookupUnavailable") : undefined : undefined;
  return <GroupedSuggestionInput {...props} groups={combined} name="location" id="lead-location" maxLength={MAX_LOCATION_LENGTH} placeholder={t("locationPlaceholder")} showOptionsLabel={t("cityShowOptions")} noMatchesLabel={t("cityNoMatches")}
    onInputChange={(value, selected) => setInput({ value, selected })} onOpenChange={setOpen} status={status}
  />;
}
