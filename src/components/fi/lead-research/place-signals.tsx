"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Star } from "lucide-react";
import type { PlaceSignals } from "@/lib/lead-research/place-signals";
import { BUSINESS_STATUSES, DEFAULT_MINIMUM_GOOGLE_STARS, businessIsInactive, leadSuitability, type PlaceSort } from "@/lib/lead-research/place-signals";

export function PlaceSignalControls({ status, minimumStars, sort, onChange }: {
  status: string; minimumStars: number; sort: PlaceSort;
  onChange: (value: { status: string; minimumStars: number; sort: PlaceSort }) => void;
}) {
  const t = useTranslations("leadResearch");
  const style = "h-9 rounded-md border bg-background px-3 text-sm text-foreground";
  return <div className="flex flex-wrap gap-3">
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">{t("businessStatus")}<select className={style} value={status} onChange={event => onChange({ status: event.target.value, minimumStars, sort })}>
      <option value="all">{t("allBusinessStatuses")}</option>
      {[...BUSINESS_STATUSES, "UNKNOWN"].map(value => <option key={value} value={value}>{t(`businessStatuses.${value}`)}</option>)}
    </select></label>
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">{t("minimumGoogleStars")}<select className={style} value={minimumStars} onChange={event => onChange({ status, minimumStars: Number(event.target.value), sort })}>
      <option value={0}>{t("allGoogleStars")}</option>
      {[1, 2, 3, 4, 4.5, 5].map(value => <option key={value} value={value}>{t("minimumGoogleStarsValue", { value })}</option>)}
    </select></label>
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">{t("leadSignalSort")}<select className={style} value={sort} onChange={event => onChange({ status, minimumStars, sort: event.target.value as PlaceSort })}>
      {(["default", "status", "starsHigh", "starsLow"] as const).map(value => <option key={value} value={value}>{t(`leadSignalSortOptions.${value}`)}</option>)}
    </select></label>
  </div>;
}

export function PlaceBusinessStatus({ place, minimumStars = DEFAULT_MINIMUM_GOOGLE_STARS }: { place: PlaceSignals; minimumStars?: number }) {
  const t = useTranslations("leadResearch");
  const suitability = leadSuitability(place, minimumStars);
  return <div className="space-y-1">
    <p className={businessIsInactive(place) ? "font-medium text-red-700 dark:text-red-300" : "text-muted-foreground"}>{t(`businessStatuses.${place.businessStatus ?? "UNKNOWN"}`)}</p>
    {suitability !== "usable" && <p className={`text-xs ${suitability === "unusable" ? "font-medium text-red-700 dark:text-red-300" : "text-muted-foreground"}`}>{t(`leadSuitability.${suitability}`)}</p>}
  </div>;
}

export function PlaceGoogleRating({ place }: { place: PlaceSignals }) {
  const t = useTranslations("leadResearch");
  const format = useFormatter();
  const value = place.rating != null ? format.number(place.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
  return value !== null ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums" aria-label={t("googleStarsValue", { value })}><Star className="size-4 shrink-0 fill-amber-500 text-amber-600 dark:fill-amber-300 dark:text-amber-300" aria-hidden="true" /><span className="font-medium">{value}<span className="font-normal text-muted-foreground"> / 5</span></span></span> : <span className="text-muted-foreground">{t("googleStarsUnknown")}</span>;
}

export function PlaceSignalsSummary({ place, minimumStars = DEFAULT_MINIMUM_GOOGLE_STARS }: { place: PlaceSignals; minimumStars?: number }) {
  return <div className="mt-2 space-y-1 text-xs">
    {place.category && <p className="text-muted-foreground">{place.category}</p>}
    <PlaceBusinessStatus place={place} minimumStars={minimumStars} />
    <PlaceGoogleRating place={place} />
  </div>;
}
