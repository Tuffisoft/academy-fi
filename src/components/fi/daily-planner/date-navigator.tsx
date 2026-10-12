"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shiftPlanDate } from "@/lib/daily-plan-date";

export function DateNavigator({
  date,
  today,
}: {
  date: string;
  today: string;
}) {
  const t = useTranslations("dailyPlanner");
  const router = useRouter();

  function goTo(next: string) {
    router.push(`/daily-planner?date=${next}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label={t("previousDay")}
        onClick={() => goTo(shiftPlanDate(date, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        value={date}
        aria-label={t("pickDate")}
        className="w-auto"
        onChange={(e) => e.target.value && goTo(e.target.value)}
      />
      <Button
        variant="outline"
        size="icon"
        aria-label={t("nextDay")}
        onClick={() => goTo(shiftPlanDate(date, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        disabled={date === today}
        onClick={() => goTo(today)}
      >
        {t("today")}
      </Button>
    </div>
  );
}
