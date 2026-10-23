import { getLocale } from "next-intl/server";

export default async function NotFound() {
  const de = await getLocale() === "de";
  return <main className="min-w-0 p-4 sm:p-8"><h1 className="text-2xl font-semibold">{de ? "Nicht verfügbar" : "Not available"}</h1><p className="mt-4">{de ? "Dieses Unternehmen ist nicht verfügbar oder du hast keinen Zugriff." : "This organization is unavailable or you do not have access."}</p></main>;
}
