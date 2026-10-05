import { getTranslations } from "next-intl/server";
import { getAssignmentsOverview } from "@/lib/data/assignments";
import { ObjectiveCardWrapper } from "./objective-card-wrapper";
import { ObjectivesFilter, type ObjectiveItem } from "./objectives-filter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { CreateAssignmentDialog } from "@/components/fi/learning/create-assignment-dialog";
import { getInterns } from "@/lib/data/assignments";

export async function ObjectivesGrid() {
  const [t, assignments, interns] = await Promise.all([
    getTranslations("objectives"),
    getAssignmentsOverview(),
    getInterns(),
  ]);

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("allObjectivesTitle")}</CardTitle>
          <CardDescription>{t("noObjectives")}</CardDescription>
          <CardAction>
            <CreateAssignmentDialog interns={interns} />
          </CardAction>
        </CardHeader>
      </Card>
    );
  }

  // Finished = has tasks and every task is done
  const items: ObjectiveItem[] = assignments.map((assignment) => ({
    id: assignment.id,
    internId: assignment.intern.id,
    internName: assignment.intern.name,
    status:
      assignment.checklistItems.length > 0 &&
      assignment.checklistItems.every((item) => item.completed)
        ? "finished"
        : "open",
    searchText: [
      assignment.focus,
      assignment.description,
      assignment.acceptanceCriteria,
      assignment.intern.name,
      ...assignment.checklistItems.flatMap((item) => [
        item.label,
        ...item.stages.map((stage) => stage.title),
      ]),
    ]
      .join(" ")
      .toLowerCase(),
    card: <ObjectiveCardWrapper assignment={assignment} />,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("allObjectivesTitle")}</CardTitle>
          <CardDescription>{t("allObjectivesDescription")}</CardDescription>
          <CardAction>
            <CreateAssignmentDialog interns={interns} />
          </CardAction>
        </CardHeader>
      </Card>

      <ObjectivesFilter items={items} />
    </div>
  );
}
