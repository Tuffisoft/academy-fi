import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getDailyPlan } from "@/lib/data/daily-plans";
import { isValidPlanDate, todayPlanDate } from "@/lib/daily-plan-date";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { DateNavigator } from "@/components/fi/daily-planner/date-navigator";
import { PlanEditor } from "@/components/fi/daily-planner/plan-editor";

export default async function DailyPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const t = await getTranslations("dailyPlanner");

  const today = todayPlanDate();
  const { date: requested } = await searchParams;
  // Fall back to today for missing or malformed dates
  const date = requested && isValidPlanDate(requested) ? requested : today;

  const plan = await getDailyPlan(user.id, date);

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
      </main>
    </div>
  );
}
