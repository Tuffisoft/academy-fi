import { getTranslations } from "next-intl/server";
import { SlideCard } from "@/components/fi/presentation/slide-card";
import {
  AutoReveal,
  ClickReveal,
  ClickSteps,
} from "@/components/fi/presentation/reveal";

export async function ChallengeBreakSlide() {
  const t = await getTranslations("presentation.challengeBreak");

  return (
    <SlideCard className="relative items-center justify-center overflow-hidden text-center">
      <ClickSteps
        className="relative flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6"
        maxSteps={1}
      >
        <AutoReveal index={0}>
          <h2 className="text-6xl font-semibold">{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className="text-muted-foreground text-3xl">{t("subheading")}</p>
        </AutoReveal>
        <ClickReveal at={1}>
          <div className="border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-2xl border-2 p-6">
            <h3 className="text-primary text-lg font-semibold tracking-widest uppercase">
              {t("challengeHeading")}
            </h3>
            <p className="text-4xl font-medium">{t("challenge")}</p>
          </div>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
