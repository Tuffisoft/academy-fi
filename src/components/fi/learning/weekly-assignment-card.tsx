"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  submitReflectionAction,
  toggleChecklistItemAction,
} from "@/lib/actions/assignments.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type ChecklistItem = { id: string; label: string; completed: boolean };
type Feedback = { id: string; message: string; author: { name: string } };
type ReflectionData = {
  id: string;
  workDone: string;
  learning: string;
  blocker: string | null;
  workLink: string | null;
  nextStep: string;
  feedback: Feedback[];
};

type Assignment = {
  id: string;
  weekOf: Date;
  focus: string;
  description: string;
  checklistItems: ChecklistItem[];
  reflections: ReflectionData[];
} | null;

export function WeeklyAssignmentCard({
  assignment,
}: {
  assignment: Assignment;
}) {
  const t = useTranslations("planner");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reflection = assignment?.reflections[0] ?? null;

  const [workDone, setWorkDone] = useState(reflection?.workDone ?? "");
  const [learning, setLearning] = useState(reflection?.learning ?? "");
  const [blocker, setBlocker] = useState(reflection?.blocker ?? "");
  const [workLink, setWorkLink] = useState(reflection?.workLink ?? "");
  const [nextStep, setNextStep] = useState(reflection?.nextStep ?? "");

  if (!assignment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("none")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function handleToggle(itemId: string, completed: boolean) {
    startTransition(async () => {
      try {
        await toggleChecklistItemAction(itemId, completed);
        router.refresh();
      } catch {
        toast.error(t("checklistError"));
      }
    });
  }

  function handleReflectionSubmit() {
    if (!assignment) return;
    startTransition(async () => {
      try {
        await submitReflectionAction({
          assignmentId: assignment.id,
          workDone,
          learning,
          blocker: blocker || undefined,
          workLink: workLink || undefined,
          nextStep,
        });
        toast.success(t("reflectionSuccess"));
        router.refresh();
      } catch {
        toast.error(t("reflectionError"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{assignment.focus}</CardTitle>
        <CardDescription>{assignment.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {assignment.checklistItems.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("checklist")}</h3>
            {assignment.checklistItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    handleToggle(item.id, checked === true)
                  }
                  disabled={isPending}
                />
                <span
                  className={
                    item.completed ? "text-muted-foreground line-through" : ""
                  }
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold">{t("reflectionHeading")}</h3>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="workDone">{t("workDone")}</FieldLabel>
              <Textarea
                id="workDone"
                value={workDone}
                onChange={(event) => setWorkDone(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="learning">{t("learning")}</FieldLabel>
              <Textarea
                id="learning"
                value={learning}
                onChange={(event) => setLearning(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="blocker">{t("blocker")}</FieldLabel>
              <Textarea
                id="blocker"
                value={blocker}
                onChange={(event) => setBlocker(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="workLink">{t("workLink")}</FieldLabel>
              <Input
                id="workLink"
                value={workLink}
                onChange={(event) => setWorkLink(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nextStep">{t("nextStep")}</FieldLabel>
              <Textarea
                id="nextStep"
                value={nextStep}
                onChange={(event) => setNextStep(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button
            onClick={handleReflectionSubmit}
            disabled={isPending}
            className="self-start"
          >
            {isPending ? t("saving") : t("saveReflection")}
          </Button>
        </div>

        {reflection && reflection.feedback.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("feedbackHeading")}</h3>
            {reflection.feedback.map((item) => (
              <div
                key={item.id}
                className="border-border rounded-lg border p-3 text-sm"
              >
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  {item.author.name}
                </p>
                <p>{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
