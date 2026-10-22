import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function LeadResearchCard() {
  const t = await getTranslations("leadResearch");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/lead-research" />}>
            {t("open")}
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
