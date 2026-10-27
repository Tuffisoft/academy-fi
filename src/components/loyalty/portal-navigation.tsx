import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { OrganizationRole } from "@/generated/prisma/client";
import { membershipsEnabled } from "@/lib/loyalty/membership-feature";

export async function PortalNavigation({
  slug,
  role,
  internal,
  active = "overview",
}: {
  slug: string;
  role: OrganizationRole | null;
  internal: boolean;
  active?: "overview" | "members";
}) {
  const t = await getTranslations("stempelfi.workspace");
  const base = `/tools/calem/stempelkarten/app/${slug}`;
  const manage = !internal && (role === "OWNER" || role === "ADMIN");
  const unavailable = [
    "scanner",
    "requests",
    "rewards",
    ...(manage ? ["programs", "analytics", "settings"] : []),
    ...(role === "OWNER" && !internal ? ["billing"] : []),
  ] as const;
  return (
    <nav
      aria-label={t("navigation")}
      className="flex min-w-0 flex-wrap gap-3 text-sm"
    >
      <Link
        prefetch={false}
        href={base}
        aria-current={active === "overview" ? "page" : undefined}
        className="rounded-lg border px-4 py-3 underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("overview")}
      </Link>
      {manage && membershipsEnabled() && (
        <Link
          href={`${base}/members`}
          aria-current={active === "members" ? "page" : undefined}
          className="rounded-lg border px-4 py-3 underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t("members")}
        </Link>
      )}
      {!internal &&
        unavailable.map((item) => (
          <span
            key={item}
            className="rounded-lg border border-dashed px-4 py-3 text-muted-foreground"
          >
            {t(item)} · {t("unavailable")}
          </span>
        ))}
    </nav>
  );
}
