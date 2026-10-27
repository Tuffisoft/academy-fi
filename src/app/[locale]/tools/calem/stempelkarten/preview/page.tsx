import type { Metadata } from "next";
import { StempelFiPortalPreview } from "@/components/loyalty/stempelfi-design";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { ProgramEditor } from "@/components/loyalty/program-editor";
import { defaultProgram } from "@/lib/loyalty/program-input";
import { getLocale, getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "StempelFi · Design",
  robots: { index: false, follow: false },
};

export default async function StempelFiPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; example?: string }>;
}) {
  const { view, example } = await searchParams;
  if (view === "program-editor" || view === "editor") {
    const locale = await getLocale(),
      t = await getTranslations("stempelfi.programEditor");
    const product = await getTranslations("stempelfi");
    const selected =
      example === "published" || example === "draft" ? example : null;
    const editorHref = `/tools/calem/stempelkarten/preview?view=program-editor${selected ? `&example=${selected}` : ""}`;
    return (
      <main className="min-w-0">
        <ProductHeader
          languageHref={editorHref}
          pricingHref="/tools/calem/stempelkarten#pricing"
        />
        <section className="mx-auto grid max-w-6xl gap-7 px-5 py-10">
          <h1 className="text-3xl font-semibold">{t("new")}</h1>
          <ProgramEditor
            key={selected ?? "new"}
            preview
            previewConditionsLocked={selected === "published"}
            organizationId="preview"
            slug="preview"
            initial={
              selected
                ? {
                    ...defaultProgram,
                    id: "preview",
                    revision: 1,
                    name: selected
                      ? product(
                          selected === "published"
                            ? "sampleTitle"
                            : "draftTitle",
                        )
                      : locale === "de"
                        ? "Kaffeepause"
                        : "Coffee break",
                    description:
                      locale === "de"
                        ? "Dein guter Grund, wiederzukommen."
                        : "A good reason to come back.",
                    reward:
                      selected === "published"
                        ? product("sampleReward")
                        : locale === "de"
                          ? "Ein Kaffee gratis"
                          : "One free coffee",
                    symbol: "COFFEE",
                  }
                : undefined
            }
          />
        </section>
      </main>
    );
  }
  return <StempelFiPortalPreview />;
}
