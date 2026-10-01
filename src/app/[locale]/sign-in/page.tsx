import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-1 items-center justify-center py-32 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("signInTitle")}</CardTitle>
          <CardDescription>{t("signInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </div>
  );
}
