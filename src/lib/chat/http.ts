import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, open, unlink, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { ChatError, chatStorage, cleanName, csrfFor, type Target } from "@/lib/chat/storage";

const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const maximumFile = 25 * 1024 * 1024;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const fail = (error: unknown) => {
  if (error instanceof ChatError) return json({ ok: false, error: error.message }, error.status);
  console.error("Chat request failed:", error);
  return json({ ok: false, error: "Die Chat-Aktion konnte nicht abgeschlossen werden." }, 500);
};
export type ChatSiteSession = { user: { id: string; name: string; role?: string | null }; session: { token: string } };
export function createChatHandlers(resolveSession: (request: NextRequest) => Promise<ChatSiteSession | null>) {
async function session(request: NextRequest) {
  const siteSession = await resolveSession(request);
  if (!siteSession) return { storage: null, token: "", profile: null };
  const storage = chatStorage();
  return { storage, token: siteSession.session.token, profile: storage.syncProfile(siteSession.user) };
}
async function required(request: NextRequest) {
  const result = await session(request);
  if (!result.profile || !result.storage) throw new ChatError("Bitte melde dich auf der Webseite an, um den Chat zu nutzen.", 401);
  return { ...result, profile: result.profile, storage: result.storage };
}
function validateOrigin(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site" || request.headers.get("origin") !== request.nextUrl.origin) throw new ChatError("Diese Anfrage stammt nicht von der Webseite.", 403);
}
function validateCsrf(token: string, input: string) {
  const expected = csrfFor(token);
  if (!/^[a-f0-9]{64}$/.test(input) || !timingSafeEqual(Buffer.from(input), Buffer.from(expected))) throw new ChatError("Bitte lade den Chat erneut und versuche es noch einmal.", 403);
}
function target(data: Record<string, unknown>): Target {
  return { channelId: typeof data.channelId === "string" ? data.channelId : undefined, memberId: typeof data.memberId === "string" ? data.memberId : undefined };
}
const text = (data: Record<string, unknown>, key: string) => typeof data[key] === "string" ? data[key] as string : "";
async function limitedBody(request: NextRequest, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new ChatError("Die Anfrage ist zu groß.", 413);
  if (!request.body) throw new ChatError("Die Anfrage enthält keine Daten.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > limit) { await reader.cancel(); throw new ChatError("Die Anfrage ist zu groß.", 413); }
    chunks.push(next.value);
  }
  return Buffer.concat(chunks, size);
}
function iceServers() {
  if (!process.env.CHAT_ICE_SERVERS) return [];
  try { const value = JSON.parse(process.env.CHAT_ICE_SERVERS); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("action") || "state";
    const params = Object.fromEntries(request.nextUrl.searchParams);
    if (action === "session") {
      const { profile, token } = await session(request);
      return json({ ok: true, profile, csrf: profile ? csrfFor(token) : null, iceServers: profile ? iceServers() : [], uploadMaxBytes: maximumFile });
    }
    const { profile, storage } = await required(request);
    if (action === "state") return json({ ok: true, ...storage.snapshot(profile.id) });
    if (action === "messages") {
      const before = Number(params.before || 0);
      if (!Number.isSafeInteger(before) || before < 0) throw new ChatError("Ungültiger Nachrichten-Cursor.");
      return json({ ok: true, ...storage.messages(profile.id, target(params), before) });
    }
    if (action === "attachment") {
      if (!/^[a-f0-9-]{36}$/.test(params.id || "")) throw new ChatError("Ungültiger Anhang.");
      const file = storage.attachment(profile.id, params.id);
      const handle = await open(path.join(storage.directory, "attachments", params.id), "r");
      const inline = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]).has(String(file.mime));
      const ascii = String(file.name).replace(/[^\x20-\x7e]|["\\]/g, "_");
      return new Response(Readable.toWeb(handle.createReadStream()) as ReadableStream, { headers: { ...headers, "Content-Type": inline ? String(file.mime) : "application/octet-stream", "Content-Length": String(file.size), "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(String(file.name)).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`, "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "same-origin" } });
    }
    if (action === "events") {
      const encoder = new TextEncoder();
      let lastRevision = -1; let heartbeat = 0;
      let interval: ReturnType<typeof setInterval> | undefined;
      let closed = false;
      let cleanup = () => {};
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          cleanup = () => { if (closed) return; closed = true; if (interval) clearInterval(interval); request.signal.removeEventListener("abort", cleanup); try { controller.close(); } catch {} };
          const tick = () => {
            if (request.signal.aborted) { cleanup(); return; }
            try {
              const revision = storage.revision();
              if (revision !== lastRevision) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ revision })}\n\n`)); lastRevision = revision; }
              if (++heartbeat % 15 === 0) { storage.touch(profile.id); controller.enqueue(encoder.encode(": heartbeat\n\n")); }
            } catch { cleanup(); }
          };
          tick(); interval = setInterval(tick, 1000); request.signal.addEventListener("abort", cleanup, { once: true });
        },
        cancel() { cleanup(); },
      });
      return new Response(stream, { headers: { ...headers, "Content-Type": "text/event-stream", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
    }
    throw new ChatError("Unbekannte Chat-Anfrage.", 404);
  } catch (error) { return fail(error); }
}

async function POST(request: NextRequest) {
  try {
    validateOrigin(request);
    const action = request.nextUrl.searchParams.get("action");
    if (action === "upload") {
      const { profile, token, storage } = await required(request);
      validateCsrf(token, request.headers.get("x-chat-csrf") || "");
      storage.rateLimit(`upload:${profile.id}`, 12);
      if (!/^multipart\/form-data\b/i.test(request.headers.get("content-type") || "")) throw new ChatError("Ungültiges Uploadformat.");
      const data = await limitedBody(request, maximumFile + 65_536);
      let form: FormData;
      try { form = await new Response(data, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData(); }
      catch { throw new ChatError("Die Upload-Daten sind ungültig."); }
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0 || file.size > maximumFile) throw new ChatError("Wähle eine Datei bis 25 MB.", 413);
      const destination = target({ channelId: form.get("channelId"), memberId: form.get("memberId") });
      storage.targetFor(profile.id, destination);
      const name = cleanName(file.name, "Dateiname", 180);
      const id = randomUUID();
      const bytes = Buffer.from(await file.arrayBuffer());
      let mime = "application/octet-stream";
      if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = "image/png";
      else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = "image/jpeg";
      else if (/^GIF8[79]a$/.test(bytes.subarray(0,6).toString("ascii"))) mime = "image/gif";
      else if (bytes.subarray(0,4).toString("ascii") === "RIFF" && bytes.subarray(8,12).toString("ascii") === "WEBP") mime = "image/webp";
      const directory = path.join(storage.directory, "attachments");
      await mkdir(directory, { recursive: true });
      const filename = path.join(directory, id);
      await writeFile(filename, bytes, { flag: "wx" });
      try { storage.addAttachment(profile.id, destination, id, name, mime, bytes.length); }
      catch (error) { await unlink(filename).catch(() => {}); throw error; }
      return json({ ok: true, attachment: { id, name, mime, size: bytes.length } });
    }
    if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) throw new ChatError("Ungültiges Anfrageformat.");
    let data: Record<string, unknown>;
    try { data = JSON.parse((await limitedBody(request, 65_536)).toString("utf8")); }
    catch (error) { if (error instanceof ChatError) throw error; throw new ChatError("Die Anfrage ist ungültig."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new ChatError("Die Anfrage ist ungültig.");
    const { profile, token, storage } = await required(request);
    validateCsrf(token, request.headers.get("x-chat-csrf") || "");
    storage.rateLimit(`${action === "signal" || action === "call" ? "call" : "write"}:${profile.id}`, action === "signal" || action === "call" ? 500 : 45);
    let result: unknown;
    switch (action) {
      case "send": result = storage.send(profile.id, target(data), data.content, text(data,"attachmentId")); break;
      case "edit-message": result = storage.editMessage(profile.id, text(data,"id"), data.content); break;
      case "delete-message": result = storage.editMessage(profile.id, text(data,"id"), "", true); break;
      case "create-server": result = storage.createServer(profile.id, data.name); break;
      case "join-server": result = storage.joinServer(profile.id, data.invite); break;
      case "server": result = storage.updateServer(profile.id, text(data,"id"), text(data,"operation"), data.name); break;
      case "member": result = storage.changeMember(profile.id, text(data,"serverId"), text(data,"memberId"), text(data,"role")); break;
      case "create-channel": result = storage.createChannel(profile.id, text(data,"serverId"), data.name, text(data,"type")); break;
      case "channel": result = storage.updateChannel(profile.id, text(data,"id"), data.name, data.remove === true); break;
      case "call": result = storage.call(profile.id, target(data), text(data,"clientId"), text(data,"operation"), Number(data.after) || 0); break;
      case "signal": result = storage.signal(profile.id, target(data), text(data,"clientId"), text(data,"recipientId"), text(data,"recipientClient"), data.payload); break;
      default: throw new ChatError("Unbekannte Chat-Aktion.", 404);
    }
    return json({ ok: true, result });
  } catch (error) { return fail(error); }
}
return { GET, POST };
}
