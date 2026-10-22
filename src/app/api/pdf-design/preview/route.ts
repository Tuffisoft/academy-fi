import { getAcademyApiAccess } from "@/lib/session";
import { parsePdfDesign } from "@/lib/lead-research/pdf/design";
import { createWebsiteReportPdf } from "@/lib/lead-research/pdf/render";
import { sampleWebsiteReport } from "@/lib/lead-research/pdf/report-data";
import { PdfTemplateError } from "@/lib/lead-research/pdf/evaluate-jsx";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function POST(request: Request) {
  const access = await getAcademyApiAccess();
  if (access.response) return access.response;
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "invalid_request" }, { status: 415, headers });
  try {
    const text = await request.text();
    if (text.length > 400_000) return Response.json({ error: "template_too_large" }, { status: 413, headers });
    const input = JSON.parse(text);
    const design = parsePdfDesign(input);
    if (!design) return Response.json({ error: "invalid_template" }, { status: 400, headers });
    const bytes = await createWebsiteReportPdf(sampleWebsiteReport, design, input.locale === "en" ? "en" : "de");
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="report-design-preview.pdf"', "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    return Response.json({ error: error instanceof PdfTemplateError ? error.message : "preview_failed" }, { status: 400, headers });
  }
}
