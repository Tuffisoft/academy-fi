import type { Metadata } from "next";
import { StempelFiPortalPreview } from "@/components/loyalty/stempelfi-design";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { ProgramEditor } from "@/components/loyalty/program-editor";
import { defaultProgram } from "@/lib/loyalty/program-input";
import { getLocale, getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "StempelFi · Design", robots: { index: false, follow: false } };

export default async function StempelFiPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  if (view === "program-editor") {
    const locale = await getLocale(), t = await getTranslations("stempelfi.programEditor");
    return <main className="min-w-0"><ProductHeader languageHref="/tools/calem/stempelkarten/preview?view=program-editor" pricingHref="/tools/calem/stempelkarten#pricing" /><section className="mx-auto grid max-w-6xl gap-7 px-5 py-10"><h1 className="text-3xl font-semibold">{t("new")}</h1><ProgramEditor preview organizationId="preview" slug="preview" initial={{ ...defaultProgram, id: "preview", revision: 1, name: locale === "de" ? "Kaffeepause" : "Coffee break", description: locale === "de" ? "Dein guter Grund, wiederzukommen." : "A good reason to come back.", reward: locale === "de" ? "Ein Kaffee gratis" : "One free coffee", symbol: "COFFEE" }} /></section></main>;
  }
  return <StempelFiPortalPreview initialEditor={view === "editor"} />;
}
