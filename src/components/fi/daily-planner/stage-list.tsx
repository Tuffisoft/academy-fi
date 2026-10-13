"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import {
  addDailyPlanStageAction,
  deleteDailyPlanStageAction,
  renameDailyPlanStageAction,
  reorderDailyPlanStagesAction,
  toggleDailyPlanStageAction,
} from "@/lib/actions/daily-plans.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SortableList } from "./sortable-list";

export type PlanStage = {
  id: string;
  title: string;
  completed: boolean;
  parentId: string | null;
};

export type RunMutation = (
  action: () => Promise<void>,
  errorMessage: string,
  onSuccess?: () => void,
) => void;

type StageListProps = {
  planId: string;
  // Flat list, already ordered by `order` within each sibling group
  stages: PlanStage[];
  isPending: boolean;
  run: RunMutation;
};

// Swaps the siblings of one parent into a new order without moving other groups
function applyOrder(
  list: PlanStage[],
  parentId: string | null,
  orderedIds: string[],
) {
  const byId = new Map(list.map((s) => [s.id, s]));
  const reordered = orderedIds.map((id) => byId.get(id)!);
  let next = 0;
  return list.map((s) => (s.parentId === parentId ? reordered[next++] : s));
}

export function StageList({ planId, stages, isPending, run }: StageListProps) {
  const t = useTranslations("dailyPlanner");

  // Local copy so a drop reorders instantly; resynced whenever server data changes
  const [items, setItems] = useState(stages);
  const [syncedFrom, setSyncedFrom] = useState(stages);
  if (syncedFrom !== stages) {
    setSyncedFrom(stages);
    setItems(stages);
  }

  function reorder(parentId: string | null, orderedIds: string[]) {
    setItems((current) => applyOrder(current, parentId, orderedIds));
    run(
      () => reorderDailyPlanStagesAction(planId, parentId, orderedIds),
      t("stageError"),
    );
  }

  const topLevel = items.filter((s) => s.parentId === null);

  return (
    <SortableList
      items={topLevel}
      handleLabel={t("dragToReorder")}
      onReorder={(ids) => reorder(null, ids)}
      renderItem={(stage) => {
        const subsections = items.filter((s) => s.parentId === stage.id);
        return (
          <>
            <StageRow stage={stage} isPending={isPending} run={run} />

            {/* Subsections */}
            {subsections.length > 0 && (
              <SortableList
                className="ml-2 border-l pl-3"
                items={subsections}
                handleLabel={t("dragToReorder")}
                onReorder={(ids) => reorder(stage.id, ids)}
                renderItem={(sub) => (
                  <StageRow
                    stage={sub}
                    isPending={isPending}
                    run={run}
                    isSubsection
                  />
                )}
              />
            )}
            <AddSubsection
              planId={planId}
              parentId={stage.id}
              isPending={isPending}
              run={run}
            />
          </>
        );
      }}
    />
  );
}

function StageRow({
  stage,
  isPending,
  run,
  isSubsection = false,
}: {
  stage: PlanStage;
  isPending: boolean;
  run: RunMutation;
  isSubsection?: boolean;
}) {
  const t = useTranslations("dailyPlanner");

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={stage.completed}
        disabled={isPending}
        aria-label={isSubsection ? t("toggleSubsection") : t("toggleStage")}
        onCheckedChange={(checked) =>
          run(
            () => toggleDailyPlanStageAction(stage.id, checked),
            t("stageError"),
          )
        }
      />
      <Input
        key={stage.title}
        defaultValue={stage.title}
        aria-label={isSubsection ? t("subsectionTitle") : t("stageTitle")}
        className={stage.completed ? "text-muted-foreground line-through" : ""}
        onBlur={(e) => {
          const title = e.target.value.trim();
          if (title && title !== stage.title) {
            run(
              () => renameDailyPlanStageAction(stage.id, title),
              t("stageError"),
            );
          } else {
            e.target.value = stage.title;
          }
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={isPending}
        aria-label={isSubsection ? t("deleteSubsection") : t("deleteStage")}
        onClick={() =>
          run(() => deleteDailyPlanStageAction(stage.id), t("stageError"))
        }
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Collapsed "add subsection" button that expands into an inline form
function AddSubsection({
  planId,
  parentId,
  isPending,
  run,
}: {
  planId: string;
  parentId: string;
  isPending: boolean;
  run: RunMutation;
}) {
  const t = useTranslations("dailyPlanner");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground ml-2 self-start"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addSubsection")}
      </Button>
    );
  }

  return (
    <form
      className="ml-2 flex gap-2 border-l pl-3"
      onSubmit={(e) => {
        e.preventDefault();
        const text = title.trim();
        if (!text) return;
        run(
          () => addDailyPlanStageAction(planId, text, parentId),
          t("stageError"),
          () => setTitle(""),
        );
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTitle("");
            setOpen(false);
          }
        }}
        placeholder={t("subsectionPlaceholder")}
        aria-label={t("subsectionTitle")}
      />
      <Button type="submit" disabled={isPending || !title.trim()}>
        {t("addSubsection")}
      </Button>
    </form>
  );
}
