import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function PortalLoading() {
  const t = await getTranslations("common");
  return <main aria-busy="true" className="grid gap-5 p-6"><p role="status">{t("loading")}</p><Skeleton className="h-12 w-3/4" /><Skeleton className="h-48 w-full" /></main>;
}
