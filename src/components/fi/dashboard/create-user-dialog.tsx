"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createUserAction } from "@/lib/actions/users.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateUserDialog() {
  const t = useTranslations("users");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"OWNER" | "INTERN">("INTERN");
  const [locale, setLocale] = useState<"en" | "de">("en");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      try {
        await createUserAction({ name, email, password, role, locale });
        toast.success(t("createSuccess"));
        setOpen(false);
        setRole("INTERN");
        setLocale("en");
        router.refresh();
      } catch {
        toast.error(t("createError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="icon"
            className="bg-green-600 text-white hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">{t("addUser")}</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
              <Input id="name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <Input id="password" name="password" type="password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="role">{t("role")}</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "OWNER" | "INTERN")}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERN">INTERN</SelectItem>
                  <SelectItem value="OWNER">OWNER</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="locale">{t("language")}</FieldLabel>
              <Select
                value={locale}
                onValueChange={(value) => setLocale(value as "en" | "de")}
              >
                <SelectTrigger id="locale">
                  <SelectValue placeholder={t("selectLanguage")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
