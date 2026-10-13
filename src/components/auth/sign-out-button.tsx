"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);

    try {
      const result = await signOutAction();
      if (result.error) throw new Error("Sign-out failed");
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Abmeldung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p role="alert" className="max-w-40 text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={signOut}
        aria-label="Abmelden"
        title="Abmelden"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </div>
  );
}
