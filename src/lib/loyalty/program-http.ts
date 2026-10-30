import "server-only";
import { getCurrentSession } from "@/lib/session";
import { changeProgramLifecycle, ProgramError, saveProgram } from "./programs";
import { programFailure, type ProgramReply } from "./program-reply";
import { boundedBody } from "./program-body";
export { boundedBody } from "./program-body";

export const programHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  Vary: "Origin",
};
export function programResponse<T>(reply: ProgramReply<T>) {
  const status = reply.ok
    ? 200
    : (
        {
          INVALID_INPUT: 422,
          LOGO_TOO_LARGE: 413,
          LOGO_UNSUPPORTED: 415,
          LOGO_INVALID: 422,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          REVISION_CONFLICT: 409,
          IDEMPOTENCY_CONFLICT: 409,
          PROGRAM_LIMIT: 409,
          STATE_CONFLICT: 409,
          CONDITIONS_BOUND: 409,
          UNAUTHENTICATED: 401,
          UNAVAILABLE: 503,
        } as const
      )[reply.error.code];
  return Response.json(reply, { status, headers: programHeaders });
}
export async function programRequestActor(request: Request) {
  if (
    !process.env.BETTER_AUTH_URL ||
    request.headers.get("origin") !==
      new URL(process.env.BETTER_AUTH_URL).origin
  )
    throw new ProgramError("FORBIDDEN");
  return (await getCurrentSession())?.user.id;
}
export async function programHttp(
  request: Request,
  organizationId: string,
  programId?: string,
) {
  return programCommandHttp(request, organizationId, programId, false);
}

export async function programLifecycleHttp(request: Request, organizationId: string, programId: string) {
  return programCommandHttp(request, organizationId, programId, true);
}

async function programCommandHttp(request: Request, organizationId: string, programId: string | undefined, lifecycle: boolean) {
  const locale = request.headers.get("accept-language")?.startsWith("de")
    ? "de"
    : "en";
  try {
    const actor = await programRequestActor(request);
    if (!actor)
      return programResponse({
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message:
            locale === "de"
              ? "Bitte erneut anmelden."
              : "Please sign in again.",
        },
      });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      throw new ProgramError("INVALID_INPUT");
    let raw: unknown;
    try {
      raw = JSON.parse((await boundedBody(request, 16384)).toString("utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) throw new ProgramError("INVALID_INPUT");
      throw error;
    }
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      "organizationId" in raw ||
      "programId" in raw
    )
      throw new ProgramError("INVALID_INPUT");
    return programResponse({
      ok: true,
      data: await (lifecycle ? changeProgramLifecycle : saveProgram)(actor, {
        ...raw,
        organizationId,
        ...(programId ? { programId } : {}),
      }),
    });
  } catch (error) {
    return programResponse(programFailure(error, locale));
  }
}
