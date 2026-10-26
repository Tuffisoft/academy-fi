import "server-only";
import { getCurrentSession } from "@/lib/session";
import { membershipsEnabled } from "./membership-feature";
import { membershipFailure } from "./membership-workflow";
import { submitMembership, membershipSubmission } from "./membership-submit";
import { membershipRequest } from "./memberships";
import { z } from "zod";
import type { MembershipReply } from "./membership-reply";

const responseHeaders = { "Cache-Control": "private, no-store", Vary: "Origin", "Referrer-Policy": "no-referrer" };
function response(reply: MembershipReply) {
  const status = reply.ok ? 200 : ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, DISABLED: 403, INVALID_INPUT: 422, INVALID_INVITATION: 400, LIMIT_REACHED: 409, CONFLICT: 409, RATE_LIMITED: 429, UNAVAILABLE: 503 } as const)[reply.error.code];
  return Response.json(reply, { status, headers: responseHeaders });
}
const invitationInput = z.object({ locale: z.enum(["de", "en"]), email: z.string(), role: z.enum(["ADMIN", "STAFF"]), operationId: z.string() }).strict();
export async function membershipPost(request: Request, organizationId: string, inviteOnly = false) {
  let locale: "de" | "en" = request.headers.get("accept-language")?.startsWith("de") ? "de" : "en";
  if (!membershipsEnabled()) return response(membershipFailure("DISABLED", locale));
  try {
    const expected = process.env.BETTER_AUTH_URL;
    if (!expected || new URL(expected).origin !== request.headers.get("origin")) return response(membershipFailure("FORBIDDEN", locale));
    const session = await getCurrentSession();
    if (!session) return response(membershipFailure("UNAUTHENTICATED", locale));
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || Number(request.headers.get("content-length")) > 8192) return response(membershipFailure("INVALID_INPUT", locale));
    const reader = request.body?.getReader();
    if (!reader) return response(membershipFailure("INVALID_INPUT", locale));
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.length;
      if (size > 8192) { await reader.cancel(); return response(membershipFailure("INVALID_INPUT", locale)); }
      chunks.push(chunk.value);
    }
    const raw: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (raw && typeof raw === "object" && "locale" in raw && (raw.locale === "de" || raw.locale === "en")) locale = raw.locale;
    let submission;
    if (inviteOnly) {
      const parsed = invitationInput.safeParse(raw);
      if (!parsed.success) return response(membershipFailure("INVALID_INPUT", locale));
      const { locale: language, ...fields } = parsed.data;
      submission = { locale: language, command: membershipRequest.parse({ ...fields, organizationId, action: "INVITE" }) };
    } else {
      const parsed = membershipSubmission.safeParse(raw);
      if (!parsed.success) return response(membershipFailure("INVALID_INPUT", locale));
      submission = parsed.data;
    }
    locale = submission.locale;
    if (submission.command.organizationId !== organizationId) return response(membershipFailure("FORBIDDEN", locale));
    return response(await submitMembership(session.user.id, submission));
  } catch (error) { return response(membershipFailure(error instanceof SyntaxError || error instanceof z.ZodError ? "INVALID_INPUT" : "UNAVAILABLE", locale)); }
}
