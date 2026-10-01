"use client";

import { BookOpen, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/fi/elements/ThemeToggle";
import { LanguageToggle } from "@/components/fi/elements/LanguageToggle";

export function Footer() {
  const t = useTranslations("auth");
  const { data: session } = authClient.useSession();

  return (
    <footer className="flex items-center justify-evenly border-t border-border px-6 py-4">
      <div className="flex items-center gap-2">
        <ModeToggle />
        <LanguageToggle />
      </div>
      <Button
        variant="outline"
        size="icon"
        render={<Link href={session ? "/dashboard" : "/sign-in"} />}
      >
        {session ? (
          <BookOpen className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Eye className="h-[1.2rem] w-[1.2rem]" />
        )}
        <span className="sr-only">{session ? t("dashboard") : t("login")}</span>
      </Button>
    </footer>
  );
}
