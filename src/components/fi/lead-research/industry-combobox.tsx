"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { INDUSTRY_CATEGORIES } from "@/lib/lead-research/industry-catalog";
import { GroupedSuggestionInput, type SuggestionGroup, type SuggestionFieldProps } from "./grouped-suggestion-input";

export function IndustryCombobox({ language, ...props }: SuggestionFieldProps & { language?: "de" | "en" }) {
  const t = useTranslations("leadResearch");
  const uiLocale = useLocale() === "de" ? "de" : "en";
  const locale = language ?? uiLocale;
  const groups = useMemo<SuggestionGroup[]>(() => INDUSTRY_CATEGORIES.map(category => ({
    value: t(`industryCategories.${category.key}`),
    items: category.items.map(industry => ({
      key: industry.key,
      label: industry[locale],
      category: t(`industryCategories.${category.key}`),
    })),
  })), [locale, t]);

  return <GroupedSuggestionInput {...props} groups={groups} name="industry" id="lead-industry" maxLength={200} placeholder={t("industryPlaceholder")} showOptionsLabel={t("industryShowOptions")} noMatchesLabel={t("industryNoMatches")} />;
}
