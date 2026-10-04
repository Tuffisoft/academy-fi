import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { requireUser } from "@/lib/session";
import { ObjectivesGrid } from "@/components/fi/objectives/objectives-grid";

export default async function ObjectivesPage() {
  const user = await requireUser();
  await requireRole(Role.OWNER);
  const t = await getTranslations("objectives");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <BreadcrumbNav items={[{ label: t("title") }]} />
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <ObjectivesGrid />
      </main>
    </div>
  );
}
