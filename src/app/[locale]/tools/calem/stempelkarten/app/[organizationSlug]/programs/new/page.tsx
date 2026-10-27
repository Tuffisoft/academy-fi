import { ProgramPage } from "@/components/loyalty/program-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "StempelFi", referrer: "no-referrer", robots: { index: false, follow: false } } as const;
export default async function Page({ params }: { params: Promise<{ organizationSlug: string }> }) {
  return <ProgramPage slug={(await params).organizationSlug} />;
}
