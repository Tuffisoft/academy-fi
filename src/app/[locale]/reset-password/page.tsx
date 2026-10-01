import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-1 items-center justify-center py-32 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("resetPasswordTitle")}</CardTitle>
          <CardDescription>{t("resetPasswordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
