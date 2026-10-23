"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createOrganizationAction, type OrganizationCreationState } from "@/lib/loyalty/portal.actions";
import { useRouter } from "@/i18n/navigation";
import { createCustomerOrganizationAction } from "@/lib/loyalty/customer-onboarding.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationForm({ customer = false }: { customer?: boolean }) {
  const t = useTranslations("stempelfi");
  const operation = useRef<string | null>(null);
  const [operationId, setOperationId] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();
  const [state, action, pending] = useActionState<OrganizationCreationState, FormData>(async (previous, formData) => {
    if (!operation.current) operation.current = crypto.randomUUID();
    setOperationId(operation.current);
    formData.set("operationId", operation.current);
    try {
      const result = await (customer ? createCustomerOrganizationAction : createOrganizationAction)(previous, formData);
      // A confirmed result completes this intent; a later deliberate submission is a new one.
      if (result.slug) operation.current = null;
      return result;
    }
    catch { return { error: "UNAVAILABLE" }; }
  }, { error: null });
  useEffect(() => {
    if (state.slug) { router.push(`/tools/calem/stempelkarten/app/${state.slug}`); router.refresh(); }
  }, [state.slug, router]);
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="operationId" value={operationId} />
    <div className="grid gap-2"><Label htmlFor="organization-name">{t("company")}</Label><Input id="organization-name" name="name" required value={name} onChange={event => setName(event.target.value)} maxLength={160} className="min-h-11" aria-invalid={state.error === "INVALID_INPUT"} aria-describedby={state.error ? "organization-error" : "organization-note"} /></div>
    <p id="organization-note" className="text-sm text-muted-foreground">{t("creationNote")}</p>
    {state.error && <p id="organization-error" role="alert" className="text-sm text-destructive">{t(`creationErrors.${state.error}`)}</p>}
    <Button type="submit" disabled={pending} className="min-h-11 justify-self-start focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{t(pending ? "creatingCompany" : "createCompany")}</Button>
  </form>;
}
