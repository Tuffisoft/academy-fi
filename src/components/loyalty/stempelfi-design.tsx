"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Coffee,
  Gift,
  Moon,
  Plus,
  ScanLine,
  Smartphone,
  Stamp,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loyaltyPlans } from "@/lib/loyalty/plans";
import { PortalAccountControls } from "./portal-account-controls";

const base = "/tools/calem/stempelkarten";
type CardTone = "primary" | "secondary" | "card";
const tones: Record<CardTone, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  card: "bg-card text-card-foreground",
};

function Brand() {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
      <Stamp aria-hidden="true" className="size-6 text-primary" />
      StempelFi
    </span>
  );
}

export function ProductHeader({
  portal = false,
  languageHref,
  pricingHref = "#pricing",
}: {
  portal?: boolean;
  languageHref?: string;
  pricingHref?: string;
}) {
  const t = useTranslations("stempelfi");
  const locale = useLocale();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 border-b px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-10">
      <Link
        href={base}
        className="min-w-0 justify-self-start rounded-md focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Brand />
      </Link>
      <nav
        aria-label={t("navigation")}
        className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-end"
      >
        {!portal && (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/" />}
            className="min-h-11 basis-full justify-start sm:basis-auto"
          >
            <ArrowLeft aria-hidden="true" />
            {t("backToAcademy")}
          </Button>
        )}
        {!portal && (
          <Button
            variant="ghost"
            nativeButton={false}
            render={<a href={pricingHref} />}
            className="min-h-11 shrink-0"
          >
            {t("pricing")}
          </Button>
        )}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={portal ? base : `${base}/app`} />}
          className="min-h-11 min-w-0 flex-1 sm:flex-none"
        >
          {t(portal ? "website" : "businessLogin")}
        </Button>
      </nav>
      <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 sm:col-start-3">
        <Button
          variant="ghost"
          nativeButton={false}
          render={
            <Link
              href={languageHref ?? pathname}
              locale={locale === "de" ? "en" : "de"}
            />
          }
          className="min-h-11"
          aria-label={t("language")}
        >
          {locale === "de" ? "EN" : "DE"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={t("theme")}
        >
          <Sun className="size-4 dark:hidden" aria-hidden="true" />
          <Moon className="hidden size-4 dark:block" aria-hidden="true" />
        </Button>
      </div>
      {portal && (
        <div className="col-span-2 min-w-0 border-t pt-3 sm:col-span-3">
          <PortalAccountControls />
        </div>
      )}
    </header>
  );
}

function StampCard({
  company,
  title,
  reward,
  goal = 8,
  tone = "primary",
  showcase = false,
}: {
  company: string;
  title: string;
  reward: string;
  goal?: number;
  tone?: CardTone;
  showcase?: boolean;
}) {
  const t = useTranslations("stempelfi");
  const count = Math.min(6, goal);
  return (
    <Card
      className={`w-full gap-5 p-2 ${showcase ? "max-w-md rounded-2xl shadow-xl" : "max-w-sm"} ${tones[tone]}`}
    >
      <CardHeader className="gap-6">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 wrap-break-words text-xs font-medium uppercase tracking-widest">
            {company || t("companyPlaceholder")}
          </span>
          <Coffee aria-hidden="true" className="size-5 shrink-0" />
        </div>
        <CardTitle
          className={`wrap-break-words text-3xl text-inherit ${showcase ? "font-sans font-semibold tracking-tight" : "font-serif"}`}
        >
          {title || t("titlePlaceholder")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {goal <= 12 && (
          <div className="grid grid-cols-4 gap-3" aria-hidden="true">
            {Array.from({ length: goal }, (_, i) => (
              <Badge
                key={i}
                variant={i < count ? "secondary" : "outline"}
                className={`aspect-square h-auto w-full justify-center rounded-full p-0 ${i >= count ? "border-current text-inherit" : ""}`}
              >
                {i < count ? (
                  showcase ? (
                    <Check className="size-6!" />
                  ) : (
                    <Coffee className="size-5!" />
                  )
                ) : (
                  i + 1
                )}
              </Badge>
            ))}
          </div>
        )}
        <Separator className="bg-current/25" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs">{t("reward")}</p>
            <p className="mt-1 wrap-break-words font-medium">
              {reward || t("rewardPlaceholder")}
            </p>
          </div>
          <p
            className="whitespace-nowrap text-xl tabular-nums"
            aria-label={t("stampCount", { count, goal })}
          >
            {count} / {goal}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StempelFiLanding() {
  const t = useTranslations("stempelfi");
  const locale = useLocale();
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  return (
    <main className="min-w-0 bg-background text-foreground [&_h1]:font-sans [&_h2]:font-sans">
      <ProductHeader />
      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-12 sm:px-10 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="grid min-w-0 justify-items-start gap-7">
          <h1 className="max-w-xl text-4xl leading-[1.12] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            <span className="block">{t("heroLead")}</span>
            <span className="block text-primary">{t("heroHighlight")}</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            {t("intro")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="min-h-11 px-5"
              nativeButton={false}
              render={<Link href={`${base}/preview?view=editor`} />}
            >
              {t("tryCard")}
              <ArrowUpRight aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 px-5"
              nativeButton={false}
              render={<a href="#how-it-works" />}
            >
              {t("how")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("freeNote")}</p>
        </div>
        <figure className="grid min-w-0 justify-items-center gap-6 rounded-3xl bg-muted/40 px-3 py-8 sm:px-6 sm:py-10">
          <Badge variant="outline">{t("sampleCard")}</Badge>
          <StampCard
            showcase
            company="Kaffeekollektiv"
            title={t("sampleTitle")}
            reward={t("sampleReward")}
          />
          <figcaption className="max-w-xs text-center text-sm leading-relaxed text-muted-foreground">
            {t("brandPromise")}
          </figcaption>
        </figure>
      </section>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-10 gap-y-4 px-6 pb-12 text-sm text-muted-foreground sm:px-10 sm:pb-20">
        {(
          [
            { Icon: Wallet, key: "wallets" },
            { Icon: Smartphone, key: "noApp" },
            { Icon: ScanLine, key: "confirmation" },
          ] as const
        ).map(({ Icon, key }) => (
          <span key={key} className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-4" />
            {t(key)}
          </span>
        ))}
      </div>
      <section
        id="how-it-works"
        className="mx-auto grid w-full max-w-7xl scroll-mt-8 gap-10 px-6 py-14 sm:px-10 sm:py-24"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("everyday")}
          </h2>
          <p className="self-end leading-relaxed text-muted-foreground">
            {t("audience")}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {(["create", "share", "return"] as const).map((key, index) => (
            <Card key={key} className="border-0 bg-muted/50 py-8 shadow-none">
              <CardHeader className="gap-4">
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  0{index + 1}
                </span>
                <CardTitle className="text-lg">{t(`${key}Title`)}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {t(`${key}Text`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
      <Separator />
      <section
        id="pricing"
        className="mx-auto grid w-full max-w-7xl scroll-mt-8 gap-10 px-6 py-14 sm:px-10 sm:py-24"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="grid gap-4">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("grow")}
            </h2>
            <p className="text-muted-foreground">{t("allPlans")}</p>
          </div>
          <div role="group" aria-label={t("currency")} className="flex gap-2">
            {(["EUR", "USD"] as const).map((value) => (
              <Button
                key={value}
                variant={currency === value ? "default" : "outline"}
                className="min-h-11 px-5"
                aria-pressed={currency === value}
                onClick={() => setCurrency(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3" aria-live="polite">
          {(["FREE", "PRO", "BUSINESS"] as const).map((plan, i) => {
            const limits = loyaltyPlans[plan];
            const price = new Intl.NumberFormat(locale, {
              style: "currency",
              currency,
              minimumFractionDigits: i === 0 ? 0 : 2,
            }).format([0, 9.9, 24.9][i]);
            return (
              <Card
                key={plan}
                className={`min-w-0 py-8 shadow-none ${i === 1 ? "ring-2 ring-primary" : ""}`}
              >
                <CardHeader className="gap-4">
                  <CardTitle>{["Free", "Pro", "Business"][i]}</CardTitle>
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-3xl font-medium tracking-tight">
                    {price}
                    <span className="text-sm font-normal text-muted-foreground">
                      {currency} / {t("month")}
                    </span>
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-4 text-sm">
                    {[
                      limits.programs === null
                        ? t("unlimited")
                        : t("programs", { count: limits.programs }),
                      t("users", { count: limits.users }),
                      t("cards", { count: limits.cards }),
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check
                          aria-hidden="true"
                          className="size-4 shrink-0 text-primary"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">{t("taxes")}</p>
      </section>
      <Separator />
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-10">
        <Brand />
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
      </footer>
    </main>
  );
}

export function StempelFiPortalPreview({
  initialEditor = false,
}: {
  initialEditor?: boolean;
}) {
  const t = useTranslations("stempelfi");
  const [page, setPage] = useState<"overview" | "editor">(
    initialEditor ? "editor" : "overview",
  );
  const [company, setCompany] = useState("Kaffeekollektiv");
  const [title, setTitle] = useState(t("sampleTitle"));
  const [reward, setReward] = useState(t("sampleReward"));
  const [goalInput, setGoalInput] = useState("8");
  const [tone, setTone] = useState<CardTone>("primary");
  const [locked, setLocked] = useState(false);
  const goal = Number(goalInput);
  const validGoal = Number.isSafeInteger(goal) && goal > 0;
  function openEditor(published: boolean) {
    if (published) {
      setGoalInput("8");
      setReward(t("sampleReward"));
    }
    setLocked(published);
    setPage("editor");
  }
  return (
    <main className="min-w-0 bg-background text-foreground">
      <ProductHeader pricingHref={`${base}#pricing`} languageHref={`${base}/preview${page === "editor" ? "?view=editor" : ""}`} />
      <div className="mx-auto w-full max-w-7xl">
        <section className="min-w-0 px-5 py-8 sm:px-9 sm:py-10">
          {page === "overview" ? (
            <div className="grid gap-10 sm:gap-14">
              <div className="grid gap-7">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium"><Coffee aria-hidden="true" className="size-4 text-primary" />Kaffeekollektiv</span>
                  <span className="text-muted-foreground">{t("owner")} · Pro</span>
                  <Badge variant="secondary">{t("sampleData")}</Badge>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div className="grid max-w-2xl gap-4">
                    <h1 className="font-sans text-4xl leading-[1.12] font-semibold tracking-tight text-balance sm:text-5xl">{t("overviewHeading")}</h1>
                    <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{t("overviewIntro")}</p>
                  </div>
                  <Button className="min-h-11 px-5" onClick={() => openEditor(false)}><Plus aria-hidden="true" />{t("newCard")}</Button>
                </div>
              </div>
              <dl className="grid gap-5 rounded-2xl bg-muted/40 p-6 sm:grid-cols-3 sm:gap-8 sm:p-8">
                {([
                  { Icon: Wallet, label: "customerCards", value: "248" },
                  { Icon: Gift, label: "redemptions", value: "31" },
                  { Icon: Users, label: "team", value: "3" },
                ] as const).map(({ Icon, label, value }) => (
                  <div key={label} className="flex min-w-0 items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary"><Icon aria-hidden="true" className="size-5" /></span>
                    <div className="grid gap-1"><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="text-3xl font-semibold tracking-tight tabular-nums">{value}</dd></div>
                  </div>
                ))}
              </dl>
              <section aria-labelledby="sf-programs-heading" className="grid gap-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="grid gap-2"><h2 id="sf-programs-heading" className="text-2xl font-semibold tracking-tight">{t("yourCards")}</h2><p className="text-sm text-muted-foreground">{t("programsIntro")}</p></div>
                  <Badge variant="outline">{t("activePrograms")}</Badge>
                </div>
                <div className="grid items-stretch gap-6 md:grid-cols-2">
                  <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
                    <div className="bg-muted/40 p-5 sm:p-8">
                      <div className="grid gap-6 rounded-2xl bg-primary p-5 text-primary-foreground sm:p-7">
                        <div className="flex items-center justify-between gap-3"><span className="min-w-0 text-xs font-medium uppercase tracking-widest wrap-break-words">Kaffeekollektiv</span><Coffee aria-hidden="true" className="size-5 shrink-0" /></div>
                        <p className="text-3xl font-semibold tracking-tight wrap-break-words">{t("sampleTitle")}</p>
                        <div className="grid grid-cols-8 gap-2" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index} className="flex aspect-square items-center justify-center rounded-full border border-current/50">{index < 6 && <Check className="size-3 sm:size-4" />}</span>)}</div>
                        <p className="text-sm font-medium">{t("sampleReward")}</p>
                      </div>
                    </div>
                    <CardHeader className="gap-3 p-6">
                      <Badge className="w-fit" variant="secondary">{t("published")}</Badge>
                      <CardTitle className="text-xl">{t("sampleTitle")}</CardTitle>
                      <CardDescription>{t("publishedDetails")}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto px-6 pb-6"><Button variant="outline" className="min-h-11 w-full justify-between" onClick={() => { setTitle(t("sampleTitle")); openEditor(true); }}>{t("viewBranding")}<ArrowUpRight aria-hidden="true" /></Button></CardContent>
                  </Card>
                  <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl py-0 shadow-none">
                    <div className="grid flex-1 place-items-center bg-muted/40 p-5 sm:p-8">
                      <div className="grid w-full content-center justify-items-center gap-4 self-stretch rounded-2xl border border-dashed bg-background px-5 py-8 text-center">
                        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-primary"><Stamp aria-hidden="true" className="size-6" /></span>
                        <p className="text-2xl font-semibold tracking-tight wrap-break-words">{t("draftTitle")}</p>
                        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t("draftPreviewIntro")}</p>
                      </div>
                    </div>
                    <CardHeader className="gap-3 p-6"><Badge className="w-fit" variant="outline">{t("draft")}</Badge><CardTitle className="text-xl">{t("draftTitle")}</CardTitle><CardDescription>{t("noCards")}</CardDescription></CardHeader>
                    <CardContent className="mt-auto px-6 pb-6"><Button variant="outline" className="min-h-11 w-full justify-between" onClick={() => { setTitle(t("draftTitle")); openEditor(false); }}>{t("editDraft")}<ArrowUpRight aria-hidden="true" /></Button></CardContent>
                  </Card>
                </div>
              </section>
              <section aria-labelledby="sf-activity-heading" className="grid gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="sf-activity-heading" className="text-2xl font-semibold tracking-tight">{t("activity")}</h2><span className="text-sm text-muted-foreground">{t("sampleData")}</span></div>
                <ul className="grid divide-y rounded-2xl border px-5 sm:px-7">
                  {([{ Icon: Gift, action: "rewardActivity", name: "Mia", minutes: 12 }, { Icon: Stamp, action: "stampActivity", name: "Alex", minutes: 24 }] as const).map(({ Icon, action, name, minutes }) => (
                    <li key={action} className="flex items-start gap-4 py-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><Icon aria-hidden="true" className="size-4" /></span><div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-5 gap-y-2"><div className="grid gap-1"><p className="font-medium">{t(action)}</p><p className="text-sm text-muted-foreground">{t("confirmedBy", { name })}</p></div><span className="text-sm text-muted-foreground">{t("minutesAgo", { count: minutes })}</span></div></li>
                  ))}
                </ul>
              </section>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("overviewScope")}</p>
            </div>
          ) : (
            <div className="grid gap-8">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="grid gap-3">
                  <Badge variant="secondary">
                    {t(locked ? "published" : "draft")}
                  </Badge>
                  <h1 className="font-sans text-4xl font-semibold tracking-tight text-balance">
                    {t("editorHeading")}
                  </h1>
                  <p className="text-muted-foreground">{t("editorIntro")}</p>
                </div>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setPage("overview")}
                >
                  {t("back")}
                </Button>
              </div>
              <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <Card className="order-2 min-w-0 rounded-2xl shadow-none lg:order-1">
                  <CardHeader>
                    <CardTitle>{t("cardDesign")}</CardTitle>
                    <CardDescription>{t("localOnly")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(event) => event.preventDefault()}
                      className="grid gap-6"
                    >
                      <div className="grid gap-2">
                        <Label htmlFor="sf-company">{t("company")}</Label>
                        <Input
                          id="sf-company"
                          className="min-h-11"
                          value={company}
                          maxLength={45}
                          onChange={(event) => setCompany(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sf-title">{t("cardTitle")}</Label>
                        <Input
                          id="sf-title"
                          className="min-h-11"
                          value={title}
                          maxLength={60}
                          onChange={(event) => setTitle(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sf-reward">{t("reward")}</Label>
                        <Input
                          id="sf-reward"
                          className="min-h-11"
                          value={reward}
                          maxLength={80}
                          disabled={locked}
                          onChange={(event) => setReward(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sf-goal">{t("goal")}</Label>
                        <Input
                          id="sf-goal"
                          className="min-h-11"
                          type="number"
                          min="1"
                          step="1"
                          value={goalInput}
                          disabled={locked}
                          aria-invalid={!validGoal}
                          aria-describedby={
                            !validGoal ? "sf-goal-error" : undefined
                          }
                          onChange={(event) => setGoalInput(event.target.value)}
                        />
                        {!validGoal && (
                          <p
                            id="sf-goal-error"
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {t("goalError")}
                          </p>
                        )}
                      </div>
                      <fieldset className="grid gap-3">
                        <legend className="mb-3 text-sm font-medium">
                          {t("editorColor")}
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {(["primary", "secondary", "card"] as const).map(
                            (value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={tone === value ? "default" : "outline"}
                                className="min-h-11 gap-2"
                                aria-pressed={tone === value}
                                onClick={() => setTone(value)}
                              >
                                <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${tones[value]}`}>
                                  {tone === value && <Check className="size-4" />}
                                </span>
                                {t(`colorNames.${value}`)}
                              </Button>
                            ),
                          )}
                        </div>
                      </fieldset>
                      <Button variant="outline" nativeButton={false} render={<a href="#sf-live-preview" />} className="min-h-11 lg:hidden">
                        {t("showPreview")}
                        <ArrowUpRight aria-hidden="true" />
                      </Button>
                      {locked && (
                        <p className="text-sm text-muted-foreground">
                          {t("locked")}
                        </p>
                      )}
                    </form>
                  </CardContent>
                </Card>
                <div
                  id="sf-live-preview"
                  tabIndex={-1}
                  aria-label={t("livePreview")}
                  className="order-1 grid min-w-0 scroll-mt-6 justify-items-center gap-5 rounded-3xl bg-muted/40 px-3 py-8 focus-visible:outline-2 focus-visible:outline-ring sm:px-6 sm:py-10 lg:order-2 lg:sticky lg:top-6"
                  aria-live="polite"
                >
                  <Badge variant="outline">{t("livePreview")}</Badge>
                  <StampCard
                    showcase
                    company={company}
                    title={title}
                    reward={reward}
                    goal={validGoal ? goal : 8}
                    tone={tone}
                  />
                  <p className="max-w-sm text-center text-sm text-muted-foreground">
                    {t(validGoal ? "cardPreview" : "invalidPreview")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
