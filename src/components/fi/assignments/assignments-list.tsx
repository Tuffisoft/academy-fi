"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskDetailsModal } from "../dashboard/task-details-modal";

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
  description: string;
  weekOf: Date;
  checklistItems: ChecklistItem[];
  reflections: Array<{
    id: string;
    workDone: string;
    feedback: Array<{ id: string }>;
  }>;
};

interface AssignmentsListProps {
  assignments: Assignment[];
}

export function AssignmentsList({ assignments }: AssignmentsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ChecklistItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTaskClick = (task: ChecklistItem) => {
    setSelectedTask(task);
    setModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {assignments.map((assignment) => {
          const totalStages = assignment.checklistItems.reduce(
            (sum, item) => sum + item.stages.length,
            0,
          );
          const completedStages = assignment.checklistItems.reduce(
            (sum, item) => sum + item.stages.filter((s) => s.completed).length,
            0,
          );
          const completionPercent =
            totalStages > 0
              ? Math.round((completedStages / totalStages) * 100)
              : 0;
          const reflection = assignment.reflections[0] ?? null;
          const isExpanded = expandedId === assignment.id;

          return (
            <Card key={assignment.id}>
              <CardHeader>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : assignment.id)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {assignment.focus}
                        </CardTitle>
                        {reflection?.feedback &&
                          reflection.feedback.length > 0 && (
                            <Badge className="bg-green-600">Feedback</Badge>
                          )}
                      </div>
                      <CardDescription className="mt-1">
                        Week of{" "}
                        {new Date(assignment.weekOf).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {completionPercent}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {completedStages}/{totalStages}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Progress Bar */}
                {totalStages > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>

              {/* Expanded Details */}
              {isExpanded && (
                <CardContent className="border-t pt-4 space-y-4">
                  {/* Description */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {assignment.description}
                    </p>
                  </div>

                  {/* Tasks */}
                  {assignment.checklistItems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Tasks</h4>
                      <div className="space-y-2">
                        {assignment.checklistItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleTaskClick(item)}
                            className="p-2 rounded border hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                readOnly
                                className="rounded border-gray-300"
                              />
                              <span
                                className={
                                  item.completed
                                    ? "text-sm line-through text-muted-foreground"
                                    : "text-sm"
                                }
                              >
                                {item.label}
                              </span>
                              {item.stages.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {
                                    item.stages.filter((s) => s.completed)
                                      .length
                                  }
                                  /{item.stages.length}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reflection Status */}
                  {reflection && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="font-medium text-sm mb-2">Reflection</p>
                      <p className="text-xs text-muted-foreground">
                        {reflection.workDone}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

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
