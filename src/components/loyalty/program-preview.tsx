/* eslint-disable @next/next/no-img-element -- Authenticated private logo proxy; Next image cache must not store tenant assets. */
import { Coffee, Gift, Heart, Stamp, Star } from "lucide-react";
import { programTarget, type ProgramConfig } from "@/lib/loyalty/program-input";
import { useTranslations } from "next-intl";

const icons = { STAMP: Stamp, STAR: Star, HEART: Heart, GIFT: Gift, COFFEE: Coffee };
export function ProgramPreview({ config, organizationId, compact = false }: { config: ProgramConfig; organizationId: string; compact?: boolean }) {
  const t = useTranslations("stempelfi.programEditor");
  const Icon = icons[config.symbol];
  const targetValid = programTarget.safeParse(config.target).success;
  return <section aria-label={t("preview")} className="grid min-w-0 gap-5">
    {!compact && <p className="text-sm text-muted-foreground">{t("previewNote")}</p>}
    {(compact ? ["Web"] : ["Web", "Apple Wallet", "Google Wallet"]).map(provider => <div key={provider} className="grid min-w-0 gap-2">
      {!compact && <h2 className="font-semibold">{provider}</h2>}
      <div className={`grid min-w-0 gap-4 border p-5 shadow-sm ${provider === "Google Wallet" ? "rounded-3xl" : "rounded-xl"}`}
        style={{ backgroundColor: config.backgroundColor, color: config.textColor }}>
        <div className="flex min-w-0 items-center gap-3">
          {config.logoAssetId && <img alt="" className="size-12 shrink-0 object-contain" src={`/api/loyalty/organizations/${organizationId}/assets/${config.logoAssetId}`} />}
          <h3 className="min-w-0 wrap-anywhere text-xl font-semibold">{config.name || t("placeholderName")}</h3>
        </div>
        {config.description && <p className="wrap-anywhere text-sm">{config.description}</p>}
        <p>{t("progress", { target: targetValid ? config.target : "–" })}</p>
        {targetValid && <div aria-hidden="true" className="grid w-fit grid-cols-5 gap-2">{Array.from({ length: config.target }, (_, i) => <Icon key={i} className="size-7 opacity-60" />)}</div>}
        <p className="wrap-anywhere font-medium">{config.reward || t("placeholderReward")}</p>
      </div>
    </div>)}
  </section>;
}
