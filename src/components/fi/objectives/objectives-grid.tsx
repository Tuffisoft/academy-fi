import { getTranslations } from "next-intl/server";
import { getAssignmentsOverview } from "@/lib/data/assignments";
import { ObjectiveCardWrapper } from "./objective-card-wrapper";
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

  // Group assignments by intern
  const grouped = assignments.reduce(
    (acc, assignment) => {
      const internId = assignment.intern.id;
      if (!acc[internId]) {
        acc[internId] = {
          intern: assignment.intern,
          assignments: [],
        };
      }
      acc[internId].assignments.push(assignment);
      return acc;
    },
    {} as Record<
      string,
      {
        intern: { id: string; name: string };
        assignments: typeof assignments;
      }
    >,
  );

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

      {Object.values(grouped).map((group) => (
        <div key={group.intern.id} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{group.intern.name}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.assignments.map((assignment) => (
              <ObjectiveCardWrapper
                key={assignment.id}
                assignment={assignment}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
