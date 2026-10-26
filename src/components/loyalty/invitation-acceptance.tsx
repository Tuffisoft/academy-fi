"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductHeader } from "./stempelfi-design";
import { membershipAction } from "@/lib/loyalty/membership.actions";
import { createOperationId } from "@/lib/loyalty/operation-id";
import { invitationHref, invitationSignInHref, readInvitationFragment } from "@/lib/loyalty/invitation-link";
import {
  isMembershipReply,
  type MembershipReply,
} from "@/lib/loyalty/membership-reply";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CircleAlert, CircleCheck, LoaderCircle, MailOpen } from "lucide-react";

export function InvitationAcceptance({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("membership"),
    locale = useLocale();
  const [link, setLink] = useState<{
    organizationId: string;
    token: string;
  } | null>(null),
    [loaded, setLoaded] = useState(false),
    [pending, setPending] = useState(false),
    [reply, setReply] = useState<MembershipReply | null>(null);
  const operation = useRef<string | null>(null);
  useEffect(() => {
    const read = () => {
      setLink(readInvitationFragment(window.location.hash));
      setLoaded(true);
      setReply(null);
      operation.current = null;
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  async function accept() {
    if (!link) return;
    setPending(true);
    setReply(null);
    try {
      if (!operation.current) operation.current = createOperationId();
      const result = await membershipAction({
        locale: locale === "de" ? "de" : "en",
        command: { action: "ACCEPT", ...link, operationId: operation.current },
      });
      if (!isMembershipReply(result)) throw new Error("Invalid response");
      setReply(result);
    } catch {
      setReply({
        ok: false,
        error: { code: "UNAVAILABLE", message: t("errors.UNAVAILABLE") },
      });
    } finally {
      setPending(false);
    }
  }
  const languageHref = invitationHref(link);
  return (
    <main className="min-h-screen min-w-0 bg-muted/30">
      <ProductHeader portal languageHref={languageHref} />
      <section className="mx-auto w-full min-w-0 max-w-xl px-5 py-10 sm:py-16">
        <Card className="min-w-0 gap-6">
          <CardHeader className="gap-4 border-b pb-6">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary"><MailOpen className="size-6" aria-hidden="true" /></span>
            <Badge variant="secondary">{t("invitationLabel")}</Badge>
            <h1 className="wrap-break-words font-serif text-3xl tracking-tight">{t("acceptTitle")}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("acceptNote")}</p>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-5" aria-busy={!loaded || pending}>
            {!loaded ? (
              <p role="status" className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />{t("acceptLoading")}</p>
            ) : !link ? (
              <p role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />{t("errors.INVALID_INVITATION")}</p>
            ) : !signedIn ? (
              <>
                <p className="text-sm leading-relaxed">{t("loginNote")}</p>
                <Button
                  nativeButton={false}
                  render={<Link href={invitationSignInHref(link)} />}
                  className="min-h-11 w-full"
                >
                  {t("login")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </>
            ) : reply?.ok ? (
              <>
                <p role="status" className="flex items-start gap-3 rounded-lg border bg-accent/50 p-4 text-sm leading-relaxed"><CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />{t("accepted")}</p>
                <Button
                  nativeButton={false}
                  render={<Link href="/tools/calem/stempelkarten/app" />}
                  className="min-h-11 h-auto w-full whitespace-normal py-3"
                >
                  {t("openPortal")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={accept}
                  disabled={pending}
                  className="min-h-11 h-auto w-full whitespace-normal py-3 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                >
                  {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
                  {t(pending ? "pending" : "accept")}
                </Button>
                {reply && !reply.ok && (
                  <p role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />{t(`errors.${reply.error.code}`)}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
