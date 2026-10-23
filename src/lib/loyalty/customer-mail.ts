import "server-only";
import { Resend } from "resend";
import type { AccountMail } from "./customer-account";

export function customerMailConfigured() {
  return Boolean((process.env.RESEND_KEY || process.env.RESEND_API_KEY) && process.env.RESEND_FROM_EMAIL);
}
export async function sendCustomerMail(mail: AccountMail) {
  const key = process.env.RESEND_KEY || process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const base = new URL(process.env.BETTER_AUTH_URL ?? "");
  if (!key || !from || (base.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) throw new Error("Mail configuration unavailable");
  const url = new URL("/" + mail.locale + "/tools/calem/stempelkarten/account", base);
  url.searchParams.set("mode", mail.kind);
  url.searchParams.set("token", mail.token);
  const de = mail.locale === "de";
  const subject = mail.kind === "verify" ? (de ? "Bestätige dein StempelFi-Konto" : "Verify your StempelFi account") : (de ? "StempelFi-Passwort zurücksetzen" : "Reset your StempelFi password");
  const intro = mail.kind === "verify" ? (de ? "Bestätige deine E-Mail-Adresse, um dein Unternehmen einzurichten." : "Verify your email address to set up your business.") : (de ? "Öffne diesen Link, um dein Passwort zurückzusetzen." : "Open this link to reset your password.");
  const expiry = de ? "Der Link gilt eine Stunde und kann nur einmal bestätigt werden. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail." : "The link expires in one hour and can be confirmed once. If you did not request this, ignore this email.";
  const { data, error } = await new Resend(key).emails.send({ from, to: mail.to, subject, text: intro + "\n\n" + url.href + "\n\n" + expiry });
  if (error || !data?.id) throw new Error("Account mail delivery unavailable");
  return data.id;
}
