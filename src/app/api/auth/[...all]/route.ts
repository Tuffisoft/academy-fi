import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/session";
import { consumeAccountLimit, customerRegistrationEnabled, CustomerAccountError } from "@/lib/loyalty/customer-account";

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
  if (customerRegistrationEnabled() && ["sign-in/email", "request-password-reset", "reset-password"].some(path => new URL(request.url).pathname.endsWith("/" + path))) {
    try {
      const data: unknown = await request.clone().json();
      const address = data && typeof data === "object" && "email" in data && typeof data.email === "string" ? data.email.trim().toLowerCase() : "no-address";
      await consumeAccountLimit("auth-origin:" + new URL(request.url).pathname, "shared-origin", 60);
      await consumeAccountLimit("auth-address:" + new URL(request.url).pathname, address, 10);
    } catch (error) {
      if (error instanceof CustomerAccountError) return Response.json({ message: "Too many requests. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
      return unavailable();
    }
  }
  return handlers.POST(request);
}
