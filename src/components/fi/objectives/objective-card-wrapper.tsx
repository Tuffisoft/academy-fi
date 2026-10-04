import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import { ObjectiveCard } from "./objective-card";
import { AdminObjectiveCard } from "./admin-objective-card";

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

export async function ObjectiveCardWrapper({
  assignment,
}: {
  assignment: Assignment;
}) {
  try {
    await requireRole(Role.OWNER);
    // User is owner - show admin card
    return <AdminObjectiveCard assignment={assignment} />;
  } catch {
    // User is not owner - show regular card
    return <ObjectiveCard assignment={assignment} />;
  }
}
