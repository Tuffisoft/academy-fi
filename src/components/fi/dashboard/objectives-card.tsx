import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function ObjectivesCard() {
  const t = await getTranslations("home");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("objectivesCardTitle")}</CardTitle>
        <CardDescription>{t("objectivesCardDescription")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/objectives" />}>
            {t("openObjectives")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
