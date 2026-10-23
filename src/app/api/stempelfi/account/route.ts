import { CustomerAccountError, accountRequest, customerRegistrationEnabled, handleCustomerAccount } from "@/lib/loyalty/customer-account";
import { customerMailConfigured, sendCustomerMail } from "@/lib/loyalty/customer-mail";

const headers = { "Cache-Control": "private, no-store", Vary: "Origin" };
export async function POST(request: Request) {
  if (!customerRegistrationEnabled()) return Response.json({ error: "DISABLED" }, { status: 403, headers });
  const expected = process.env.BETTER_AUTH_URL;
  if (!expected || request.headers.get("origin") !== new URL(expected).origin) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 8192) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
  try {
    // Streamed requests are bounded too; content-length is not trusted.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 8192) { await reader.cancel(); return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers }); }
      chunks.push(chunk.value);
    }
    const parsed = accountRequest.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
    if (["register", "resend", "requestReset"].includes(parsed.data.action) && !customerMailConfigured()) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
    // Only the platform's trusted proxy header is used. Local/unknown origins share a bucket.
    const ip = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : undefined;
    return Response.json(await handleCustomerAccount(parsed.data, sendCustomerMail, ip || "shared-origin"), { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers });
    if (error instanceof CustomerAccountError) return Response.json({ error: error.code }, { status: error.code === "LIMIT_REACHED" ? 429 : error.code === "INVALID_TOKEN" || error.code === "INVALID_INPUT" ? 400 : 403, headers });
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
