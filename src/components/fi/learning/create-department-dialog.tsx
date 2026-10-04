"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createDepartmentAction } from "@/lib/actions/departments.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreateDepartmentDialog() {
  const t = useTranslations("departments");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const nameEN = formData.get("nameEN") as string;
    const nameDE = formData.get("nameDE") as string;
    const description = formData.get("description") as string;

    startTransition(async () => {
      try {
        await createDepartmentAction({ nameEN, nameDE, description });
        toast.success(t("createSuccess"));
        setOpen(false);
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
            <span className="sr-only">{t("addDepartment")}</span>
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
              <FieldLabel htmlFor="nameEN">Name (English)</FieldLabel>
              <Input id="nameEN" name="nameEN" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="nameDE">Name (German)</FieldLabel>
              <Input id="nameDE" name="nameDE" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">
                {t("departmentDescription")}
              </FieldLabel>
              <Textarea id="description" name="description" />
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
