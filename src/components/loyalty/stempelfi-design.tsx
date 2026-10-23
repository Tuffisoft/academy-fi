"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ArrowUpRight, Check, Coffee, Gift, LayoutDashboard, Moon, Plus, ScanLine, Smartphone, Stamp, Sun, Users, Wallet } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { loyaltyPlans } from "@/lib/loyalty/plans";

const base = "/tools/calem/stempelkarten";
type CardTone = "primary" | "secondary" | "card";
const tones: Record<CardTone, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  card: "bg-card text-card-foreground",
};

function Brand() {
  return <span className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight"><Stamp aria-hidden="true" className="size-6 text-primary" />StempelFi</span>;
}

export function ProductHeader({ portal = false }: { portal?: boolean }) {
  const t = useTranslations("stempelfi");
  const locale = useLocale();
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  return <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-10">
    <Link href={base} className="rounded-md focus-visible:outline-2 focus-visible:outline-ring"><Brand /></Link>
    <nav aria-label={t("navigation")} className="flex flex-wrap items-center gap-2">
      {!portal && <Button variant="ghost" nativeButton={false} render={<a href="#pricing" />} className="min-h-11">{t("pricing")}</Button>}
      <Button variant="outline" nativeButton={false} render={<Link href={portal ? base : `${base}/app`} />} className="min-h-11">{t(portal ? "website" : "businessLogin")}</Button>
      <Button variant="ghost" nativeButton={false} render={<Link href={pathname} locale={locale === "de" ? "en" : "de"} />} className="min-h-11" aria-label={t("language")}>{locale === "de" ? "EN" : "DE"}</Button>
      <Button variant="ghost" size="icon" className="size-11" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label={t("theme")}>
        <Sun className="size-4 dark:hidden" aria-hidden="true" /><Moon className="hidden size-4 dark:block" aria-hidden="true" />
      </Button>
    </nav>
  </header>;
}

function PreviewNotice() {
  const t = useTranslations("stempelfi");
  return <div className="flex flex-wrap items-center gap-2 border-b bg-muted px-5 py-3 text-sm text-muted-foreground sm:px-10"><Badge variant="secondary">{t("design")}</Badge><span>{t("notice")}</span></div>;
}

function StampCard({ company, title, reward, goal = 8, tone = "primary" }: { company: string; title: string; reward: string; goal?: number; tone?: CardTone }) {
  const t = useTranslations("stempelfi");
  const count = Math.min(6, goal);
  return <Card className={`w-full max-w-sm gap-5 p-2 ${tones[tone]}`}>
    <CardHeader className="gap-6">
      <div className="flex items-center justify-between gap-3"><span className="min-w-0 break-words text-xs font-medium uppercase tracking-widest">{company || t("companyPlaceholder")}</span><Coffee aria-hidden="true" className="size-5 shrink-0" /></div>
      <CardTitle className="break-words font-serif text-3xl text-inherit">{title || t("titlePlaceholder")}</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-6">
      {goal <= 12 && <div className="grid grid-cols-4 gap-3" aria-hidden="true">{Array.from({ length: goal }, (_, i) => <Badge key={i} variant={i < count ? "secondary" : "outline"} className={`aspect-square h-auto w-full justify-center rounded-full p-0 ${i >= count ? "border-current text-inherit" : ""}`}>{i < count ? <Coffee className="size-5!" /> : i + 1}</Badge>)}</div>}
      <Separator className="bg-current/25" />
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-xs">{t("reward")}</p><p className="mt-1 break-words font-medium">{reward || t("rewardPlaceholder")}</p></div><p className="whitespace-nowrap text-xl tabular-nums" aria-label={t("stampCount", { count, goal })}>{count} / {goal}</p></div>
    </CardContent>
  </Card>;
}

export function StempelFiLanding() {
  const t = useTranslations("stempelfi");
  const locale = useLocale();
  const [currency, setCurrency] = useState<"EUR" | "USD">("EUR");
  return <main className="min-w-0 bg-background text-foreground">
    <PreviewNotice /><ProductHeader />
    <section className="grid items-center gap-14 px-6 py-12 sm:px-10 sm:py-20 lg:grid-cols-2">
      <div className="grid gap-7">
        <Badge variant="secondary">{t("kicker")}</Badge>
        <h1 className="max-w-xl font-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">{t("hero")}</h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{t("intro")}</p>
        <div className="flex flex-wrap gap-3"><Button className="min-h-11" nativeButton={false} render={<Link href={`${base}/preview?view=editor`} />}>{t("tryCard")}<ArrowUpRight aria-hidden="true" /></Button><Button variant="ghost" className="min-h-11" nativeButton={false} render={<a href="#how-it-works" />}>{t("how")}</Button></div>
        <p className="text-sm text-muted-foreground">{t("freeNote")}</p>
      </div>
      <div className="grid justify-items-center gap-6 rounded-3xl bg-accent px-6 py-12 sm:rotate-[-2deg]">
        <StampCard company="Kaffeekollektiv" title={t("sampleTitle")} reward={t("sampleReward")} />
        <p className="max-w-xs text-center text-sm text-accent-foreground">{t("brandPromise")}</p>
      </div>
    </section>
    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 border-y px-6 py-6 text-sm text-muted-foreground">{([{ Icon: Wallet, key: "wallets" }, { Icon: Smartphone, key: "noApp" }, { Icon: ScanLine, key: "confirmation" }] as const).map(({ Icon, key }) => <span key={key} className="flex items-center gap-2"><Icon aria-hidden="true" className="size-4" />{t(key)}</span>)}</div>
    <section id="how-it-works" className="grid gap-10 px-6 py-14 sm:px-10 sm:py-20">
      <div className="grid gap-4 sm:grid-cols-2"><h2 className="font-serif text-4xl tracking-tight">{t("everyday")}</h2><p className="self-end leading-relaxed text-muted-foreground">{t("audience")}</p></div>
      <div className="grid gap-5 md:grid-cols-3">{(["create", "share", "return"] as const).map((key, index) => <Card key={key} className="shadow-none"><CardHeader className="gap-4"><Badge variant="outline">0{index + 1}</Badge><CardTitle className="text-lg">{t(`${key}Title`)}</CardTitle><CardDescription className="leading-relaxed">{t(`${key}Text`)}</CardDescription></CardHeader></Card>)}</div>
    </section>
    <Separator />
    <section id="pricing" className="grid gap-8 px-6 py-14 sm:px-10 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6"><div className="grid gap-4"><h2 className="font-serif text-4xl tracking-tight">{t("grow")}</h2><p className="text-muted-foreground">{t("allPlans")}</p></div><div role="group" aria-label={t("currency")} className="flex gap-2">{(["EUR", "USD"] as const).map(value => <Button key={value} variant={currency === value ? "default" : "outline"} className="min-h-11" aria-pressed={currency === value} onClick={() => setCurrency(value)}>{value}</Button>)}</div></div>
      <div className="grid gap-5 md:grid-cols-3" aria-live="polite">{(["FREE", "PRO", "BUSINESS"] as const).map((plan, i) => {
        const limits = loyaltyPlans[plan];
        const price = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: i === 0 ? 0 : 2 }).format([0, 9.9, 24.9][i]);
        return <Card key={plan} className={i === 1 ? "ring-2 ring-primary" : ""}><CardHeader className="gap-4"><CardTitle>{["Free", "Pro", "Business"][i]}</CardTitle><p className="text-3xl font-medium tracking-tight">{price}<span className="ml-2 text-sm font-normal text-muted-foreground">{currency} / {t("month")}</span></p></CardHeader><CardContent><ul className="grid gap-4 text-sm">{[limits.programs === null ? t("unlimited") : t("programs", { count: limits.programs }), t("users", { count: limits.users }), t("cards", { count: limits.cards })].map(item => <li key={item} className="flex items-start gap-2"><Check aria-hidden="true" className="size-4 shrink-0 text-primary" />{item}</li>)}</ul></CardContent></Card>;
      })}</div>
      <p className="text-sm text-muted-foreground">{t("taxes")}</p>
    </section>
    <Separator /><footer className="flex flex-wrap items-center justify-between gap-4 px-6 py-7 sm:px-10"><Brand /><p className="text-sm text-muted-foreground">{t("tagline")}</p></footer>
  </main>;
}

export function StempelFiPortalPreview({ initialEditor = false }: { initialEditor?: boolean }) {
  const t = useTranslations("stempelfi");
  const [page, setPage] = useState<"overview" | "editor">(initialEditor ? "editor" : "overview");
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
  return <main className="min-w-0 bg-background text-foreground">
    <PreviewNotice /><ProductHeader portal />
    <div className="grid border-t lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="grid content-start gap-6 border-b bg-sidebar px-5 py-6 text-sidebar-foreground lg:border-r lg:border-b-0">
        <div className="grid gap-1"><p className="font-medium">Kaffeekollektiv</p><p className="text-sm text-muted-foreground">{t("owner")} · Pro</p></div>
        <nav aria-label={t("portalNavigation")} className="flex flex-wrap gap-2 lg:grid">
          <Button variant={page === "overview" ? "secondary" : "ghost"} className="min-h-11 justify-start" aria-pressed={page === "overview"} onClick={() => setPage("overview")}><LayoutDashboard aria-hidden="true" />{t("overview")}</Button>
          <Button variant={page === "editor" ? "secondary" : "ghost"} className="min-h-11 justify-start" aria-pressed={page === "editor"} onClick={() => openEditor(false)}><Stamp aria-hidden="true" />{t("cardDesign")}</Button>
        </nav>
        <p className="hidden text-sm leading-relaxed text-muted-foreground lg:block">{t("previewScope")}</p>
      </aside>
      <section className="min-w-0 px-5 py-8 sm:px-9 sm:py-10">
        {page === "overview" ? <div className="grid gap-9">
          <div className="flex flex-wrap items-end justify-between gap-5"><div className="grid gap-3"><Badge variant="outline">{t("sampleData")}</Badge><h1 className="font-serif text-4xl tracking-tight">{t("welcome")}</h1><p className="text-muted-foreground">{t("welcomeText")}</p></div><Button className="min-h-11" onClick={() => openEditor(false)}><Plus aria-hidden="true" />{t("newCard")}</Button></div>
          <div className="grid gap-4 sm:grid-cols-3">{([{ Icon: Wallet, label: "customerCards", value: "248" }, { Icon: Gift, label: "redemptions", value: "31" }, { Icon: Users, label: "team", value: "3" }] as const).map(({ Icon, label, value }) => <Card key={label}><CardHeader className="gap-3"><Icon className="size-4 text-muted-foreground" aria-hidden="true" /><CardDescription>{t(label)}</CardDescription><CardTitle className="text-3xl tabular-nums">{value}</CardTitle></CardHeader></Card>)}</div>
          <div className="grid gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-medium">{t("yourCards")}</h2><Badge variant="secondary">{t("activePrograms")}</Badge></div><div className="grid gap-5 xl:grid-cols-2">
            <Card><CardHeader><CardTitle>{t("sampleTitle")}</CardTitle><CardDescription>{t("publishedDetails")}</CardDescription></CardHeader><CardContent className="grid justify-items-start gap-5"><Badge>{t("published")}</Badge><Button variant="outline" className="min-h-11" onClick={() => openEditor(true)}>{t("viewBranding")}</Button></CardContent></Card>
            <Card><CardHeader><CardTitle>{t("draftTitle")}</CardTitle><CardDescription>{t("noCards")}</CardDescription></CardHeader><CardContent className="grid justify-items-start gap-5"><Badge variant="secondary">{t("draft")}</Badge><Button variant="outline" className="min-h-11" onClick={() => openEditor(false)}>{t("editDraft")}</Button></CardContent></Card>
          </div></div>
          <Card><CardHeader><CardTitle>{t("activity")}</CardTitle><CardDescription>{t("sampleData")}</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="flex flex-wrap justify-between gap-2"><p>{t("rewardActivity")}<span className="mt-1 block text-sm text-muted-foreground">{t("confirmedBy", { name: "Mia" })}</span></p><span className="text-sm text-muted-foreground">{t("minutesAgo", { count: 12 })}</span></div><Separator /><div className="flex flex-wrap justify-between gap-2"><p>{t("stampActivity")}<span className="mt-1 block text-sm text-muted-foreground">{t("confirmedBy", { name: "Alex" })}</span></p><span className="text-sm text-muted-foreground">{t("minutesAgo", { count: 24 })}</span></div></CardContent></Card>
        </div> : <div className="grid gap-8">
          <div className="flex flex-wrap items-end justify-between gap-5"><div className="grid gap-3"><Badge variant="secondary">{t(locked ? "published" : "draft")}</Badge><h1 className="font-serif text-4xl tracking-tight">{t("editorHeading")}</h1><p className="text-muted-foreground">{t("editorIntro")}</p></div><Button variant="outline" className="min-h-11" onClick={() => setPage("overview")}>{t("back")}</Button></div>
          <div className="grid items-start gap-8 xl:grid-cols-2">
            <Card><CardHeader><CardTitle>{t("cardDesign")}</CardTitle><CardDescription>{t("localOnly")}</CardDescription></CardHeader><CardContent><form onSubmit={event => event.preventDefault()} className="grid gap-6">
              <div className="grid gap-2"><Label htmlFor="sf-company">{t("company")}</Label><Input id="sf-company" className="min-h-11" value={company} maxLength={45} onChange={event => setCompany(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="sf-title">{t("cardTitle")}</Label><Input id="sf-title" className="min-h-11" value={title} maxLength={60} onChange={event => setTitle(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="sf-reward">{t("reward")}</Label><Input id="sf-reward" className="min-h-11" value={reward} maxLength={80} disabled={locked} onChange={event => setReward(event.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="sf-goal">{t("goal")}</Label><Input id="sf-goal" className="min-h-11" type="number" min="1" step="1" value={goalInput} disabled={locked} aria-invalid={!validGoal} aria-describedby={!validGoal ? "sf-goal-error" : undefined} onChange={event => setGoalInput(event.target.value)} />{!validGoal && <p id="sf-goal-error" role="alert" className="text-sm text-destructive">{t("goalError")}</p>}</div>
              <fieldset className="grid gap-3"><legend className="mb-3 text-sm font-medium">{t("color")}</legend><div className="flex flex-wrap gap-2">{(["primary", "secondary", "card"] as const).map(value => <Button key={value} type="button" variant={tone === value ? "default" : "outline"} className="min-h-11" aria-pressed={tone === value} onClick={() => setTone(value)}>{t(value)}</Button>)}</div></fieldset>
              {locked && <p className="text-sm text-muted-foreground">{t("locked")}</p>}
            </form></CardContent></Card>
            <div className="grid justify-items-center gap-4 py-3" aria-live="polite"><StampCard company={company} title={title} reward={reward} goal={validGoal ? goal : 8} tone={tone} /><p className="max-w-sm text-center text-sm text-muted-foreground">{t(validGoal ? "cardPreview" : "invalidPreview")}</p></div>
          </div>
        </div>}
      </section>
    </div>
  </main>;
}
