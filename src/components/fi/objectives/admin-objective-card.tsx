import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminTaskEditor } from "./admin-task-editor";

type TaskStage = {
  id: string;
  title: string;
  completed: boolean;
  documentation: string | null;
  order: number;
};

type Assignment = {
  id: string;
  internId: string;
  focus: string;
  description: string;
  acceptanceCriteria: string;
  weekOf: Date;
  checklistItems: Array<{
    id: string;
    label: string;
    completed: boolean;
    stages: TaskStage[];
  }>;
  reflections: Array<{
    id: string;
    workDone: string;
    learning: string;
    feedback: Array<{
      id: string;
      message: string;
    }>;
  }>;
  intern: {
    id: string;
    name: string;
  };
};

export function AdminObjectiveCard({ assignment }: { assignment: Assignment }) {
  // Calculate progress from stages
  const totalStages = assignment.checklistItems.reduce(
    (sum, item) => sum + item.stages.length,
    0,
  );
  const completedStages = assignment.checklistItems.reduce(
    (sum, item) => sum + item.stages.filter((s) => s.completed).length,
    0,
  );

  const completionPercent =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  const reflection = assignment.reflections[0] ?? null;
  const hasFeedback = reflection?.feedback && reflection.feedback.length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{assignment.focus}</CardTitle>
            <CardDescription className="mt-1">
              {assignment.description}
            </CardDescription>
          </div>
          {hasFeedback && (
            <Badge className="bg-green-600">Feedback given</Badge>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Week of {new Date(assignment.weekOf).toLocaleDateString()}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Stage Progress */}
        {totalStages > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedStages}/{totalStages}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionPercent}% complete
            </p>
          </div>
        )}

        {/* Admin Editor */}
        <AdminTaskEditor assignment={assignment} />
      </CardContent>
    </Card>
  );
}
