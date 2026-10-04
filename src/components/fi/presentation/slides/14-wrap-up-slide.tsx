import { getTranslations } from "next-intl/server";
import { SlideCard } from "@/components/fi/presentation/slide-card";
import { Badge } from "@/components/ui/badge";
import {
  AutoReveal,
  ClickReveal,
  ClickSteps,
} from "@/components/fi/presentation/reveal";

export async function WrapUpSlide() {
  const t = await getTranslations("presentation.wrapUp");
  const departments = t.raw("departments") as string[];

  return (
    <SlideCard className="relative items-center justify-center overflow-hidden text-center">
      <ClickSteps
        className="relative flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6"
        maxSteps={2}
      >
        <AutoReveal index={0}>
          <h2 className="text-6xl font-semibold">{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className="text-muted-foreground text-3xl">{t("subheading")}</p>
        </AutoReveal>
        <ClickReveal at={1}>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {departments.map((department) => (
              <Badge
                key={department}
                variant="outline"
                className="h-auto px-3 py-1 text-lg"
              >
                {department}
              </Badge>
            ))}
          </div>
        </ClickReveal>
        <ClickReveal at={2}>
          <p className="text-2xl font-medium">{t("prompt")}</p>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
