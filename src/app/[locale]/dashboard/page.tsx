import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { AccountMenu } from "@/components/fi/dashboard/account-menu";
import { AdminDashboard } from "@/components/fi/dashboard/AdminDashboard";
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

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("welcome", { name: user.name })}</CardTitle>
            <CardDescription>
              {user.role === "OWNER"
                ? t("ownerDescription")
                : t("internDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountMenu email={user.email} />
          </CardContent>
        </Card>
        {user.role === "OWNER" && <AdminDashboard />}
      </main>
    </div>
  );
}
