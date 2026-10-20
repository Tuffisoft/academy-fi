"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { LeadSearchSummary } from "@/lib/lead-research/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadSearchDialog } from "./lead-search-dialog";
import { DeleteSearchDialog } from "./delete-search-dialog";

export function CampaignMenu({ search }: { search: LeadSearchSummary }) {
  const t = useTranslations("leadResearch");
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("actionsFor", { location: search.location, industry: search.industry })}><Ellipsis aria-hidden="true" /></Button>} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={search.status !== "DRAFT"} onClick={() => setDialog("edit")}><Pencil aria-hidden="true" />{t("edit")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={search.status !== "DRAFT"} onClick={() => setDialog("delete")}><Trash2 aria-hidden="true" />{t("delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <LeadSearchDialog search={search} hideTrigger open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)} />
    <DeleteSearchDialog search={search} hideTrigger open={dialog === "delete"} onOpenChange={(open) => setDialog(open ? "delete" : null)} />
  </>;
}
