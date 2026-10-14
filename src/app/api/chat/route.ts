import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { ChatError, getConversationsForUser, getMessagePage } from "@/lib/chat/services/chat";
import { MessageEncryptionError } from "@/lib/chat/server-encryption";
import { getGroupInvitations } from "@/lib/chat/services/groups";

// Reads use GET so Next's client-side server-action queue cannot hold up sending.
export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  const headers = { "Cache-Control": "private, no-store" };
  if (!session)
    return NextResponse.json(
      { ok: false, error: "Melde dich erneut an." },
      { status: 401, headers },
    );
  try {
    const params = request.nextUrl.searchParams;
    if (params.get("view") === "group-invitations")
      return NextResponse.json({ ok: true, data: await getGroupInvitations(session.user.id) }, { headers });
    const conversationId = params.get("conversationId");
    if (!conversationId)
      return NextResponse.json(
        { ok: true, data: await getConversationsForUser(session.user.id) },
        { headers },
      );
    const position = (name: string) =>
      params.has(name) ? Number(params.get(name)) : undefined;
    const page = await getMessagePage(session.user.id, conversationId, {
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
