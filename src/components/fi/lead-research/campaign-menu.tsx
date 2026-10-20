"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ellipsis, Eye, Pencil, Play, Trash2 } from "lucide-react";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { isLeadSearchMutable } from "@/lib/lead-research/search-input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadSearchDialog } from "./lead-search-dialog";
import { DeleteSearchDialog } from "./delete-search-dialog";

export function CampaignMenu({ search, onRun, onShow, running }: { search: LeadSearchSummary; onRun: (id: string) => void; onShow: (id: string) => void; running: boolean }) {
  const t = useTranslations("leadResearch");
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("actionsFor", { location: search.location, industry: search.industry })}><Ellipsis aria-hidden="true" /></Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={running || search.status === "QUEUED" || search.status === "RUNNING"} onClick={() => onRun(search.id)}><Play aria-hidden="true" />{t("runSearch")}</DropdownMenuItem>
        <DropdownMenuItem disabled={search.status === "QUEUED" || search.status === "RUNNING" || search.resultCount === 0} onClick={() => onShow(search.id)}><Eye aria-hidden="true" />{t("jobShowResults")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={running || !isLeadSearchMutable(search.status)} onClick={() => setDialog("edit")}><Pencil aria-hidden="true" />{t("edit")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={running || !isLeadSearchMutable(search.status)} onClick={() => setDialog("delete")}><Trash2 aria-hidden="true" />{t("delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <LeadSearchDialog search={search} hideTrigger open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)} />
    <DeleteSearchDialog search={search} hideTrigger open={dialog === "delete"} onOpenChange={(open) => setDialog(open ? "delete" : null)} />
  </>;
}
