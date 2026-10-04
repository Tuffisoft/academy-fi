import { getTranslations } from "next-intl/server";
import { Eye, Search, Palette, Rocket, Send } from "lucide-react";
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
import { LinkPreview } from "@/components/fi/presentation/link-preview";

type Step = { title: string; description: string };

const icons = [Eye, Search, Palette, Rocket, Send];

export async function StrategySlide() {
  const t = await getTranslations("presentation.strategy");
  const steps = t.raw("steps") as Step[];
  const example = t("example");
  const totalSteps = steps.length + 1;

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
        <div className="relative flex flex-1 items-center">
          <div className="relative grid w-full grid-cols-5 gap-2">
            <div className="border-border absolute top-6 right-0 left-0 border-t" />
            {steps.map((step, index) => {
              const Icon = icons[index];
              return (
                <ClickReveal at={index + 1} key={step.title}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="border-primary/40 bg-background text-primary flex size-12 items-center justify-center rounded-full border-2">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground text-lg">
                      {step.description}
                    </p>
                  </div>
                </ClickReveal>
              );
            })}
          </div>
        </div>
        <ClickReveal at={totalSteps} className="text-center">
          <LinkPreview
            href={example}
            label="Live example"
            triggerClassName="text-xl font-medium"
          >
            {example}
          </LinkPreview>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
