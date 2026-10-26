import { notFound } from "next/navigation";
import { membershipsEnabled } from "@/lib/loyalty/membership-feature";
import { getCurrentSession } from "@/lib/session";
import { InvitationAcceptance } from "@/components/loyalty/invitation-acceptance";

export const dynamic = "force-dynamic";
export const metadata = { title: "StempelFi", referrer: "no-referrer", robots: { index: false, follow: false } } as const;
export default async function InvitationPage() {
  if (!membershipsEnabled()) notFound();
  return <InvitationAcceptance signedIn={Boolean(await getCurrentSession())} />;
}
