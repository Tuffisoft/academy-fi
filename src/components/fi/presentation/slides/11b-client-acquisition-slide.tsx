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
import { PieSegment } from "@/components/fi/presentation/pie-segment";

// Counts aren't localised, so they live here rather than in the translation files.
const sources = [
  { key: "selfContact", count: 3, color: "var(--chart-1)" },
  { key: "familyFriends", count: 3, color: "var(--chart-2)" },
  { key: "clientRecommendations", count: 2, color: "var(--chart-3)" },
  { key: "coldOutreach", count: 1, color: "var(--chart-4)" },
  { key: "clientOutreach", count: 0, color: "var(--chart-5)" },
];

const RADIUS = 70;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const total = sources.reduce((sum, source) => sum + source.count, 0);

export async function ClientAcquisitionSlide() {
  const t = await getTranslations("presentation.clientAcquisition");
  const labels = t.raw("sources") as Record<string, string>;
  const totalSteps = sources.length + 1;

  // Precompute cumulative offsets instead of mutating during render
  const offsets = sources.reduce<number[]>((acc, source, index) => {
    const prev = index === 0 ? 0 : acc[index - 1];
    const dash = (source.count / total) * CIRCUMFERENCE;
    acc.push(prev + dash);
    return acc;
  }, []);

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
        <div className="relative flex flex-1 items-center justify-center gap-10">
          <svg
            viewBox="0 0 170 170"
            className="size-48 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="85"
              cy="85"
              r={RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth="24"
            />
            {sources.map((source, index) => {
              const fraction = source.count / total;
              const dash = fraction * CIRCUMFERENCE;
              const offset = index === 0 ? 0 : offsets[index - 1];
              return (
                <PieSegment
                  key={source.key}
                  at={index + 1}
                  cx="85"
                  cy="85   "
                  r={RADIUS}
                  fill="none"
                  stroke={source.color}
                  strokeWidth="24"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div className="flex flex-col gap-3">
            {sources.map((source, index) => (
              <ClickReveal
                at={index + 1}
                key={source.key}
                className="flex items-center gap-2"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <span className="text-lg font-medium">
                  {labels[source.key]}
                </span>
                <span className="text-muted-foreground text-lg">
                  ({source.count})
                </span>
              </ClickReveal>
            ))}
          </div>
        </div>
      </ClickSteps>
    </SlideCard>
  );
}
