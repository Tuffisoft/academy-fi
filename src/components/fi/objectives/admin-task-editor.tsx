"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { MoreVertical, Trash2, Edit2 } from "lucide-react";
import {
  deleteChecklistItemAction,
  updateChecklistItemAction,
  deleteAssignmentAction,
} from "@/lib/actions/assignments.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TaskStage = {
  id: string;
  title: string;
  completed: boolean;
  documentation: string | null;
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
  description: string;
  acceptanceCriteria: string;
  checklistItems: ChecklistItem[];
  internId: string;
  intern: {
    name: string;
  };
};

interface AdminTaskEditorProps {
  assignment: Assignment;
}

export function AdminTaskEditor({ assignment }: AdminTaskEditorProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(
    null,
  );

  const handleEditItem = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemLabel(item.label);
  };

  const handleSaveItemEdit = () => {
    if (!editingItemId || !editingItemLabel.trim()) return;

    startTransition(async () => {
      try {
        await updateChecklistItemAction(editingItemId, editingItemLabel);
        setEditingItemId(null);
        router.refresh();
        toast.success("Task updated");
      } catch {
        toast.error("Failed to update task");
      }
    });
  };

  const handleDeleteItem = (itemId: string) => {
    startTransition(async () => {
      try {
        await deleteChecklistItemAction(itemId);
        setDeleteItemId(null);
        router.refresh();
        toast.success("Task deleted");
      } catch {
        toast.error("Failed to delete task");
      }
    });
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    startTransition(async () => {
      try {
        await deleteAssignmentAction(assignmentId);
        setDeleteAssignmentId(null);
        router.refresh();
        toast.success("Assignment deleted");
      } catch {
        toast.error("Failed to delete assignment");
      }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Assignment Header Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{assignment.focus}</h3>
            <p className="text-sm text-muted-foreground">
              {assignment.intern.name}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteAssignmentId(assignment.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Assignment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tasks</h4>
          {assignment.checklistItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded border hover:bg-muted transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm">{item.label}</p>
                {item.stages.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {item.stages.filter((s) => s.completed).length}/
                    {item.stages.length} stages
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditItem(item)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteItemId(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog
        open={editingItemId !== null}
        onOpenChange={(open) => !open && setEditingItemId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editingItemLabel}
              onChange={(e) => setEditingItemLabel(e.target.value)}
              placeholder="Task name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItemId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveItemEdit}
              disabled={isPending || !editingItemLabel.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <AlertDialog
        open={deleteItemId !== null}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task and all its stages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDeleteItem(deleteItemId!)}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Assignment Confirmation */}
      <AlertDialog
        open={deleteAssignmentId !== null}
        onOpenChange={(open) => !open && setDeleteAssignmentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entire assignment and all its
              tasks and documentation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleDeleteAssignment(deleteAssignmentId!)}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
