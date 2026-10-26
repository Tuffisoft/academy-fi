"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { afterSignInHref, type SignInDestination } from "@/lib/loyalty/invitation-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function SignInForm({ destination }: { destination?: SignInDestination }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const nextHref = afterSignInHref(destination, window.location.hash);
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) { setError(t("genericError")); return; }
      router.push(nextHref);
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            className={destination ? "min-h-11" : undefined}
            aria-describedby={error ? "sign-in-error" : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className={destination ? "min-h-11" : undefined}
            aria-describedby={error ? "sign-in-error" : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && <FieldError id="sign-in-error" className={destination ? "rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-foreground" : undefined}>{error}</FieldError>}
        <Button type="submit" disabled={isSubmitting} className={destination ? "min-h-11 w-full" : undefined}>
          {isSubmitting ? t("signingIn") : t("signIn")}
        </Button>
      </FieldGroup>
    </form>
  );
}
