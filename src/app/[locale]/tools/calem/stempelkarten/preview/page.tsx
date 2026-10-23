import type { Metadata } from "next";
import { StempelFiPortalPreview } from "@/components/loyalty/stempelfi-design";

export const metadata: Metadata = { title: "StempelFi · Design", robots: { index: false, follow: false } };

export default async function StempelFiPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <StempelFiPortalPreview initialEditor={view === "editor"} />;
}
