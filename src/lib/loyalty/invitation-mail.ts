import "server-only";
import { Resend } from "resend";
import type { MembershipDelivery } from "./memberships";

export class InvitationMailError extends Error {
  constructor(public readonly state: "FAILED" | "UNKNOWN") {
    super("Invitation mail unavailable");
  }
}
export function invitationMailConfigured() {
  return Boolean(
    (process.env.RESEND_KEY || process.env.RESEND_API_KEY) &&
    process.env.RESEND_FROM_EMAIL,
  );
}
export function invitationMailContent(
  mail: MembershipDelivery,
  locale: "de" | "en",
  baseUrl: string,
) {
  const base = new URL(baseUrl);
  if (
    base.username ||
    base.password ||
    (base.protocol !== "https:" &&
      !(
        base.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)
      ))
  )
    throw new InvitationMailError("FAILED");
  const url = new URL(`/${locale}/tools/calem/stempelkarten/invitation`, base);
  // Fragment keeps bearer tokens out of HTTP paths, access logs and referrers.
  url.hash = new URLSearchParams({
    organization: mail.organizationId,
    token: mail.token,
  }).toString();
  const de = locale === "de";
  const subject = de
    ? "Deine Einladung zu StempelFi"
    : "Your StempelFi invitation";
  const intro = de
    ? "Du wurdest eingeladen, einem Unternehmen auf StempelFi beizutreten. Melde dich mit der bestätigten E-Mail-Adresse dieses Postfachs an und bestätige die Einladung ausdrücklich."
    : "You have been invited to join a business on StempelFi. Sign in with this mailbox’s verified email address and explicitly accept the invitation.";
  const expiry =
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(mail.expiresAt) + " UTC";
  const note = de
    ? `Gültig bis ${expiry}. Ein erneut gesendeter Link ersetzt den vorherigen Link, verlängert aber die ursprüngliche Frist von sieben Tagen nicht. Falls du die Einladung nicht erwartest, ignoriere sie.`
    : `Valid until ${expiry}. A resent link replaces the previous link without extending the original seven-day period. If you did not expect this invitation, ignore it.`;
  return { subject, text: intro + "\n\n" + url.href + "\n\n" + note };
}
export async function sendInvitationMail(
  mail: MembershipDelivery,
  locale: "de" | "en",
) {
  const key = process.env.RESEND_KEY || process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw new InvitationMailError("FAILED");
  const content = invitationMailContent(
    mail,
    locale,
    process.env.BETTER_AUTH_URL ?? "",
  );
  const { data, error } = await new Resend(key).emails.send(
    { from, to: mail.to, ...content },
    { idempotencyKey: mail.attemptId },
  );
  if (error) {
    const status = "statusCode" in error ? error.statusCode : null;
    throw new InvitationMailError(
      typeof status === "number" &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 409
        ? "FAILED"
        : "UNKNOWN",
    );
  }
  if (!data?.id) throw new InvitationMailError("UNKNOWN");
  return data.id;
}
