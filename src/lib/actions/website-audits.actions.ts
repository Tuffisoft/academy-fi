"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import type { WebsiteReport } from "@/lib/lead-research/website-quality";

export async function getWebsiteReportAction(id: unknown) {
  const user = await requireUser();
  if (typeof id !== "string" || !id.trim() || id.length > 128) return { success: false as const };
  const row = await prisma.websiteAudit.findFirst({ where: { id, ...leadSearchScope(user), status: "COMPLETED" }, select: { report: true } });
  if (!row) return { success: false as const };
  return { success: true as const, report: row.report as WebsiteReport | null };
}
