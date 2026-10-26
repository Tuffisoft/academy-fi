import "server-only";
import { prisma } from "@/lib/prisma";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { executeMembership, MembershipError, type MembershipDelivery } from "./memberships";
import { membershipsEnabled } from "./membership-feature";
import { invitationMailConfigured, InvitationMailError, sendInvitationMail } from "./invitation-mail";
import { deliveryStates, type DeliveryState, type MembershipErrorCode, type MembershipReply } from "./membership-reply";

export function membershipFailure(code: MembershipErrorCode, locale: "de" | "en"): MembershipReply {
  return { ok: false, error: { code, message: (locale === "de" ? de : en).membership.errors[code] } };
}
async function deliveryStatus(organizationId: string, invitationId: string): Promise<DeliveryState> {
  const row = await prisma.organizationInvitation.findFirst({ where: { organizationId, id: invitationId }, select: { deliveryStatus: true } });
  return deliveryStates.find(state => state === row?.deliveryStatus) ?? "UNKNOWN";
}
async function deliver(mail: MembershipDelivery, locale: "de" | "en", send: typeof sendInvitationMail): Promise<DeliveryState> {
  if (!invitationMailConfigured()) return "NOT_SENT";
  // Mark uncertainty durably before external I/O; a crash cannot imply a successful send.
  const started = await prisma.organizationInvitation.updateMany({ where: { id: mail.invitationId, organizationId: mail.organizationId, deliveryAttemptId: mail.attemptId, status: "PENDING", expiresAt: { gt: new Date() } }, data: { deliveryStatus: "UNKNOWN", providerId: null, deliveryUpdatedAt: new Date() } });
  if (started.count !== 1) return "UNKNOWN";
  let state: DeliveryState, providerId: string | null = null;
  try { providerId = await send(mail, locale); state = "PROVIDER_ACCEPTED"; }
  catch (error) { state = error instanceof InvitationMailError ? error.state : "UNKNOWN"; }
  try {
    const updated = await prisma.organizationInvitation.updateMany({ where: { id: mail.invitationId, organizationId: mail.organizationId, deliveryAttemptId: mail.attemptId }, data: { deliveryStatus: state, providerId, deliveryUpdatedAt: new Date() } });
    return updated.count === 1 ? state : "UNKNOWN";
  } catch { return "UNKNOWN"; } // Invitation is committed; provider result could not be persisted.
}

/** Public adapters must return this sanitized reply, never the underlying delivery material. */
export async function runMembershipWorkflow(actorId: string, command: unknown, locale: "de" | "en", send = sendInvitationMail): Promise<MembershipReply> {
  if (!membershipsEnabled()) return membershipFailure("DISABLED", locale);
  try {
    const result = await executeMembership(actorId, command);
    let state: DeliveryState | null = null;
    if (result.delivery) {
      try { state = await deliver(result.delivery, locale, send); } catch { state = "UNKNOWN"; }
    } else if (command && typeof command === "object" && "action" in command && ["INVITE", "ROTATE_INVITATION"].includes(String(command.action)) && "organizationId" in command && typeof command.organizationId === "string") {
      try { state = await deliveryStatus(command.organizationId, result.resultId); } catch { state = "UNKNOWN"; }
    }
    return { ok: true, data: { resultId: result.resultId, replayed: result.replayed, deliveryStatus: state } };
  } catch (error) { return membershipFailure(error instanceof MembershipError ? error.code : "UNAVAILABLE", locale); }
}
