import { NextRequest, NextResponse } from "next/server";
import { getAcademyApiAccess } from "@/lib/session";
import { ChatError, getConversationsForUser, getMessagePage } from "@/lib/chat/services/chat";
import { MessageEncryptionError } from "@/lib/chat/server-encryption";
import { getGroupInvitations } from "@/lib/chat/services/groups";
import { getLocale } from "next-intl/server";

// Reads use GET so Next's client-side server-action queue cannot hold up sending.
export async function GET(request: NextRequest) {
  const access = await getAcademyApiAccess();
  const headers = { "Cache-Control": "private, no-store" };
  if (access.response) {
    const de = (await getLocale()) === "de";
    const unauthorized = access.response.status === 401;
    return NextResponse.json({ ok: false, error: unauthorized
      ? (de ? "Melde dich erneut an." : "Please sign in again.")
      : (de ? "Kein Zugriff auf die Academy." : "Academy access denied.") },
    { status: access.response.status, headers: { ...headers, Vary: "Cookie" } });
  }
  try {
    const params = request.nextUrl.searchParams;
    if (params.get("view") === "group-invitations")
      return NextResponse.json({ ok: true, data: await getGroupInvitations(access.user.id) }, { headers });
    const conversationId = params.get("conversationId");
    if (!conversationId)
      return NextResponse.json(
        { ok: true, data: await getConversationsForUser(access.user.id) },
        { headers },
      );
    const position = (name: string) =>
      params.has(name) ? Number(params.get(name)) : undefined;
    const page = await getMessagePage(access.user.id, conversationId, {
      from: position("from"),
      before: position("before"),
    });
    return NextResponse.json({ ok: true, data: page }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof ChatError || error instanceof MessageEncryptionError
            ? error.message
            : "Der Chat konnte nicht geladen werden.",
      },
      { status: error instanceof ChatError ? 403 : 500, headers },
    );
  }
}
