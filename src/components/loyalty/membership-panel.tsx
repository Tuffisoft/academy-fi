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
import { ArrowLeft, CircleAlert, CircleCheck, Mail, MailPlus, ShieldCheck, Users } from "lucide-react";

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
      className={invite ? "grid min-w-0 gap-4" : "grid min-w-0 gap-3 rounded-xl border bg-muted/20 p-4"}
      aria-busy={pending}
    >
      {!invite && <h4 className="text-sm font-semibold">{t(command.action === "CHANGE_ROLE" ? "roleAccess" : command.action === "TRANSFER_OWNER" ? "transfer" : command.action === "REMOVE_MEMBER" ? "remove" : command.action === "ROTATE_INVITATION" ? "resend" : "revoke")}</h4>}
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
                <Label htmlFor={formId + "-admin"} className="min-h-11 min-w-0 wrap-anywhere py-3">
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
              className="min-h-11 min-w-0 wrap-anywhere py-2 leading-relaxed"
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
      {uncertain && <p className="wrap-anywhere text-sm leading-relaxed">{t("retryNote")}</p>}
      <Button
        type="submit"
        variant={invite ? "default" : command.action === "REMOVE_MEMBER" ? "destructive" : "outline"}
        disabled={pending}
        className={
          focus + " h-auto w-full min-w-0 whitespace-normal wrap-anywhere py-3 text-left sm:w-auto sm:justify-self-start" + (command.action === "REMOVE_MEMBER" ? " border-destructive/30 text-foreground" : "")
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
              ? "flex items-start gap-2 rounded-lg border bg-accent/40 p-3 text-sm leading-relaxed wrap-anywhere"
              : "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-relaxed text-foreground wrap-anywhere"
          }
        >
          {reply.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span className="min-w-0">
            {reply.ok
              ? t(
                reply.data.deliveryStatus
                  ? `delivery.${reply.data.deliveryStatus}`
                  : "saved",
              )
              : t(`errors.${reply.error.code}`)}
          </span>
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
    <section className="mx-auto grid w-full max-w-5xl min-w-0 gap-8 px-5 py-8 sm:py-12">
      <Link
        className={focus + " inline-flex items-center gap-2 justify-self-start rounded text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"}
        href={`/tools/calem/stempelkarten/app/${organization.slug}`}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
        {t("back")}
      </Link>
      <header className="grid min-w-0 gap-5 rounded-2xl border bg-accent/40 p-5 sm:p-7">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 wrap-anywhere text-sm text-muted-foreground">{organization.name}</p>
          <Badge variant="secondary">{t(`roles.${role}`)}</Badge>
        </div>
        <h1 className="wrap-break-words font-serif text-3xl tracking-tight sm:text-4xl">{t("title")}</h1>
        <div className="grid gap-2 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {t("capacity", {
              active: overview.active,
              reserved: overview.reserved,
              limit: overview.limit,
            })}
          </p>
          <dl className="grid grid-cols-3 gap-2 py-2 sm:gap-4">
            {([
              ["activeSeats", overview.active],
              ["reservedSeats", overview.reserved],
              ["seatLimit", overview.limit],
            ] as const).map(([label, value]) => <div key={label} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 sm:p-4"><dt className="wrap-anywhere text-xs leading-relaxed text-muted-foreground">{t(label)}</dt><dd className="text-2xl font-semibold tabular-nums text-primary">{value}</dd></div>)}
          </dl>
          {overview.active + overview.reserved >= overview.limit && (
            <p role="status" className="text-sm text-muted-foreground">{t("capacityFull")}</p>
          )}
        </div>
      </header>
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="min-w-0 lg:col-start-2 lg:row-start-1">
          <CardHeader>
            <CardTitle><h2 className="flex items-center gap-3"><MailPlus className="size-5 shrink-0 text-primary" aria-hidden="true" />{t("invite")}</h2></CardTitle>
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
        <div className="grid min-w-0 gap-8 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="membership-active-title" className="grid min-w-0 gap-4">
            <h2 id="membership-active-title" className="flex items-center gap-3 text-xl font-semibold">
              <Users className="size-5 shrink-0 text-primary" aria-hidden="true" />
              {t("members")}
            </h2>
            {members.length === 0 && <Card><CardContent className="py-4 text-sm text-muted-foreground">{t("emptyMembers")}</CardContent></Card>}
            {members.map((member) => (
              <Card key={member.id + member.role}>
                <CardHeader className="gap-3 border-b pb-4">
                  <CardTitle className="min-w-0 wrap-anywhere">
                    <h3>{member.user.name}</h3>
                  </CardTitle>
                  <p className="break-all text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                  <Badge variant={member.role === "OWNER" ? "default" : "secondary"}><ShieldCheck className="size-3" aria-hidden="true" />{t(`roles.${member.role}`)}</Badge>
                </CardHeader>
                <CardContent className="grid min-w-0 gap-4">
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
            className="grid min-w-0 gap-4"
          >
            <h2 id="membership-invitations-title" className="flex items-center gap-3 text-xl font-semibold">
              <Mail className="size-5 shrink-0 text-primary" aria-hidden="true" />
              {t("invitations")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("latestInvitations")}
            </p>
            {invitations.length === 0 && <Card><CardContent className="py-4 text-sm text-muted-foreground">{t("emptyInvitations")}</CardContent></Card>}
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader>
                  <CardTitle className="break-all text-base">
                    <h3>{invitation.email}</h3>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t(`roles.${invitation.role}`)}</Badge>
                    <Badge variant={invitation.status === "ACCEPTED" ? "default" : "secondary"}>
                      {t(
                        `invitationStates.${["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"].includes(invitation.status) ? invitation.status : "UNKNOWN"}`,
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("expires", {
                      date:
                        new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "UTC",
                        }).format(new Date(invitation.expiresAt)) + " UTC",
                    })}
                  </p>
                  <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                    {t(
                      `delivery.${["NOT_SENT", "PROVIDER_ACCEPTED", "FAILED", "UNKNOWN"].includes(invitation.deliveryStatus) ? invitation.deliveryStatus : "UNKNOWN"}`,
                    )}
                  </p>
                </CardHeader>
                {invitation.status === "PENDING" &&
                  (role === "OWNER" || invitation.role === "STAFF") && (
                    <CardContent className="grid min-w-0 gap-4 border-t pt-4">
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
        </div>
      </div>
    </section>
  );
}
