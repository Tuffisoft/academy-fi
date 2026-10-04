import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getAllAssignmentsForIntern } from "@/lib/data/assignments";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { AccountMenu } from "@/components/fi/dashboard/account-menu";
import { AdminDashboard } from "@/components/fi/dashboard/AdminDashboard";
import { LearningCard } from "@/components/fi/dashboard/learning-card";
import { ObjectivesCard } from "@/components/fi/dashboard/objectives-card";
import { PresentationCard } from "@/components/fi/dashboard/presentation-card";
import { WeeklyObjectivesCard } from "@/components/fi/dashboard/weekly-objectives-card";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");
  const isOwner = user.role === "OWNER";

  const assignments = isOwner ? [] : await getAllAssignmentsForIntern(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <div className="px-6 pt-6">
        <BreadcrumbNav items={[]} />
      </div>
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("welcome", { name: user.name })}</CardTitle>
            <CardDescription>
              {isOwner ? t("ownerDescription") : t("internDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountMenu email={user.email} />
          </CardContent>
        </Card>
        {isOwner ? (
          <>
            <ObjectivesCard />
            <LearningCard />
            <PresentationCard />
            <AdminDashboard />
          </>
        ) : (
          <>
            <WeeklyObjectivesCard assignments={assignments} />
            <LearningCard />
            <PresentationCard />
          </>
        )}
      </main>
    </div>
  );
}
