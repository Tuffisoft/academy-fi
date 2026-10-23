import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StempelFiLanding } from "@/components/loyalty/stempelfi-design";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stempelfi");
  return { title: "StempelFi", description: t("intro"), robots: { index: false, follow: false } };
}

export default function StempelFiPage() {
  return <StempelFiLanding />;
}
