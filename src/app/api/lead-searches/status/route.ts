import { getCurrentSession } from "@/lib/session";
import { getLeadSearches } from "@/lib/data/lead-searches";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  return Response.json({ searches: await getLeadSearches() }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
