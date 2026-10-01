import { Resend } from "resend";
import { getTranslations } from "next-intl/server";

const resend = new Resend(process.env.RESEND_KEY);

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
  const t = await getTranslations({ locale, namespace: "email" });

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: t("subject"),
    html: `<p>${t("greeting", { name })}</p><p>${t("intro")}</p><p><a href="${url}">${url}</a></p><p>${t("expiry")}</p>`,
  });
}
