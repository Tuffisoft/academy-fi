"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { toggleChecklistItemAction } from "@/lib/actions/assignments.actions";
import { TaskDetailsModal } from "./task-details-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskStage = {
  id: string;
  title: string;
  completed: boolean;
  documentation: string | null;
  order: number;
};

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  stages: TaskStage[];
};

type Assignment = {
  id: string;
  focus: string;
  weekOf: Date;
  checklistItems: ChecklistItem[];
} | null;

export function WeeklyObjectivesCard({
  assignments,
}: {
  assignments: Array<{
    id: string;
    focus: string;
    weekOf: Date;
    checklistItems: ChecklistItem[];
  }>;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(assignments[0]?.id ?? null);
  const [selectedTask, setSelectedTask] = useState<ChecklistItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const assignment = selectedAssignmentId
    ? (assignments.find((a) => a.id === selectedAssignmentId) ?? null)
    : null;

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("weeklyObjectivesTitle")}</CardTitle>
          <CardDescription>{t("noObjectivesYet")}</CardDescription>
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

  const handleTaskClick = (task: ChecklistItem) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>{t("weeklyObjectivesTitle")}</CardTitle>
              {assignment && (
                <CardDescription>
                  {assignment.focus} • Week of{" "}
                  {new Date(assignment.weekOf).toLocaleDateString()}
                </CardDescription>
              )}
            </div>
            {assignments.length > 1 && (
              <Select
                value={selectedAssignmentId}
                onValueChange={setSelectedAssignmentId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue>
                    {assignment
                      ? `${assignment.focus} • ${new Date(assignment.weekOf).toLocaleDateString()}`
                      : "Select assignment"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.focus} • {new Date(a.weekOf).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignment && assignment.checklistItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {assignment.checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-muted transition-colors cursor-pointer group"
                  onClick={() => handleTaskClick(item)}
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => {
                      handleToggle(item.id, checked === true);
                    }}
                    disabled={isPending}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        item.completed
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {item.label}
                    </p>
                    {item.stages.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.stages.filter((s) => s.completed).length}/
                        {item.stages.length} stages
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("noObjectivesYet")}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}
