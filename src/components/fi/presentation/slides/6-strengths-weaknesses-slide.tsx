import { getTranslations } from "next-intl/server";
import {
  SlideCard,
  slideHeading,
  slideSubheading,
} from "@/components/fi/presentation/slide-card";
import {
  AutoReveal,
  ClickReveal,
  ClickSteps,
} from "@/components/fi/presentation/reveal";

type Point = { title: string; description: string };

export async function StrengthsWeaknessesSlide() {
  const t = await getTranslations("presentation.strengthsWeaknesses");
  const strengths = t.raw("strengths") as Point[];
  const weaknesses = t.raw("weaknesses") as Point[];
  const points = [
    ...strengths.map((point) => ({ ...point, group: "strength" })),
    ...weaknesses.map((point) => ({ ...point, group: "weakness" })),
  ];

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps
        className="relative flex w-full flex-1 flex-col gap-3"
        maxSteps={points.length}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <div className="grid flex-1 grid-cols-1 content-center gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
              {t("strengthsHeading")}
            </h3>
            {strengths.map((point, index) => (
              <ClickReveal at={index + 1} key={point.title}>
                <div className="flex flex-col gap-1 rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4 dark:border-emerald-400/30 dark:bg-emerald-400/5">
                  <h4 className="text-3xl font-semibold">{point.title}</h4>
                  <p className="text-muted-foreground text-xl">
                    {point.description}
                  </p>
                </div>
              </ClickReveal>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold tracking-wide text-amber-600 uppercase dark:text-amber-400">
              {t("weaknessesHeading")}
            </h3>
            {weaknesses.map((point, index) => (
              <ClickReveal at={strengths.length + index + 1} key={point.title}>
                <div className="flex flex-col gap-1 rounded-xl border border-amber-600/30 bg-amber-600/5 p-4 dark:border-amber-400/30 dark:bg-amber-400/5">
                  <h4 className="text-3xl font-semibold">{point.title}</h4>
                  <p className="text-muted-foreground text-xl">
                    {point.description}
                  </p>
                </div>
              </ClickReveal>
            ))}
          </div>
        </div>
      </ClickSteps>
    </SlideCard>
  );
}
