"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function PortalAccountControls() {
  const t = useTranslations("stempelfi"), auth = useTranslations("auth");
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out unavailable");
      router.replace("/sign-in?destination=stempelfi");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  if (!session && !failed) return null;
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-3" aria-busy={pending}>
      {session && <p className="min-w-0 break-all text-sm text-muted-foreground">{t("accountEmail", { email: session.user.email })}</p>}
      <Button type="button" variant="outline" disabled={pending} onClick={signOut}
        className="min-h-11 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        {pending ? t("signingOut") : auth("signOut")}
      </Button>
      {failed && <p role="alert" className="w-full text-right text-sm text-destructive">{t("signOutError")}</p>}
    </div>
  );
}
