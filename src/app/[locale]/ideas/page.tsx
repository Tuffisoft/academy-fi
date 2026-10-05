import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { CreateIdeaDialog } from "@/components/fi/ideas/create-idea-dialog";
import { IdeasBoard } from "@/components/fi/ideas/ideas-board";

export default async function IdeasPage() {
  const user = await requireUser();
  const t = await getTranslations("ideas");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <BreadcrumbNav items={[{ label: t("title") }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <CreateIdeaDialog />
        </div>
        <IdeasBoard userId={user.id} isOwner={user.role === "OWNER"} />
      </main>
    </div>
  );
}
