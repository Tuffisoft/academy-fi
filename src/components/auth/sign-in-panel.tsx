import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";

export async function SignInPanel({ destination }: { destination?: "stempelfi" } = {}) {
  const t = await getTranslations("auth");
  const product = await getTranslations("stempelfi");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-32">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{destination ? product("signInTitle") : t("signInTitle")}</CardTitle>
          <CardDescription>{destination ? product("signInDescription") : t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm destination={destination} />
        </CardContent>
      </Card>
    </div>
  );
}
