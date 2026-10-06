import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Cloud, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { getAllAssignmentsForIntern } from "@/lib/data/assignments";
import { DashboardHeader } from "@/components/fi/dashboard/dashboard-header";
import { AccountMenu } from "@/components/fi/dashboard/account-menu";
import { AdminDashboard } from "@/components/fi/dashboard/AdminDashboard";
import { LearningCard } from "@/components/fi/dashboard/learning-card";
import { IdeasCard } from "@/components/fi/dashboard/ideas-card";
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
  const locale = await getLocale();
  const isOwner = user.role === "OWNER";

  const assignments = isOwner ? [] : await getAllAssignmentsForIntern(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader name={user.name} role={user.role ?? "INTERN"} />
      <div className="px-6 pt-6">
        <BreadcrumbNav items={[]} />
      </div>
      <main className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/cloud/index.html"
            prefetch={false}
            aria-label={locale === "de" ? "Cloud-System öffnen" : "Open cloud storage"}
            className={buttonVariants({ size: "lg" })}
          >
            <Cloud aria-hidden="true" />
            {locale === "de" ? "Cloud-System" : "Cloud"}
          </Link>
          <Link
            href="/chat/index.html"
            prefetch={false}
            aria-label={locale === "de" ? "Chat öffnen" : "Open chat"}
            className={buttonVariants({ size: "lg" })}
          >
            <MessageCircle aria-hidden="true" />
            Chat
          </Link>
        </div>
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
            <IdeasCard />
            <PresentationCard />
            <AdminDashboard />
          </>
        ) : (
          <>
            <WeeklyObjectivesCard assignments={assignments} />
            <LearningCard />
            <IdeasCard />
            <PresentationCard />
          </>
        )}
      </main>
    </div>
  );
}
