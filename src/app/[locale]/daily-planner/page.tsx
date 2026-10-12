import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getDailyPlan, getDailyPlanArchive } from "@/lib/data/daily-plans";
import { isValidPlanDate, todayPlanDate } from "@/lib/daily-plan-date";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { DateNavigator } from "@/components/fi/daily-planner/date-navigator";
import { PlanEditor } from "@/components/fi/daily-planner/plan-editor";
import { PlanArchive } from "@/components/fi/daily-planner/plan-archive";

const ARCHIVE_STEP = 30;

export default async function DailyPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; archive?: string }>;
}) {
  const user = await requireUser();
  const t = await getTranslations("dailyPlanner");

  const today = todayPlanDate();
  const { date: requested, archive } = await searchParams;
  // Fall back to today for missing or malformed dates
  const date = requested && isValidPlanDate(requested) ? requested : today;

  const limit = Math.min(
    Math.max(Number(archive) || ARCHIVE_STEP, ARCHIVE_STEP),
    1000,
  );
  const [plan, archived] = await Promise.all([
    getDailyPlan(user.id, date),
    // Fetch one extra row to know whether more exist
    getDailyPlanArchive(user.id, today, limit + 1),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <BreadcrumbNav items={[{ label: t("title") }]} />
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <DateNavigator date={date} today={today} />
        {/* key resets the editor's local state when switching days */}
        <PlanEditor key={date} date={date} plan={plan} />
        <PlanArchive
          plans={archived.slice(0, limit)}
          activeDate={date}
          nextLimit={archived.length > limit ? limit + ARCHIVE_STEP : null}
        />
      </main>
    </div>
  );
}
