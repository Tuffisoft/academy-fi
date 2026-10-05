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

export async function IdeasCard() {
  const t = await getTranslations("home");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ideasCardTitle")}</CardTitle>
        <CardDescription>{t("ideasCardDescription")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/ideas" />}>
            {t("openIdeas")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
