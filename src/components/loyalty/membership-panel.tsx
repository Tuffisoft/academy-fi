"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { membershipAction } from "@/lib/loyalty/membership.actions";
import { createOperationId } from "@/lib/loyalty/operation-id";
import {
  isMembershipReply,
  type MembershipReply,
} from "@/lib/loyalty/membership-reply";
import type { MembershipOverview } from "@/lib/loyalty/membership-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const focus =
  "min-h-11 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";
function MutationForm({
  organizationId,
  command,
  label,
  target = "",
  invite = false,
  owner = false,
  confirmation = false,
}: {
  organizationId: string;
  command: Record<string, string>;
  label: string;
  target?: string;
  invite?: boolean;
  owner?: boolean;
  confirmation?: boolean;
}) {
  const t = useTranslations("membership"),
    locale = useLocale(),
    router = useRouter(),
    formId = useId();
  const intent = useRef<{
    locale: "de" | "en";
    command: Record<string, string>;
    confirmOwnership: boolean;
  } | null>(null);
  const [pending, setPending] = useState(false),
    [reply, setReply] = useState<MembershipReply | null>(null),
    [uncertain, setUncertain] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setReply(null);
    try {
      if (!intent.current)
        intent.current = {
          locale: locale === "de" ? "de" : "en",
          command: {
            ...command,
            organizationId,
            operationId: createOperationId(),
            ...(invite
              ? {
                  email: String(data.get("email") ?? ""),
                  role: data.get("admin") === "ADMIN" ? "ADMIN" : "STAFF",
                }
              : {}),
          },
          confirmOwnership: data.get("confirm") === "yes",
        };
      const result = await membershipAction(intent.current);
      if (!isMembershipReply(result)) throw new Error("Invalid response");
      setReply(result);
      if (result.ok) {
        intent.current = null;
        setUncertain(false);
        form.reset();
        router.refresh();
      } else if (result.error.code === "UNAVAILABLE") setUncertain(true);
      else {
        intent.current = null;
        setUncertain(false);
        if (result.error.code === "FORBIDDEN") router.refresh();
      }
    } catch {
      setUncertain(intent.current !== null);
      setReply({
        ok: false,
        error: { code: "UNAVAILABLE", message: t("errors.UNAVAILABLE") },
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-label={label + " " + target}
      className="grid min-w-0 gap-3"
      aria-busy={pending}
    >
      <fieldset disabled={pending || uncertain} className="grid min-w-0 gap-3">
        {invite && (
          <>
            <div className="grid gap-2">
              <Label htmlFor={formId + "-email"}>{t("email")}</Label>
              <Input
                id={formId + "-email"}
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                className={focus}
                aria-describedby={
                  reply && !reply.ok ? formId + "-feedback" : undefined
                }
                aria-invalid={
                  reply?.ok === false && reply.error.code === "INVALID_INPUT"
                }
              />
            </div>
            {owner && (
              <div className="flex items-center gap-3">
                <Checkbox id={formId + "-admin"} name="admin" value="ADMIN" />
                <Label htmlFor={formId + "-admin"} className="min-h-11 py-3">
                  {t("inviteAdmin")}
                </Label>
              </div>
            )}
          </>
        )}
        {confirmation && (
          <div className="flex items-start gap-3">
            <Checkbox
              id={formId + "-confirm"}
              name="confirm"
              value="yes"
              required
              className="mt-3"
            />
            <Label
              htmlFor={formId + "-confirm"}
              className="min-h-11 py-2 leading-relaxed"
            >
              {t(
                command.action === "TRANSFER_OWNER"
                  ? "confirmTransfer"
                  : "confirmRemove",
                { name: target },
              )}
            </Label>
          </div>
        )}
      </fieldset>
      {uncertain && <p className="text-sm">{t("retryNote")}</p>}
      <Button
        type="submit"
        variant={command.action === "REMOVE_MEMBER" ? "destructive" : "outline"}
        disabled={pending}
        className={
          focus + " h-auto justify-self-start whitespace-normal text-left"
        }
      >
        {t(pending ? "pending" : uncertain ? "retry" : "submitLabel", {
          label,
        })}
      </Button>
      {reply && (
        <p
          id={formId + "-feedback"}
          role={reply.ok ? "status" : "alert"}
          className={
            reply.ok
              ? "wrap-break-words text-sm"
              : "wrap-break-words text-sm text-destructive"
          }
        >
          {reply.ok
            ? t(
                reply.data.deliveryStatus
                  ? `delivery.${reply.data.deliveryStatus}`
                  : "saved",
              )
            : t(`errors.${reply.error.code}`)}
        </p>
      )}
    </form>
  );
}

export function MembershipPanel({
  overview,
}: {
  overview: MembershipOverview;
}) {
  const t = useTranslations("membership"),
    locale = useLocale();
  const { organization, members, invitations, role } = overview;
  return (
    <section className="mx-auto grid w-full max-w-4xl min-w-0 gap-6 px-5 py-10">
      <Link
        className={focus + " justify-self-start rounded underline"}
        href={`/tools/calem/stempelkarten/app/${organization.slug}`}
      >
        {t("back")}
      </Link>
      <header className="grid gap-3">
        <h1 className="wrap-break-words font-serif text-3xl">{t("title")}</h1>
        <p className="wrap-break-words">{organization.name}</p>
        <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
        <p>
          {t("capacity", {
            active: overview.active,
            reserved: overview.reserved,
            limit: overview.limit,
          })}
        </p>
        {overview.active + overview.reserved >= overview.limit && (
          <p role="status">{t("capacityFull")}</p>
        )}
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("invite")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("inviteNote")}</p>
          <MutationForm
            key={role}
            organizationId={organization.id}
            command={{ action: "INVITE" }}
            label={t("invite")}
            invite
            owner={role === "OWNER"}
          />
        </CardContent>
      </Card>
      <section aria-labelledby="membership-active-title" className="grid gap-4">
        <h2 id="membership-active-title" className="text-xl font-semibold">
          {t("members")}
        </h2>
        {members.length === 0 && <p>{t("emptyMembers")}</p>}
        {members.map((member) => (
          <Card key={member.id + member.role}>
            <CardHeader>
              <CardTitle className="wrap-break-words">
                {member.user.name}
              </CardTitle>
              <p className="break-all text-sm text-muted-foreground">
                {member.user.email}
              </p>
              <Badge variant="secondary">{t(`roles.${member.role}`)}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              {member.role !== "OWNER" &&
                (role === "OWNER" || member.role === "STAFF") && (
                  <>
                    {role === "OWNER" && (
                      <MutationForm
                        organizationId={organization.id}
                        command={{
                          action: "CHANGE_ROLE",
                          userId: member.userId,
                          role: member.role === "ADMIN" ? "STAFF" : "ADMIN",
                        }}
                        label={t(
                          member.role === "ADMIN" ? "makeStaff" : "makeAdmin",
                        )}
                        target={member.user.name}
                      />
                    )}
                    <MutationForm
                      organizationId={organization.id}
                      command={{
                        action: "REMOVE_MEMBER",
                        userId: member.userId,
                      }}
                      label={t("remove")}
                      target={member.user.name}
                      confirmation
                    />
                    {role === "OWNER" && (
                      <MutationForm
                        organizationId={organization.id}
                        command={{
                          action: "TRANSFER_OWNER",
                          userId: member.userId,
                        }}
                        label={t("transfer")}
                        target={member.user.name}
                        confirmation
                      />
                    )}
                  </>
                )}
              {member.role === "OWNER" && (
                <p className="text-sm text-muted-foreground">
                  {t("ownerProtected")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>
      <section
        aria-labelledby="membership-invitations-title"
        className="grid gap-4"
      >
        <h2 id="membership-invitations-title" className="text-xl font-semibold">
          {t("invitations")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("latestInvitations")}
        </p>
        {invitations.length === 0 && <p>{t("emptyInvitations")}</p>}
        {invitations.map((invitation) => (
          <Card key={invitation.id}>
            <CardHeader>
              <CardTitle className="break-all text-base">
                {invitation.email}
              </CardTitle>
              <p>
                {t(`roles.${invitation.role}`)} ·{" "}
                {t(
                  `invitationStates.${["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"].includes(invitation.status) ? invitation.status : "UNKNOWN"}`,
                )}
              </p>
              <p className="text-sm">
                {t("expires", {
                  date:
                    new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "UTC",
                    }).format(new Date(invitation.expiresAt)) + " UTC",
                })}
              </p>
              <p className="text-sm">
                {t(
                  `delivery.${["NOT_SENT", "PROVIDER_ACCEPTED", "FAILED", "UNKNOWN"].includes(invitation.deliveryStatus) ? invitation.deliveryStatus : "UNKNOWN"}`,
                )}
              </p>
            </CardHeader>
            {invitation.status === "PENDING" &&
              (role === "OWNER" || invitation.role === "STAFF") && (
                <CardContent className="grid gap-4">
                  <p className="text-sm text-muted-foreground">
                    {t("resendNote")}
                  </p>
                  <MutationForm
                    organizationId={organization.id}
                    command={{
                      action: "ROTATE_INVITATION",
                      invitationId: invitation.id,
                    }}
                    label={t("resend")}
                    target={invitation.email}
                  />
                  <MutationForm
                    organizationId={organization.id}
                    command={{
                      action: "REVOKE_INVITATION",
                      invitationId: invitation.id,
                    }}
                    label={t("revoke")}
                    target={invitation.email}
                  />
                </CardContent>
              )}
          </Card>
        ))}
      </section>
    </section>
  );
}
