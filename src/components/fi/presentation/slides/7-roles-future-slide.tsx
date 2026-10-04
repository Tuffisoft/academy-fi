import { getTranslations } from "next-intl/server";
import { cn } from "cn";
import {
  SlideCard,
  slideHeading,
  slideSubheading,
  slideBody,
} from "@/components/fi/presentation/slide-card";
import {
  AutoReveal,
  ClickReveal,
  ClickSteps,
} from "@/components/fi/presentation/reveal";

type Department = { name: string; description: string };

export async function RolesFutureSlide() {
  const t = await getTranslations("presentation.rolesFuture");
  const departments = t.raw("departments") as Department[];
  const totalSteps = departments.length + 1;

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
        <div className="grid flex-1 grid-cols-1 content-center gap-4 sm:grid-cols-2">
          {departments.map((department, index) => (
            <ClickReveal at={index + 1} key={department.name}>
              <div className="border-border bg-muted/30 flex h-full flex-col gap-1.5 rounded-xl border p-4">
                <h3 className="text-3xl font-semibold">{department.name}</h3>
                <p className="text-muted-foreground text-xl">
                  {department.description}
                </p>
              </div>
            </ClickReveal>
          ))}
        </div>
        <ClickReveal at={totalSteps}>
          <p className={cn(slideBody, "text-muted-foreground")}>{t("plan")}</p>
        </ClickReveal>
      </ClickSteps>
    </SlideCard>
  );
}
