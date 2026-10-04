"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createAssignmentAction } from "@/lib/actions/assignments.actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Intern = { id: string; name: string };

export function CreateAssignmentDialog({ interns }: { interns: Intern[] }) {
  const t = useTranslations("planner");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [internId, setInternId] = useState(interns[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const selectedIntern = interns.find((i) => i.id === internId);

  function handleSubmit(formData: FormData) {
    const weekOf = formData.get("weekOf") as string;
    const focus = formData.get("focus") as string;
    const description = formData.get("description") as string;
    const acceptanceCriteria = formData.get("acceptanceCriteria") as string;
    const checklistLabels = (formData.get("checklistItems") as string)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await createAssignmentAction({
          internId,
          weekOf,
          focus,
          description,
          acceptanceCriteria,
          checklistLabels,
        });
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
            <span className="sr-only">{t("addAssignment")}</span>
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
              <FieldLabel htmlFor="internId">{t("intern")}</FieldLabel>
              <Select
                value={internId}
                onValueChange={(value) => setInternId(value ?? "")}
              >
                <SelectTrigger id="internId">
                  <SelectValue placeholder={t("selectIntern")}>
                    {selectedIntern?.name || t("selectIntern")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {interns.map((intern) => (
                    <SelectItem key={intern.id} value={intern.id}>
                      {intern.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="weekOf">{t("weekOf")}</FieldLabel>
              <Input
                id="weekOf"
                name="weekOf"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="focus">{t("focus")}</FieldLabel>
              <Input id="focus" name="focus" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">
                {t("assignmentDescription")}
              </FieldLabel>
              <Textarea id="description" name="description" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="acceptanceCriteria">
                {t("acceptanceCriteria")}
              </FieldLabel>
              <Textarea
                id="acceptanceCriteria"
                name="acceptanceCriteria"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="checklistItems">
                {t("checklistItems")}
              </FieldLabel>
              <Textarea
                id="checklistItems"
                name="checklistItems"
                placeholder={t("checklistItemsPlaceholder")}
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isPending || !internId}>
              {isPending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
