"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const labels: Record<(typeof routing.locales)[number], string> = {
  en: "English",
  de: "Deutsch",
};

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
        <Languages className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((nextLocale) => (
          <DropdownMenuItem
            key={nextLocale}
            disabled={nextLocale === locale}
            onClick={() => router.replace(pathname, { locale: nextLocale })}
          >
            {labels[nextLocale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
