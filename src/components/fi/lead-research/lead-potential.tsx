"use client";

import { useTranslations } from "next-intl";
import type { PlaceResult } from "@/lib/lead-research/google-places";
import { assessLead, type AssessmentAudit } from "@/lib/lead-research/lead-assessment";

const tones = {
  highPotential: "text-emerald-700 dark:text-emerald-400",
  openPotential: "text-amber-800 dark:text-amber-300",
  mediumPotential: "text-amber-800 dark:text-amber-300",
  lowPotential: "text-muted-foreground",
  pendingPotential: "text-muted-foreground",
};

export function LeadPotential({ audit, place, detailed = false }: { audit?: AssessmentAudit; place?: PlaceResult; detailed?: boolean }) {
  const t = useTranslations("leadResearch");
  const result = assessLead(audit, place);
  if (!detailed) return <span className={`text-xs font-semibold ${tones[result.need]}`}>
    {t(`needKeywords.${result.need}`)}
  </span>;
  return <div className={detailed ? "space-y-2 rounded-xl border p-4 text-sm" : "space-y-1 text-xs"}>
    {detailed && <h2 className="font-semibold text-foreground">{t("potentialColumn")}</h2>}
    <p className={`font-semibold ${tones[result.need]}`}>{t(result.need)}</p>
    <p className="text-muted-foreground">{t(`needReasons.${result.reason}`)}</p>
    <p className={result.priority === "first" ? "font-medium text-emerald-700 dark:text-emerald-400" : "font-medium"}>{t(`contactPriorities.${result.priority ?? "unknown"}`)}</p>
    {detailed || result.priority === "review" || result.priority === "defer" ? <p className="text-muted-foreground">{t(`contactReasons.${result.contactReason}`)}</p> : null}
  </div>;
}
