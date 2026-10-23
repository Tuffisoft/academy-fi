import { getLocale } from "next-intl/server";

export default async function Loading() {
  const locale = await getLocale();
  return <p role="status" className="p-4">{locale === "de" ? "Unternehmensdaten werden geladen …" : "Loading organization data …"}</p>;
}
