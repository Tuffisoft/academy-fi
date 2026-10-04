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

type Rule = { title: string; description: string };

export async function HouseRulesSlide() {
  const t = await getTranslations("presentation.houseRules");
  const rules = t.raw("rules") as Rule[];

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps
        className="relative flex w-full flex-1 flex-col gap-4"
        maxSteps={rules.length}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <div className="grid flex-1 grid-cols-1 content-center gap-4 sm:grid-cols-2">
          {rules.map((rule, index) => (
            <ClickReveal
              at={index + 1}
              key={rule.title}
              className={
                index === rules.length - 1
                  ? "sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-sm"
                  : undefined
              }
            >
              <div className="border-border bg-muted/30 flex h-full flex-col gap-1.5 rounded-xl border p-4">
                <h3 className="text-3xl font-semibold">{rule.title}</h3>
                <p className="text-muted-foreground text-xl">
                  {rule.description}
                </p>
              </div>
            </ClickReveal>
          ))}
        </div>
      </ClickSteps>
    </SlideCard>
  );
}
