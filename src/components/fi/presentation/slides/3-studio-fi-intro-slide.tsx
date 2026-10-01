import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  SlideCard,
  slideSubheading,
  slideBody,
} from "@/components/fi/presentation/slide-card";
import { AutoReveal, ClickReveal, ClickSteps } from "@/components/fi/presentation/reveal";

export async function StudioFiIntroSlide() {
  const t = await getTranslations("presentation.studioFi");
  const points = t.raw("points") as string[];

  return (
    <SlideCard className="relative items-stretch justify-center overflow-hidden text-left">
      <ClickSteps className="relative flex w-full flex-1 flex-col gap-3" maxSteps={points.length}>
        <AutoReveal index={0} className="relative">
          <Image
            src="/logo/logo-dark.png"
            alt="Studio Fi"
            width={140}
            height={140}
            className="hidden dark:block"
            priority
          />
          <Image
            src="/logo/logo-light.png"
            alt="Studio Fi"
            width={140}
            height={140}
            className="block dark:hidden"
            priority
          />
        </AutoReveal>
        <AutoReveal index={1} className="relative">
          <p className={slideSubheading}>{t("tagline")}</p>
        </AutoReveal>
        <ul className="relative mt-2 flex flex-col gap-2">
          {points.map((point, index) => (
            <ClickReveal at={index + 1} key={point}>
              <li className={slideBody}>{point}</li>

            </ClickReveal>
          ))}
        </ul>
      </ClickSteps>
    </SlideCard>
  );
}
