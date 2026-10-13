import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/session";

const handlers = toNextJsHandler(auth);

function unavailable() {
  return Response.json({ message: "Anmeldung derzeit nicht verfügbar." }, { status: 503 });
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  return handlers.POST(request);
}
