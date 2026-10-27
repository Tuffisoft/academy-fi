import { getCurrentSession } from "@/lib/session";
import { programLogo } from "@/lib/loyalty/program-assets";
import { programHeaders, programResponse } from "@/lib/loyalty/program-http";
import { programFailure } from "@/lib/loyalty/program-reply";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ organizationId: string; id: string }> }) {
  const locale = request.headers.get("accept-language")?.startsWith("de") ? "de" : "en";
  try {
    const actor = (await getCurrentSession())?.user.id;
    if (!actor) return new Response(null, { status: 401, headers: programHeaders });
    const { organizationId, id } = await context.params;
    const image = await programLogo(actor, organizationId, id);
    return new Response(image.body, { headers: { ...programHeaders, "Content-Type": "image/png", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return programResponse(programFailure(error, locale)); }
}
