"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createResourceAction } from "@/lib/actions/departments.actions";
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

export function AddResourceDialog({ departmentId }: { departmentId: string }) {
  const t = useTranslations("departments");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    const note = formData.get("note") as string;

    startTransition(async () => {
      try {
        await createResourceAction(departmentId, { title, url, note });
        toast.success(t("resourceCreateSuccess"));
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(t("resourceCreateError"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            {t("addResource")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("resourceCreateTitle")}</DialogTitle>
          <DialogDescription>
            {t("resourceCreateDescription")}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">{t("resourceTitle")}</FieldLabel>
              <Input id="title" name="title" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="url">{t("resourceUrl")}</FieldLabel>
              <Input id="url" name="url" type="url" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="note">{t("resourceNote")}</FieldLabel>
              <Input id="note" name="note" />
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
