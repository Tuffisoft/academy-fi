"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  addDailyPlanStageAction,
  deleteDailyPlanAction,
  upsertDailyPlanAction,
} from "@/lib/actions/daily-plans.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StageList, type PlanStage } from "./stage-list";

type Plan = {
  id: string;
  title: string;
  stages: PlanStage[];
};

export function PlanEditor({ date, plan }: { date: string; plan: Plan | null }) {
  const t = useTranslations("dailyPlanner");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStage, setNewStage] = useState("");

  // Runs a mutation, then refreshes server data; errors surface as a toast
  function run(
    action: () => Promise<void>,
    errorMessage: string,
    onSuccess?: () => void,
  ) {
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
        router.refresh();
      } catch {
        toast.error(errorMessage);
      }
    });
  }

  // Empty state: no plan for this day yet
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("noPlanTitle")}</CardTitle>
          <CardDescription>{t("noPlanDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            action={(formData) => {
              const title = String(formData.get("title") ?? "");
              run(
                () => upsertDailyPlanAction({ date, title }),
                t("saveError"),
              );
            }}
          >
            <Input
              name="title"
              required
              placeholder={t("titlePlaceholder")}
              aria-label={t("planTitle")}
            />
            <Button type="submit" disabled={isPending}>
              {t("createPlan")}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const doneCount = plan.stages.filter((s) => s.completed).length;

  return (
    <Card>
      <CardHeader>
        {/* Editable main title; saved on blur when changed */}
        <Input
          key={plan.title}
          defaultValue={plan.title}
          aria-label={t("planTitle")}
          className="h-10 text-lg font-semibold"
          onBlur={(e) => {
            const title = e.target.value.trim();
            if (title && title !== plan.title) {
              run(() => upsertDailyPlanAction({ date, title }), t("saveError"));
            } else {
              e.target.value = plan.title;
            }
          }}
        />
        <CardDescription>
          {t("progress", { done: doneCount, total: plan.stages.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Stages */}
        {plan.stages.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noStages")}</p>
        ) : (
          <StageList
            planId={plan.id}
            stages={plan.stages}
            isPending={isPending}
            run={run}
          />
        )}

        {/* Add stage */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = newStage.trim();
            if (!title) return;
            run(
              () => addDailyPlanStageAction(plan.id, title),
              t("stageError"),
              () => setNewStage(""),
            );
          }}
        >
          <Input
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            placeholder={t("stagePlaceholder")}
            aria-label={t("stageTitle")}
          />
          <Button type="submit" disabled={isPending || !newStage.trim()}>
            <Plus className="h-4 w-4" />
            {t("addStage")}
          </Button>
        </form>

        {/* Delete plan */}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                  {t("deletePlan")}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("deleteDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run(
                      () => deleteDailyPlanAction(plan.id),
                      t("deleteError"),
                    )
                  }
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
