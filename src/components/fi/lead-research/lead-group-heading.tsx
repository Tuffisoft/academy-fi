"use client";

import { useTranslations } from "next-intl";
import type { LeadGroup } from "@/lib/lead-research/lead-groups";
import { TableCell, TableRow } from "@/components/ui/table";

export function LeadGroupHeading({ group, count, columns }: { group: LeadGroup; count: number; columns: number }) {
  const t = useTranslations("leadResearch");
  return <TableRow className="bg-muted/50 hover:bg-muted/50">
    <TableCell colSpan={columns} className="whitespace-normal py-3">
      <p className="font-semibold">{t(`leadGroups.${group}`)} <span className="text-muted-foreground">({count})</span></p>
    </TableCell>
  </TableRow>;
}
