import { getTranslations } from "next-intl/server";
import { GraduationCap, Briefcase } from "lucide-react";
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

type Pillar = { title: string; description: string };

const icons = [GraduationCap, Briefcase];

export async function AcademyFiPanelSlide() {
  const t = await getTranslations("presentation.academyFiPanel");
  const pillars = t.raw("pillars") as Pillar[];
  const totalSteps = pillars.length + 2;

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps
        className="relative flex w-full flex-1 flex-col gap-4"
        maxSteps={totalSteps}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <ClickReveal at={1}>
          <p className="text-xl">{t("intro")}</p>
        </ClickReveal>
        <div className="grid flex-1 grid-cols-1 content-center gap-4 sm:grid-cols-2">
          {pillars.map((pillar, index) => {
            const Icon = icons[index];
            return (
              <ClickReveal at={index + 2} key={pillar.title}>
                <div className="border-border bg-muted/30 flex h-full flex-col gap-2 rounded-xl border p-5">
                  <Icon className="text-primary size-6" strokeWidth={1.75} />
                  <h3 className="text-3xl font-semibold">{pillar.title}</h3>
                  <p className="text-muted-foreground text-xl">
                    {pillar.description}
                  </p>
                </div>
              </ClickReveal>
            );
          })}
        </div>
        <ClickReveal at={totalSteps}>
          <p className="text-xl font-medium">{t("closing")}</p>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
