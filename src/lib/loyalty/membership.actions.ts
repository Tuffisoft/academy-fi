"use server";

import { getCurrentSession } from "@/lib/session";
import { membershipsEnabled } from "./membership-feature";
import { membershipFailure } from "./membership-workflow";
import { submitMembership } from "./membership-submit";
import type { MembershipReply } from "./membership-reply";

export async function membershipAction(raw: unknown): Promise<MembershipReply> {
  const locale =
    raw && typeof raw === "object" && "locale" in raw && raw.locale === "de"
      ? "de"
      : "en";
  if (!membershipsEnabled()) return membershipFailure("DISABLED", locale);
  try {
    const session = await getCurrentSession();
    if (!session) return membershipFailure("UNAUTHENTICATED", locale);
    return await submitMembership(session.user.id, raw);
  } catch {
    return membershipFailure("UNAVAILABLE", locale);
  }
}
