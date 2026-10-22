import { getAcademyApiAccess } from "@/lib/session";
import { getLeadSearches } from "@/lib/data/lead-searches";
import { getWebsiteAudits } from "@/lib/data/website-audits";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAcademyApiAccess();
  if (access.response) return access.response;
  const [searches, audits] = await Promise.all([getLeadSearches(), getWebsiteAudits()]);
  return Response.json({ searches, audits }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
