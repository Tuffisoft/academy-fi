import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ArchivedPlan = {
  id: string;
  date: string;
  title: string;
  stages: { completed: boolean }[];
};

export async function PlanArchive({
  plans,
  activeDate,
  nextLimit,
}: {
  plans: ArchivedPlan[];
  activeDate: string;
  nextLimit: number | null;
}) {
  const t = await getTranslations("dailyPlanner");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("archiveTitle")}</h2>
      {plans.length === 0 ? (
        <p className="text-muted-foreground">{t("archiveEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/daily-planner?date=${plan.date}`}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-md border px-4 py-3 hover:bg-muted",
                  plan.date === activeDate && "bg-muted",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {plan.date}
                  </span>
                  <span className="font-medium">{plan.title}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("archiveProgress", {
                    done: plan.stages.filter((s) => s.completed).length,
                    total: plan.stages.length,
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {nextLimit && (
        <Link
          href={`/daily-planner?date=${activeDate}&archive=${nextLimit}`}
          scroll={false}
          className="text-sm underline"
        >
          {t("archiveMore")}
        </Link>
      )}
    </section>
  );
}
