import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <div className="grid w-full gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
            <h2 className="text-xl font-semibold">
              {t("presentationCardTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("presentationCardDescription")}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
            <h2 className="text-xl font-semibold">{t("learningCardTitle")}</h2>
            <p className="mt-2 text-muted-foreground">
              {t("learningCardDescription")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
