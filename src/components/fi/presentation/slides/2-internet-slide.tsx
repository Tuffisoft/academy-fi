import { getTranslations } from "next-intl/server";
import { Globe, Network, FileText, Coffee, Users, Heart } from "lucide-react";
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
  StepVisual,
} from "@/components/fi/presentation/reveal";
import { LinkPreview } from "@/components/fi/presentation/link-preview";

// One icon per reveal step (0 = initial view).
// Index of the "1991: ... first website" point, which gets a clickable preview.
const FIRST_WEBSITE_POINT_INDEX = 1;
const visualSteps = [
  { Icon: Globe, label: "The Internet" },
  { Icon: Network, label: "ARPANET, 1969" },
  { Icon: FileText, label: "First website, 1991" },
  { Icon: Coffee, label: "Internet café, 1996" },
  { Icon: Users, label: "Billions online, today" },
  { Icon: Heart, label: "Why I love it" },
];

export async function InternetSlide() {
  const t = await getTranslations("presentation.internet");
  const points = t.raw("points") as string[];

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps
        className="relative flex w-full flex-1 flex-col gap-3"
        maxSteps={points.length}
      >
        <StepVisual
          className="absolute right-6 bottom-6 size-20"
          steps={visualSteps.map(({ Icon, label }) => (
            <Icon
              key={label}
              aria-label={label}
              className="text-muted-foreground/40 size-full"
              strokeWidth={1.5}
            />
          ))}
        />
        <AutoReveal index={0} className="relative">
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1} className="relative">
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <ul className="relative mt-2 flex flex-col gap-2">
          {points.map((point, index) => (
            <ClickReveal at={index + 1} key={point}>
              <li className={slideBody}>
                {index === FIRST_WEBSITE_POINT_INDEX ? (
                  <LinkPreview
                    href="https://info.cern.ch/hypertext/WWW/TheProject.html"
                    label="The first website"
                  >
                    {point}
                  </LinkPreview>
                ) : (
                  point
                )}
              </li>
            </ClickReveal>
          ))}
        </ul>
      </ClickSteps>
    </SlideCard>
  );
}
