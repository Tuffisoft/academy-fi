import { Resend } from "resend";
import { getTranslations } from "next-intl/server";
import { leadExportEmailContent } from "@/lib/lead-research/email-export";

export function getLeadExportEmailSettings() {
  const recipient = process.env.LEAD_EXPORT_EMAIL_TO?.trim() ?? "";
  const validRecipient = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(recipient);
  return {
    recipient: validRecipient ? recipient : null,
    configured: Boolean(validRecipient && (process.env.RESEND_KEY || process.env.RESEND_API_KEY) && process.env.RESEND_FROM_EMAIL),
  };
}

export async function sendLeadExportEmail(input: {
  name: string; count: number; missingCount: number; csv: string; requestId: string; userId: string;
}) {
  const settings = getLeadExportEmailSettings();
  if (!settings.configured || !settings.recipient) throw new Error("lead_email_not_configured");
  const resend = new Resend(process.env.RESEND_KEY || process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: settings.recipient,
    ...leadExportEmailContent(input),
  }, { idempotencyKey: `lead-export/${input.userId}/${input.requestId}` });
  if (error || !data?.id) throw new Error("lead_email_send_failed");
  return data.id;
}

export async function sendResetPasswordEmail({
  to,
  name,
  url,
  locale,
}: {
  to: string;
  name: string;
  url: string;
  locale: string;
}) {
  // The auth route imports this module during builds, before email is needed.
  const apiKey = process.env.RESEND_KEY || process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error(
      "E-Mail-Versand ist nicht eingerichtet. RESEND_KEY (oder RESEND_API_KEY) und RESEND_FROM_EMAIL fehlen.",
    );
  }
  const resend = new Resend(apiKey);
  const t = await getTranslations({ locale, namespace: "email" });

  const { error } = await resend.emails.send({
    from,
    to,
    subject: t("subject"),
    html: `<p>${t("greeting", { name })}</p><p>${t("intro")}</p><p><a href="${url}">${url}</a></p><p>${t("expiry")}</p>`,
  });
  if (error) {
    throw new Error("Die Passwort-Reset-Mail konnte nicht versendet werden.");
  }
}
