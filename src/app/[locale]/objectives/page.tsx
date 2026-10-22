import { getTranslations } from "next-intl/server";
import { requirePlatformOwner } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/header/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { requireAcademyUser } from "@/lib/session";
import { ObjectivesGrid } from "@/components/fi/objectives/objectives-grid";

export default async function ObjectivesPage() {
  const user = await requireAcademyUser();
  await requirePlatformOwner();
  const t = await getTranslations("objectives");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        name={user.name}
        role={user.role ?? "INTERN"}
        image={user.image ?? null}
      />
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
