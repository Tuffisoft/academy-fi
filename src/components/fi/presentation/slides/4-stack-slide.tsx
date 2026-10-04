import Image from "next/image";
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

type Tool = { name: string; logo?: string; description: string };
type Category = { id: string; label: string; tools: Tool[] };

function ToolTile({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {tool.logo && (
        <div className="bg-muted/40 flex size-12 items-center justify-center rounded-md p-2">
          <Image
            src={`/tech/${tool.logo}`}
            alt={tool.name}
            width={32}
            height={32}
            className="size-full object-contain"
          />
        </div>
      )}
      <span className="text-base font-semibold">{tool.name}</span>
      <span className="text-muted-foreground text-sm leading-tight">
        {tool.description}
      </span>
    </div>
  );
}

export async function StackSlide() {
  const t = await getTranslations("presentation.stack");
  const categories = t.raw("categories") as Category[];
  const future = t.raw("future") as { heading: string; items: Tool[] };

  // Every tool gets its own step, in order, so logos appear one at a time; a
  // category's label reveals alongside its first tool and then stays put.
  let step = 0;
  const categoryBlocks = categories.map((category) => {
    const toolSteps = category.tools.map((tool) => ({ tool, step: ++step }));
    return { ...category, toolSteps, labelStep: toolSteps[0].step };
  });
  const futureSteps = future.items.map((item) => ({
    tool: item,
    step: ++step,
  }));
  const futureLabelStep = futureSteps[0].step;
  const totalSteps = step;

  return (
    <SlideCard className="relative items-stretch justify-start overflow-hidden text-left">
      <ClickSteps
        className="relative flex h-full flex-col gap-3"
        maxSteps={totalSteps}
      >
        <AutoReveal index={0}>
          <h2 className={slideHeading}>{t("heading")}</h2>
        </AutoReveal>
        <AutoReveal index={1}>
          <p className={slideSubheading}>{t("subheading")}</p>
        </AutoReveal>
        <div className="flex flex-1 flex-col justify-center gap-4 overflow-y-auto">
          {categoryBlocks.map((category) => (
            <div key={category.id} className="flex flex-col gap-2">
              <ClickReveal
                at={category.labelStep}
                className="text-muted-foreground text-base font-medium tracking-wide uppercase"
              >
                {category.label}
              </ClickReveal>
              <div className="grid grid-cols-4 gap-x-4 gap-y-3 sm:grid-cols-6">
                {category.toolSteps.map(({ tool, step }) => (
                  <ClickReveal at={step} key={tool.name}>
                    <ToolTile tool={tool} />
                  </ClickReveal>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-3">
            <ClickReveal
              at={futureLabelStep}
              className="text-muted-foreground text-base font-medium tracking-wide uppercase"
            >
              {future.heading}
            </ClickReveal>
            <div className="grid grid-cols-4 gap-x-4 gap-y-3 sm:grid-cols-6">
              {futureSteps.map(({ tool, step }) => (
                <ClickReveal at={step} key={tool.name}>
                  <ToolTile tool={tool} />
                </ClickReveal>
              ))}
            </div>
          </div>
        </div>
      </ClickSteps>
    </SlideCard>
  );
}
