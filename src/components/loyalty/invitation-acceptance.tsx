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
    <main className="min-w-0">
      <ProductHeader portal languageHref={languageHref} />
      <section className="mx-auto grid max-w-xl gap-5 px-5 py-10">
        <h1 className="font-serif text-3xl">{t("acceptTitle")}</h1>
        <p>{t("acceptNote")}</p>
        {!loaded ? (
          <p role="status">{t("loading")}</p>
        ) : !link ? (
          <p role="alert">{t("errors.INVALID_INVITATION")}</p>
        ) : !signedIn ? (
          <>
            <p>{t("loginNote")}</p>
            <Link
              className="min-h-11 rounded underline focus-visible:outline-2"
              href={invitationSignInHref(link)}
            >
              {t("login")}
            </Link>
          </>
        ) : reply?.ok ? (
          <>
            <p role="status">{t("accepted")}</p>
            <Link
              className="min-h-11 rounded underline focus-visible:outline-2"
              href="/tools/calem/stempelkarten/app"
            >
              {t("openPortal")}
            </Link>
          </>
        ) : (
          <>
            <Button
              onClick={accept}
              disabled={pending}
              className="min-h-11 justify-self-start focus-visible:outline-style:solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              {t(pending ? "pending" : "accept")}
            </Button>
            {reply && !reply.ok && (
              <p role="alert">{t(`errors.${reply.error.code}`)}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
