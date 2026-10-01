import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SlideCard, slideHeading } from "@/components/fi/presentation/slide-card";
import { AutoReveal, ClickSteps } from "@/components/fi/presentation/reveal";

export async function WelcomeSlide() {
  const t = await getTranslations("presentation.welcome");

  return (
    <SlideCard className="flex flex-col items-center justify-center">
      <ClickSteps maxSteps={0}>
        <AutoReveal index={1}>
          <h2 className={`${slideHeading} justify-start text-left`}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={0}>
          <Image
            src="/logo/logo-dark.png"
            alt="Studio Fi"
            width={360}
            height={360}
            className="hidden dark:block"
            priority
          />
          <Image
            src="/logo/logo-light.png"
            alt="Studio Fi"
            width={360}
            height={360}
            className="block dark:hidden"
            priority
          />
        </AutoReveal>
  
      </ClickSteps>
    </SlideCard>
  );
}
