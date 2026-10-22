import { ArrowRight, Lightbulb, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreadcrumbNav } from "@/components/fi/breadcrumb-nav";
import { DashboardHeader } from "@/components/fi/header/dashboard-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAcademyUser } from "@/lib/session";

type ToolHref = "/ideas" | "/tools/calem" | "/tools/adrian";

function ToolLinkCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: ToolHref;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="h-full min-h-40 transition-colors group-hover:bg-muted/40">
        <CardHeader className="gap-5">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
            />
          </div>
          <div className="grid gap-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function ToolsPage() {
  const user = await requireAcademyUser();
  const t = await getTranslations("tools");

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        name={user.name}
        role={user.role ?? "INTERN"}
        image={user.image ?? null}
      />
      <main className="flex flex-1 flex-col gap-8 p-6">
        <div>
          <BreadcrumbNav items={[{ label: t("title") }]} />
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("description")}</p>
        </div>
        <section
          className="grid gap-4"
          aria-labelledby="available-tools-heading"
        >
          <h2 id="available-tools-heading" className="text-lg font-semibold">
            {t("availableTools")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolLinkCard
              href="/ideas"
              title={t("ideasTitle")}
              description={t("ideasDescription")}
              icon={Lightbulb}
            />
          </div>
        </section>
        <section className="grid gap-4" aria-labelledby="built-by-heading">
          <h2 id="built-by-heading" className="text-lg font-semibold">
            {t("builtBy")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToolLinkCard
              href="/tools/calem"
              title={t("calemTitle")}
              description={t("calemDescription")}
              icon={UserRound}
            />
            <ToolLinkCard
              href="/tools/adrian"
              title={t("adrianTitle")}
              description={t("adrianDescription")}
              icon={UserRound}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
