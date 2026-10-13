import { Resend } from "resend";
import { getTranslations } from "next-intl/server";

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
