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

export async function SignInPanel({ destination }: { destination?: SignInDestination } = {}) {
  const t = await getTranslations("auth");
  const product = await getTranslations("stempelfi");
  const account = await getTranslations("customerAccount");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-32">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{destination ? product("signInTitle") : t("signInTitle")}</CardTitle>
          <CardDescription>{destination ? (customerRegistrationEnabled() ? account("loginNote") : product("signInDescription")) : t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm destination={destination} />
          {destination && customerRegistrationEnabled() && <nav className="mt-5 grid gap-3"><Link className="rounded underline focus-visible:outline-2" href="/tools/calem/stempelkarten/account">{account("register")}</Link><Link className="rounded underline focus-visible:outline-2" href="/tools/calem/stempelkarten/account?mode=requestReset">{account("requestReset")}</Link></nav>}
        </CardContent>
      </Card>
    </div>
  );
}
