"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "register" | "resend" | "requestReset" | "verify" | "reset";
const errors = ["INVALID_INPUT", "INVALID_TOKEN", "LIMIT_REACHED", "CONFLICT", "FORBIDDEN", "DISABLED", "UNAVAILABLE"] as const;
type ErrorCode = typeof errors[number];
export function CustomerAccountForm({ mode, token }: { mode: Mode; token?: string }) {
  const t = useTranslations("customerAccount"), locale = useLocale();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const operation = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [status, setStatus] = useState<"CHECK_EMAIL" | "VERIFIED" | "RESET" | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setStatus(null); setPending(true);
    if (!operation.current) operation.current = crypto.randomUUID();
    const body = mode === "register" ? { action: mode, name, email, password, locale, operationId: operation.current } : mode === "verify" ? { action: mode, token, locale } : mode === "reset" ? { action: mode, token, password, locale } : { action: mode, email, locale };
    try {
      const response = await fetch("/api/stempelfi/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data: unknown = await response.json();
      if (data && typeof data === "object" && "status" in data && response.ok && (data.status === "CHECK_EMAIL" || data.status === "VERIFIED" || data.status === "RESET")) setStatus(data.status);
      else {
        const code = data && typeof data === "object" && "error" in data ? data.error : null;
        setError(errors.find(value => value === code) ?? "UNAVAILABLE");
      }
    } catch { setError("UNAVAILABLE"); }
    finally { setPending(false); }
  }
  return <div className="grid min-w-0 gap-6">
    <h1 className="text-2xl font-semibold">{t(mode)}</h1>
    {status ? <p role="status">{t(status)}</p> : <form onSubmit={submit} className="grid gap-4">
      {mode === "register" && <div className="grid gap-2"><Label htmlFor="customer-name">{t("name")}</Label><Input className="min-h-11 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-invalid={error === "INVALID_INPUT"} aria-describedby={error ? "account-error" : undefined} id="customer-name" name="name" autoComplete="name" required maxLength={160} value={name} onChange={e => setName(e.target.value)} /></div>}
      {["register", "resend", "requestReset"].includes(mode) && <div className="grid gap-2"><Label htmlFor="customer-email">{t("email")}</Label><Input className="min-h-11 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-invalid={error === "INVALID_INPUT"} aria-describedby={error ? "account-error" : undefined} id="customer-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></div>}
      {(mode === "register" || mode === "reset") && <div className="grid gap-2"><Label htmlFor="customer-password">{t("password")}</Label><Input className="min-h-11 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-invalid={error === "INVALID_INPUT"} aria-describedby={error ? "account-error" : undefined} id="customer-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></div>}
      {error && <p id="account-error" role="alert" className="text-destructive">{t(error)}</p>}
      <Button className="min-h-11 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" type="submit" disabled={pending} aria-describedby={error ? "account-error" : undefined}>{t(pending ? "pending" : "submit")}</Button>
    </form>}
    <nav aria-label={t("title")} className="grid gap-3">
      <Link className="rounded underline focus-visible:[outline-style:solid] focus-visible:outline-2" href="/sign-in?destination=stempelfi">{t("login")}</Link>
      {(["register", "resend", "requestReset"] as const).filter(value => value !== mode).map(value => <Link className="rounded underline focus-visible:[outline-style:solid] focus-visible:outline-2" key={value} href={"/tools/calem/stempelkarten/account?mode=" + value}>{t(value)}</Link>)}
    </nav>
  </div>;
}
