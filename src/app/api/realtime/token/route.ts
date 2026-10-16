import { getCurrentSession } from "@/lib/session";
import { getRealtimeServer, isRealtimeConfigured } from "@/lib/chat/realtime/server";
import { userChannel } from "@/lib/chat/realtime/channel";

export async function POST() {
  const session = await getCurrentSession();
  if (!session)
    return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
  if (!isRealtimeConfigured())
    return Response.json(
      { error: "Realtime ist noch nicht eingerichtet." },
      { status: 503 },
    );
  try {
    const token = await getRealtimeServer().auth.createTokenRequest({
      clientId: session.user.id,
      ttl: 15 * 60 * 1000,
      capability: JSON.stringify({
        [userChannel(session.user.id)]: ["subscribe"],
      }),
    });
    return Response.json(token, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "Realtime ist momentan nicht erreichbar." },
      { status: 503 },
    );
  }
}
