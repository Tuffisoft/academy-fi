import { boundedBody, programHeaders, programRequestActor, programResponse } from "@/lib/loyalty/program-http";
import { programFailure } from "@/lib/loyalty/program-reply";
import { ProgramError } from "@/lib/loyalty/programs";
import { uploadProgramLogo } from "@/lib/loyalty/program-assets";
import { maxLogoBytes } from "@/lib/loyalty/logo";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const locale = request.headers.get("accept-language")?.startsWith("de") ? "de" : "en";
  try {
    const actor = await programRequestActor(request);
    if (!actor) return Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message: locale === "de" ? "Bitte erneut anmelden." : "Please sign in again." } }, { status: 401, headers: programHeaders });
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new ProgramError("INVALID_INPUT");
    const bytes = await boundedBody(request, maxLogoBytes + 16384);
    let form: FormData;
    try { form = await new Response(new Uint8Array(bytes), { headers: { "content-type": request.headers.get("content-type")! } }).formData(); }
    catch { throw new ProgramError("INVALID_INPUT"); }
    const file = form.get("file"), operation = form.get("operationId");
    if (!(file instanceof File) || typeof operation !== "string" || [...form.keys()].some(key => !["file", "operationId"].includes(key)) || form.getAll("file").length !== 1 || form.getAll("operationId").length !== 1) throw new ProgramError("INVALID_INPUT");
    return programResponse({ ok: true, data: await uploadProgramLogo(actor, (await context.params).organizationId, operation, file) });
  } catch (error) { return programResponse(programFailure(error, locale)); }
}
