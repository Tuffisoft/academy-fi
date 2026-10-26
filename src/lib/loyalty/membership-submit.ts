import "server-only";
import { z } from "zod";
import { membershipRequest } from "./memberships";
import { membershipFailure, runMembershipWorkflow } from "./membership-workflow";

export const membershipSubmission = z.object({ locale: z.enum(["de", "en"]), command: membershipRequest, confirmOwnership: z.boolean().optional() }).strict();
export async function submitMembership(actorId: string, raw: unknown) {
  const parsed = membershipSubmission.safeParse(raw);
  const locale = raw && typeof raw === "object" && "locale" in raw && raw.locale === "de" ? "de" : "en";
  if (!parsed.success) return membershipFailure("INVALID_INPUT", locale);
  if (parsed.data.command.action === "TRANSFER_OWNER" && parsed.data.confirmOwnership !== true) return membershipFailure("INVALID_INPUT", locale);
  return runMembershipWorkflow(actorId, parsed.data.command, parsed.data.locale);
}
