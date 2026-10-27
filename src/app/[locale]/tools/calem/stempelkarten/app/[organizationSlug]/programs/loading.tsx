import { getTranslations } from "next-intl/server";
export default async function Loading() {
  const t = await getTranslations("stempelfi.programEditor");
  return <p role="status" className="p-5">{t("loading")}</p>;
}
