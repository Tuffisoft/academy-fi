"use client";

import type { ReactNode } from "react";
import { Bookmark, Eye, Gauge, Globe, Power, Star, UserRound } from "lucide-react";
import { Table } from "@/components/ui/table";
import styles from "./lead-list-table.module.css";

const columnIcons = {
  website: Globe,
  businessStatus: Power,
  googleStars: Star,
  author: UserRound,
  auditQuality: Gauge,
  storageStatus: Bookmark,
  leadDetails: Eye,
};

export function LeadColumnLabel({ column, label }: { column: string; label: string }) {
  const Icon = columnIcons[column as keyof typeof columnIcons];
  return Icon ? <><Icon className="size-4" aria-hidden="true" /><span className="sr-only">{label}</span></> : label;
}

export function LeadListTable({ children, showAuthor = false }: { children: ReactNode; showAuthor?: boolean }) {
  const widths = showAuthor
    ? [22, 12, 19, 12, 8, 8, 9, 5, 5]
    : [24, 13, 21, 13, 9, 10, 5, 5];
  return <Table className={styles.table}>
    <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
    {children}
  </Table>;
}
