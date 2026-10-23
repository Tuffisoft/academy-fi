import { getTranslations } from "next-intl/server";
import { CustomerAccountForm } from "@/components/loyalty/customer-account-form";
import { ProductHeader } from "@/components/loyalty/stempelfi-design";
import { customerRegistrationEnabled } from "@/lib/loyalty/customer-account";

export const dynamic = "force-dynamic";
export const metadata = { referrer: "no-referrer", robots: { index: false, follow: false } } as const;
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; token?: string }> }) {
  const t = await getTranslations("customerAccount");
  const query = await searchParams;
  const mode = query.mode === "verify" || query.mode === "reset" || query.mode === "resend" || query.mode === "requestReset" ? query.mode : "register";
  const token = typeof query.token === "string" && /^[A-Za-z0-9_-]{43}$/.test(query.token) ? query.token : undefined;
  const languageHref = "/tools/calem/stempelkarten/account?mode=" + mode + (token ? "&token=" + encodeURIComponent(token) : "");
  return <main className="min-w-0"><ProductHeader portal languageHref={languageHref} /><section className="mx-auto max-w-md px-5 py-10">{customerRegistrationEnabled() ? <CustomerAccountForm key={mode} mode={mode} token={token} /> : <p role="status">{t("disabled")}</p>}</section></main>;
}
