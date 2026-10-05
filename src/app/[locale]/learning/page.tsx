import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { DepartmentsList } from "@/components/fi/learning/departments-list";
import { ManageDepartments } from "@/components/fi/learning/manage-departments";

export default async function LearningPage() {
  const user = await requireUser();
  const t = await getTranslations("learning");
  const isOwner = user.role === "OWNER";

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <BreadcrumbNav items={[{ label: t("title") }]} />
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        {isOwner ? (
          <>
            <ManageDepartments />
          </>
        ) : (
          <DepartmentsList userId={user.id} />
        )}
      </main>
    </div>
  );
}
