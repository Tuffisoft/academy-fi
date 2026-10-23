import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { Button } from "@/components/ui/button";

export default async function CompanyNotFound() {
  const t = await getTranslations("stempelfi");
  return <main><ProductHeader portal /><section className="grid gap-5 p-6"><h1 className="text-2xl">{t("companyUnavailable")}</h1><Button variant="outline" className="min-h-11 justify-self-start" nativeButton={false} render={<Link href="/tools/calem/stempelkarten/app" />}>{t("yourCompanies")}</Button></section></main>;
}
