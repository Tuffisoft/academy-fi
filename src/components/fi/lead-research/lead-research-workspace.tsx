"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, BarChart3, Building2, FolderSearch, LayoutDashboard, ListFilter, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadSearchDialog } from "./lead-search-dialog";

type View = "overview" | "campaigns" | "leads" | "analytics";

export function LeadResearchWorkspace() {
  const t = useTranslations("leadResearch");
  const [view, setView] = useState<View>("overview");
  const navigation = [
    { value: "overview", icon: LayoutDashboard },
    { value: "campaigns", icon: FolderSearch },
    { value: "leads", icon: Users },
    { value: "analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <nav aria-label={t("navigation")} className="flex flex-wrap gap-1">
          {navigation.map(({ value, icon: Icon }) => (
            <Button key={value} variant={view === value ? "secondary" : "ghost"} aria-pressed={view === value} onClick={() => setView(value)}>
              <Icon aria-hidden="true" />{t(value)}
            </Button>
          ))}
        </nav>
        <LeadSearchDialog />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{t("setupBadge")}</Badge>
        <span>{t("setupHint")}</span>
      </div>

      {(view === "overview" || view === "analytics") && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "totalLeads", value: "0", hint: "totalHint", icon: Users },
            { title: "averageScore", value: "—", hint: "scoreHint", icon: BarChart3 },
            { title: "totalCampaigns", value: "0", hint: "campaignHint", icon: FolderSearch },
          ].map(({ title, value, hint, icon: Icon }) => (
            <Card key={title}>
              <CardHeader>
                <CardDescription>{t(title)}</CardDescription>
                <CardAction><Icon className="size-4 text-muted-foreground" aria-hidden="true" /></CardAction>
                <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground">{t(hint)}</CardFooter>
            </Card>
          ))}
        </div>
      )}

      {(view === "overview" || view === "campaigns") && (
        <Card>
          <CardHeader>
            <CardTitle>{t("campaigns")}</CardTitle>
            <CardDescription>{t("campaignDescription")}</CardDescription>
            {view === "overview" && <CardAction><Button variant="ghost" size="sm" onClick={() => setView("campaigns")}>{t("viewAll")}<ArrowRight aria-hidden="true" /></Button></CardAction>}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                {["campaign", "status", "leads", "created"].map((key) => <TableHead key={key}>{t(key)}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody><TableRow><TableCell colSpan={4} className="h-36 whitespace-normal text-center">
                <FolderSearch className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{t("noCampaigns")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("noCampaignsHint")}</p>
              </TableCell></TableRow></TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "leads" || view === "analytics") && (
        <div className={view === "overview" ? "grid min-w-0 gap-4 lg:grid-cols-3" : "grid min-w-0 gap-4"}>
          {view !== "analytics" && (
            <Card className={view === "overview" ? "min-w-0 lg:col-span-2" : "min-w-0"}>
              <CardHeader>
                <CardTitle>{t("leads")}</CardTitle>
                <CardDescription>{t("leadsDescription")}</CardDescription>
                <CardAction><Badge variant="secondary">{t("leadCount", { count: 0 })}</Badge></CardAction>
              </CardHeader>
              {view === "leads" && <CardContent className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute top-2 left-2 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input className="pl-8" placeholder={t("searchLeads")} aria-label={t("searchLeads")} disabled />
                </div>
                <Button variant="outline" disabled><ListFilter aria-hidden="true" />{t("filters")}</Button>
              </CardContent>}
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    {["company", "website", "score", "email", "phone"].map((key) => <TableHead key={key}>{t(key)}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody><TableRow><TableCell colSpan={5} className="h-52 whitespace-normal text-center">
                    <Building2 className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" />
                    <p className="font-medium">{t("noLeads")}</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{t("noLeadsHint")}</p>
                  </TableCell></TableRow></TableBody>
                </Table>
              </CardContent>
              {view === "overview" && <CardFooter><Button variant="outline" size="sm" onClick={() => setView("leads")}>{t("browseLeads")}<ArrowRight aria-hidden="true" /></Button></CardFooter>}
            </Card>
          )}
          {view !== "leads" && <Card>
            <CardHeader>
              <CardTitle>{t("distribution")}</CardTitle>
              <CardDescription>{t("distributionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <div className="flex min-h-36 flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                <BarChart3 className="mb-3 size-7 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">{t("noAnalysis")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("noAnalysisHint")}</p>
              </div>
              <div className="space-y-3">
                {["highPotential", "mediumPotential", "lowPotential", "unrated"].map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t(key)}</span><Badge variant="secondary">0</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>}
        </div>
      )}
    </div>
  );
}
