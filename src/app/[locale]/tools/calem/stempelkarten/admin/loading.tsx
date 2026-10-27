import { getTranslations } from "next-intl/server";

export default async function AdministrationLoading() {
  const t = await getTranslations("common");
  return <main aria-busy="true" className="p-6"><p role="status">{t("loading")}</p></main>;
}
