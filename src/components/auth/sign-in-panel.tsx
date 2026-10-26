import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Link } from "@/i18n/navigation";
import { customerRegistrationEnabled } from "@/lib/loyalty/customer-account";
import type { SignInDestination } from "@/lib/loyalty/invitation-link";
import { Stamp } from "lucide-react";

export async function SignInPanel({ destination }: { destination?: SignInDestination } = {}) {
  const t = await getTranslations("auth");
  const product = await getTranslations("stempelfi");
  const account = await getTranslations("customerAccount");

  return (
    <div className={destination ? "flex min-w-0 flex-1 items-center justify-center bg-muted/30 px-5 py-12 sm:py-20" : "flex flex-1 items-center justify-center px-4 py-32"}>
      <div className="grid w-full min-w-0 max-w-sm gap-6">
        {destination && <p className="flex items-center justify-center gap-2 text-xl font-semibold tracking-tight"><Stamp className="size-6 text-primary" aria-hidden="true" />StempelFi</p>}
        <Card className="w-full min-w-0">
          <CardHeader className={destination ? "gap-3 border-b pb-5" : undefined}>
            <CardTitle>{destination ? <h1 className="wrap-break-words font-serif text-3xl tracking-tight">{product("signInTitle")}</h1> : t("signInTitle")}</CardTitle>
            <CardDescription>{destination ? (customerRegistrationEnabled() ? account("loginNote") : product("signInDescription")) : t("signInDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm destination={destination} />
            {destination && customerRegistrationEnabled() && <nav className="mt-5 grid gap-3 border-t pt-5"><Link className="inline-flex min-h-11 items-center rounded underline focus-visible:outline-2 focus-visible:outline-ring" href="/tools/calem/stempelkarten/account">{account("register")}</Link><Link className="inline-flex min-h-11 items-center rounded underline focus-visible:outline-2 focus-visible:outline-ring" href="/tools/calem/stempelkarten/account?mode=requestReset">{account("requestReset")}</Link></nav>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
