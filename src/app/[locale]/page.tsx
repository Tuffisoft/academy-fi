import { ArrowRight, LayoutDashboard, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentSession } from "@/lib/session";

export default async function Home() {
  const [session, t] = await Promise.all([
    getCurrentSession(),
    getTranslations("home"),
  ]);

  if (!session) return <SignInPanel />;

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-muted-foreground">
          {t("title")}
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          {t("launcherTitle")}
        </h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard"
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full min-h-48 transition-colors group-hover:bg-muted/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <CardHeader className="gap-5">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutDashboard aria-hidden="true" className="size-5" />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                />
              </div>
              <div className="grid gap-1">
                <CardTitle className="text-lg">{t("dashboardTitle")}</CardTitle>
                <CardDescription>{t("dashboardDescription")}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link
          href="/tools"
          className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="h-full min-h-48 transition-colors group-hover:bg-muted/40 group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <CardHeader className="gap-5">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Wrench aria-hidden="true" className="size-5" />
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1"
                />
              </div>
              <div className="grid gap-1">
                <CardTitle className="text-lg">{t("toolsTitle")}</CardTitle>
                <CardDescription>{t("toolsDescription")}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
