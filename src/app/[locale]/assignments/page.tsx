import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getAllAssignmentsForIntern } from "@/lib/data/assignments";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { AssignmentsList } from "@/components/fi/assignments/assignments-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AssignmentsPage() {
  const user = await requireUser();
  const t = await getTranslations("assignments");

  const assignments = await getAllAssignmentsForIntern(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 pt-6">
        <BreadcrumbNav items={[{ label: t("title"), href: "/assignments" }]} />
      </div>
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
        </Card>

        {assignments.length > 0 ? (
          <AssignmentsList assignments={assignments} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {t("noAssignments")}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
