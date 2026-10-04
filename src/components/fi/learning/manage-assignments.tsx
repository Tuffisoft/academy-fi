import { getTranslations } from "next-intl/server";
import { getAssignmentsOverview, getInterns } from "@/lib/data/assignments";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAssignmentDialog } from "@/components/fi/learning/create-assignment-dialog";
import { AssignmentFeedbackForm } from "@/components/fi/learning/assignment-feedback-form";

export async function ManageAssignments() {
  const [t, assignments, interns] = await Promise.all([
    getTranslations("planner"),
    getAssignmentsOverview(),
    getInterns(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageTitle")}</CardTitle>
        <CardDescription>{t("manageDescription")}</CardDescription>
        <CardAction>
          <CreateAssignmentDialog interns={interns} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {assignments.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {assignments.map((assignment) => {
          const reflection = assignment.reflections[0] ?? null;
          const completedCount = assignment.checklistItems.filter(
            (item) => item.completed,
          ).length;

          return (
            <div
              key={assignment.id}
              className="border-border rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">
                    {assignment.intern.name} &mdash; {assignment.focus}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {new Date(assignment.weekOf).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">
                  {t("checklistProgress", {
                    done: completedCount,
                    total: assignment.checklistItems.length,
                  })}
                </Badge>
              </div>
              {reflection ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-sm">
                    <p>
                      <span className="font-medium">{t("workDone")}:</span>{" "}
                      {reflection.workDone}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">{t("learning")}:</span>{" "}
                      {reflection.learning}
                    </p>
                    {reflection.blocker && (
                      <p className="mt-1">
                        <span className="font-medium">{t("blocker")}:</span>{" "}
                        {reflection.blocker}
                      </p>
                    )}
                    <p className="mt-1">
                      <span className="font-medium">{t("nextStep")}:</span>{" "}
                      {reflection.nextStep}
                    </p>
                  </div>
                  {reflection.feedback.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {reflection.feedback.map((item) => (
                        <div
                          key={item.id}
                          className="border-border rounded-lg border p-2 text-sm"
                        >
                          {item.message}
                        </div>
                      ))}
                    </div>
                  )}
                  <AssignmentFeedbackForm reflectionId={reflection.id} />
                </div>
              ) : (
                <p className="text-muted-foreground mt-3 text-sm">
                  {t("noReflectionYet")}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
