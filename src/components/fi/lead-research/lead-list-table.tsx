"use client";

import type { ReactNode } from "react";
import { Bookmark, ExternalLink, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Table } from "@/components/ui/table";
import styles from "./lead-list-table.module.css";

export function LeadColumnLabel({ column, label }: { column: string; label: string }) {
  const t = useTranslations("leadResearch");
  const Icon = column === "storageStatus" ? Bookmark : column === "leadDetails" ? Eye : null;
  if (Icon) return <><Icon className="size-4" aria-hidden="true" /><span className="sr-only">{label}</span></>;
  const shortLabels: Record<string, string> = {
    businessStatus: "tableStatus", googleStars: "tableGoogle", auditQuality: "tableQuality",
  };
  return <span>{shortLabels[column] ? t(shortLabels[column]) : label}</span>;
}

export function LeadWebsiteLink({ website }: { website: string }) {
  const t = useTranslations("leadResearch");
  let domain = website;
  try { domain = new URL(website).hostname.replace(/^www\./, ""); } catch { /* Keep malformed source values readable. */ }
  return <a href={website} target="_blank" rel="noopener noreferrer" title={website}
    aria-label={`${t("openWebsite")}: ${domain}`} className={styles.website}>
    <span>{domain}</span><ExternalLink aria-hidden="true" />
  </a>;
}

export function LeadListTable({ children, showAuthor = false }: { children: ReactNode; showAuthor?: boolean }) {
  const widths = showAuthor
    ? [20, 12, 16, 11, 9, 8, 8, 8, 4, 4]
    : [22, 13, 18, 12, 10, 8, 9, 4, 4];
  return <div className={styles.frame}><Table className={styles.table}>
    <colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
    {children}
  </Table></div>;
}
