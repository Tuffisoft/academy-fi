import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  SlideCard,
  slideHeading,
  slideSubheading,
} from "@/components/fi/presentation/slide-card";
import { AutoReveal, ClickReveal, ClickSteps } from "@/components/fi/presentation/reveal";

type ClientItem = {
  name: string;
  link: string;
  description: string;
  highlight: string;
  tags: string;
};

// Logo filenames live in public/clients and aren't localised, so they're mapped here
// rather than in the translation files. Order here also controls display order.
const clientLogos: Record<string, { logo?: string; logoLight?: string; logoDark?: string }> = {
  spvg: { logo: "spvg.png" },
  schoner: { logo: "schoner.png" },
  mittt: { logo: "MITTT.png" },
  restory: { logoLight: "ReStoryLight.png", logoDark: "ReStoryDark.png" },
  treestory: { logoLight: "TreeStoryLight.png", logoDark: "TreeStoryDark.png" },
  wemakespace: { logo: "wemakespace.png" },
  bredinnaboinne: {
    logoLight: "bredinnaboinne-with-text-light.png",
    logoDark: "bredinnaboinne-with-text-dark.png",
  },
  clononycastle: { logo: "clononyCastle.png" },
  rathchairn: { logo: "rathChairn.png" },
};

function ClientLogo({ id, name }: { id: string; name: string }) {
  const { logo, logoLight, logoDark } = clientLogos[id] ?? {};

  if (logo) {
    return (
      <Image
        src={`/clients/${logo}`}
        alt={name}
        width={120}
        height={48}
        className="h-10 w-auto object-contain"
      />
    );
  }

  return (
    <>
      <Image
        src={`/clients/${logoDark}`}
        alt={name}
        width={120}
        height={48}
        className="hidden h-10 w-auto object-contain dark:block"
      />
      <Image
        src={`/clients/${logoLight}`}
        alt={name}
        width={120}
        height={48}
        className="block h-10 w-auto object-contain dark:hidden"
      />
    </>
  );
}

export async function ClientsSlide() {
  const t = await getTranslations("presentation.clients");
  const items = t.raw("items") as Record<string, ClientItem>;
  const clients = Object.keys(clientLogos).map((id) => ({ id, ...items[id] }));

  return (
    <SlideCard className="relative items-stretch justify-start overflow-hidden text-left">
      <ClickSteps
        className="relative flex h-full flex-col gap-3"
        maxSteps={clients.length}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto">
          {clients.map((client, index) => (
            <ClickReveal at={index + 1} key={client.id} className="flex flex-col gap-1.5">
              <a
                href={client.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center"
              >
                <ClientLogo id={client.id} name={client.name} />
              </a>
              <span className="text-xs font-semibold">{client.highlight}</span>
              <span className="text-muted-foreground text-[11px] leading-tight">
                {client.description}
              </span>
              <span className="text-muted-foreground/70 text-[10px] tracking-wide uppercase">
                {client.tags}
              </span>
            </ClickReveal>
          ))}
        </div>
      </ClickSteps>
    </SlideCard>
  );
}
