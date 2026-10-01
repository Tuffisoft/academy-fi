"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { setUserPasswordAction } from "@/lib/actions/users.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ChangePasswordDialog({ userId }: { userId: string }) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const newPassword = formData.get("newPassword") as string;

    startTransition(async () => {
      try {
        await setUserPasswordAction(userId, newPassword);
        toast.success(t("changePasswordSuccess"));
        setOpen(false);
      } catch {
        toast.error(t("changePasswordError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="icon" variant="ghost">
            <KeyRound className="h-4 w-4" />
            <span className="sr-only">{t("changePassword")}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("changePasswordTitle")}</DialogTitle>
          <DialogDescription>
            {t("changePasswordDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="newPassword">{t("password")}</FieldLabel>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("changingPassword") : t("changePassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
