"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";
import {
  createTaskStageAction,
  updateTaskStageAction,
  deleteTaskStageAction,
  toggleChecklistItemAction,
} from "@/lib/actions/assignments.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface TaskDetailsModalProps {
  task: ChecklistItem;
  // Parent assignment, so the intern sees what the task belongs to
  assignment: {
    focus: string;
    description?: string;
    acceptanceCriteria?: string;
    weekOf: Date;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsModal({
  task,
  assignment,
  open,
  onOpenChange,
}: TaskDetailsModalProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  // Local draft so typing never waits on the server
  const [docDraft, setDocDraft] = useState("");
  const stageInputRef = useRef<HTMLInputElement>(null);

  const handleAddStage = () => {
    const title = newStageName.trim();
    if (!title) return;

    startTransition(async () => {
      try {
        await createTaskStageAction(task.id, title);
        setNewStageName("");
        stageInputRef.current?.focus();
        router.refresh();
      } catch {
        toast.error(t("stageAddError"));
      }
    });
  };

  const startEditingDoc = (stage: TaskStage) => {
    setEditingStageId(stage.id);
    setDocDraft(stage.documentation ?? "");
  };

  const handleStageToggle = (stage: TaskStage) => {
    startTransition(async () => {
      try {
        await updateTaskStageAction(
          stage.id,
          !stage.completed,
          stage.documentation || "",
        );
        router.refresh();
      } catch {
        toast.error(t("stageUpdateError"));
      }
    });
  };

  const handleSaveDocumentation = (stage: TaskStage) => {
    startTransition(async () => {
      try {
        await updateTaskStageAction(stage.id, stage.completed, docDraft);
        setEditingStageId(null);
        toast.success(t("docSaved"));
        router.refresh();
      } catch {
        toast.error(t("docSaveError"));
      }
    });
  };

  const handleDeleteStage = (stageId: string) => {
    startTransition(async () => {
      try {
        await deleteTaskStageAction(stageId);
        router.refresh();
      } catch {
        toast.error(t("stageDeleteError"));
      }
    });
  };

  const handleTaskToggle = (completed: boolean) => {
    startTransition(async () => {
      try {
        await toggleChecklistItemAction(task.id, completed);
        router.refresh();
      } catch {
        toast.error(t("checklistError"));
      }
    });
  };

  const completedStages = task.stages.filter((s) => s.completed).length;
  const progressPercent =
    task.stages.length > 0
      ? Math.round((completedStages / task.stages.length) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.label}</DialogTitle>
          <DialogDescription>
            {assignment.focus} •{" "}
            {new Date(assignment.weekOf).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task status */}
          <label className="flex items-center gap-3 text-sm font-medium">
            <Checkbox
              checked={task.completed}
              onCheckedChange={(checked) => handleTaskToggle(checked === true)}
              disabled={isPending}
            />
            {t("markTaskComplete")}
          </label>

          {/* Assignment context */}
          {(assignment.description || assignment.acceptanceCriteria) && (
            <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
              {assignment.description && (
                <div>
                  <h3 className="font-medium mb-1">
                    {t("assignmentDescription")}
                  </h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {assignment.description}
                  </p>
                </div>
              )}
              {assignment.acceptanceCriteria && (
                <div>
                  <h3 className="font-medium mb-1">
                    {t("acceptanceCriteria")}
                  </h3>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {assignment.acceptanceCriteria}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {task.stages.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{t("taskProgress")}</span>
                <span className="text-sm text-muted-foreground">
                  {completedStages}/{task.stages.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("taskPercentComplete", { percent: progressPercent })}
              </p>
            </div>
          )}

          {/* Stages List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{t("stagesTitle")}</h3>
              <span className="text-xs text-muted-foreground">
                {t("stagesCount", { count: task.stages.length })}
              </span>
            </div>

            {task.stages.length > 0 ? (
              <div className="space-y-4">
                {task.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={stage.completed}
                        onCheckedChange={() => handleStageToggle(stage)}
                        disabled={isPending}
                      />
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            stage.completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {stage.title}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Documentation Field */}
                    <div className="ml-7">
                      {editingStageId === stage.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={docDraft}
                            onChange={(e) => setDocDraft(e.target.value)}
                            placeholder={t("docPlaceholder")}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveDocumentation(stage)}
                              disabled={isPending}
                            >
                              {t("docSave")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStageId(null)}
                              disabled={isPending}
                            >
                              {t("docCancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditingDoc(stage)}
                          className="cursor-pointer p-2 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors"
                        >
                          {stage.documentation ? (
                            <p className="text-sm text-foreground">
                              {stage.documentation}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              {t("docClickToAdd")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noStages")}</p>
            )}
          </div>

          {/* Add New Stage */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium text-sm">{t("addStageTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("addStageHelp")}</p>
            <div className="flex gap-2">
              <Input
                ref={stageInputRef}
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder={t("addStagePlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isPending) {
                    e.preventDefault();
                    handleAddStage();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddStage}
                disabled={isPending || !newStageName.trim()}
              >
                <Plus className="h-4 w-4" />
                {t("addStageButton")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
