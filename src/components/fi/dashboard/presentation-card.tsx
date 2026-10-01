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

export async function PresentationCard() {
  const t = await getTranslations("presentation");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/presentation" />}>
            {t("open")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
