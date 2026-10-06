import { getCurrentSession } from "@/lib/session";
import { createChatHandlers } from "@/lib/chat/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every request uses the existing website session, including attachments and calls.
export const { GET, POST } = createChatHandlers(() => getCurrentSession());
