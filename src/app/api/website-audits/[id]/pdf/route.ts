import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPdfDesign } from "@/lib/data/pdf-design";
import { leadSearchScope } from "@/lib/lead-research/search-input";
import { createWebsiteReportPdf } from "@/lib/lead-research/pdf/render";
import type { WebsiteReport } from "@/lib/lead-research/website-quality";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  const { id } = await params;
  if (!id || id.length > 128) return Response.json({ error: "not_found" }, { status: 404, headers });
  const row = await prisma.websiteAudit.findFirst({ where: { id, ...leadSearchScope(session.user), status: "COMPLETED" }, select: { report: true } });
  if (!row?.report) return Response.json({ error: "not_found" }, { status: 404, headers });
  try {
    const design = await getPdfDesign(session.user.id);
    const report = row.report as WebsiteReport;
    const bytes = await createWebsiteReportPdf(report, design, new URL(request.url).searchParams.get("locale") === "en" ? "en" : "de");
    const host = new URL(report.url).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="website-report-${host}-${new Date(report.checkedAt).toISOString().slice(0, 10)}.pdf"`, "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "pdf_unavailable" }, { status: 500, headers });
  }
}
