import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function DailyPlannerCard() {
  const t = await getTranslations("home");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dailyPlannerCardTitle")}</CardTitle>
        <CardDescription>{t("dailyPlannerCardDescription")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/daily-planner" />}>
            {t("openDailyPlanner")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
