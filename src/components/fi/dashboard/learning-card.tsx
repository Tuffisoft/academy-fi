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

export async function LearningCard() {
  const t = await getTranslations("home");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("learningCardTitle")}</CardTitle>
        <CardDescription>{t("learningCardDescription")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/learning" />}>
            {t("openLearning")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
