"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(t("resetPasswordInvalidToken"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("resetPasswordMismatch"));
      return;
    }

    setIsSubmitting(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    });

    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message ?? t("genericError"));
      return;
    }

    router.push("/sign-in");
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="newPassword">{t("newPassword")}</FieldLabel>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">
            {t("confirmPassword")}
          </FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("resettingPassword") : t("resetPassword")}
        </Button>
      </FieldGroup>
    </form>
  );
}
