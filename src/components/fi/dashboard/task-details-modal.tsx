"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";
import {
  createTaskStageAction,
  updateTaskStageAction,
  deleteTaskStageAction,
} from "@/lib/actions/assignments.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsModal({
  task,
  open,
  onOpenChange,
}: TaskDetailsModalProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newStageName, setNewStageName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const handleAddStage = () => {
    if (!newStageName.trim()) return;

    startTransition(async () => {
      try {
        await createTaskStageAction(task.id, newStageName);
        setNewStageName("");
        router.refresh();
      } catch {
        toast.error("Failed to add stage");
      }
    });
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
        toast.error("Failed to update stage");
      }
    });
  };

  const handleDocumentation = (stage: TaskStage, documentation: string) => {
    startTransition(async () => {
      try {
        await updateTaskStageAction(stage.id, stage.completed, documentation);
        router.refresh();
      } catch {
        toast.error("Failed to save documentation");
      }
    });
  };

  const handleDeleteStage = (stageId: string) => {
    startTransition(async () => {
      try {
        await deleteTaskStageAction(stageId);
        router.refresh();
      } catch {
        toast.error("Failed to delete stage");
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
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          {task.stages.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
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
                {progressPercent}% complete
              </p>
            </div>
          )}

          {/* Stages List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Stages</h3>
              <span className="text-xs text-muted-foreground">
                {task.stages.length} stages
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
                            value={stage.documentation || ""}
                            onChange={(e) => {
                              handleDocumentation(stage, e.target.value);
                            }}
                            placeholder="What did you do to complete this stage? (e.g., Built 5 pages using React, styled with Tailwind...)"
                            className="text-sm"
                            disabled={isPending}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStageId(null)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingStageId(stage.id)}
                          className="cursor-pointer p-2 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors"
                        >
                          {stage.documentation ? (
                            <p className="text-sm text-foreground">
                              {stage.documentation}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Click to add documentation...
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No stages added yet. Add one below to start tracking progress.
              </p>
            )}
          </div>

          {/* Add New Stage */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-medium text-sm">Add Stage</h3>
            <div className="flex gap-2">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g., Design, Development, Testing..."
                disabled={isPending}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
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
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
