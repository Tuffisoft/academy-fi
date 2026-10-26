import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Loading() {
  const t = await getTranslations("membership");
  return <section className="grid gap-5 p-5" aria-busy="true"><p role="status">{t("loading")}</p><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></section>;
}
