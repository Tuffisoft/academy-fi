import { getTranslations } from "next-intl/server";
import { ArrowRight, Search } from "lucide-react";
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

export async function ToolBuilderPage({
  builder,
}: {
  builder: "calem" | "adrian";
}) {
  const user = await requireAcademyUser();
  const t = await getTranslations("tools");
  const builderTitle = t(`${builder}Title`);
  const builderDescription = t(`${builder}Description`);

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        name={user.name}
        role={user.role ?? "INTERN"}
        image={user.image ?? null}
      />
      <main className="flex flex-1 flex-col gap-6 p-6">
        <BreadcrumbNav
          items={[
            { label: t("title"), href: "/tools" },
            { label: builderTitle },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold">
            {t("builderPageTitle", { builder: builderTitle })}
          </h1>
          <p className="mt-1 text-muted-foreground">{builderDescription}</p>
        </div>
        {builder === "calem" ? (
          <Link
            href="/tools/calem/lead-research"
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full min-h-40 transition-colors group-hover:bg-muted/40">
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Search aria-hidden="true" className="size-5" />
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                  />
                </div>
                <div className="grid gap-1">
                  <CardTitle className="text-lg">
                    {t("leadResearchTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("leadResearchDescription")}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("emptyBuilderTitle")}</CardTitle>
              <CardDescription>
                {t("emptyBuilderDescription", { builder: builderTitle })}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  );
}
