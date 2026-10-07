import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { onlineStorage } from "@/lib/exchange/database";
import { ExchangeStorageError, uploadBody, writeChunk, cancelFile } from "@/lib/exchange/files";
import { beginCloudUpload, finishCloudUpload } from "@/lib/cloud/postgres";
import { NextRequest, NextResponse } from "next/server";
import {
  CloudStorageError,
  contentDisposition,
  createCloudDirectory,
  createCloudZip,
  deleteCloudPath,
  getCloudLimits,
  listCloudDirectory,
  openCloudFile,
  uploadCloudFiles,
} from "@/lib/cloud/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CSRF_COOKIE = "academy_cloud_csrf";
const noCache = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noCache });
}

function fail(error: unknown) {
  if (error instanceof CloudStorageError || error instanceof ExchangeStorageError) {
    return json({ ok: false, error: error.message }, error.status);
  }
  console.error("Cloud request failed:", error);
  return json({ ok: false, error: "Die Dateiaktion konnte nicht abgeschlossen werden." }, 500);
}

function validCsrf(request: NextRequest, token: string) {
  const cookie = request.cookies.get(CSRF_COOKIE)?.value;
  return Boolean(
    cookie &&
      /^[a-f0-9]{64}$/.test(cookie) &&
      /^[a-f0-9]{64}$/.test(token) &&
      timingSafeEqual(Buffer.from(cookie), Buffer.from(token)),
  );
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

async function limitedFormData(request: NextRequest, maximum: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^(multipart\/form-data|application\/x-www-form-urlencoded)(;|$)/i.test(contentType)) {
    throw new CloudStorageError("Die Anfrage enthält keine gültigen Formulardaten.", 400);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maximum) {
    throw new CloudStorageError("Der Upload ist größer als das erlaubte Limit.", 413);
  }
  if (!request.body) {
    throw new CloudStorageError("Die Formulardaten fehlen.", 400);
  }
  const reader = request.body.getReader();
  let received = 0;
  let exceeded = false;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        received += value.byteLength;
        if (received > maximum) {
          exceeded = true;
          await reader.cancel();
          controller.error(new Error("Upload limit exceeded"));
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  try {
    return await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new CloudStorageError(
      exceeded ? "Der Upload ist größer als das erlaubte Limit." : "Die Formulardaten konnten nicht gelesen werden.",
      exceeded ? 413 : 400,
    );
  }
}

function field(form: FormData, name: string) {
  const value = form.get(name);
  if (value === null) return "";
  if (typeof value !== "string") throw new CloudStorageError("Ungültige Formulardaten.", 400);
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get("api");
    if (action === "status") {
      const existing = request.cookies.get(CSRF_COOKIE)?.value;
      const csrf = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString("hex");
      const limits = getCloudLimits();
      const response = json({
        ok: true,
        loggedIn: true,
        onlineStorage: onlineStorage(),
        csrf,
        uploadMaxBytes: limits.uploadMaxBytes,
        uploadMaxFile: `${Math.round(limits.uploadMaxBytes / 1024 / 1024)} MB`,
        uploadMaxRequest: `${Math.round(limits.uploadMaxBytes / 1024 / 1024)} MB`,
      });
      response.cookies.set(CSRF_COOKIE, csrf, {
        httpOnly: true,
        sameSite: "strict",
        secure: request.nextUrl.protocol === "https:",
        path: "/api/cloud",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }
    if (action === "list") {
      return json({ ok: true, ...(await listCloudDirectory(request.nextUrl.searchParams.get("path") ?? "")) });
    }
    if (action === "download" || action === "preview") {
      const file = await openCloudFile(request.nextUrl.searchParams.get("target") ?? "");
      const preview = action === "preview";
      const safeInline = /^(image\/(png|jpeg|gif|webp|avif|bmp)|audio\/(mpeg|ogg|wav)|video\/(mp4|webm)|application\/pdf|text\/plain)$/.test(file.mimeType);
      const textPreview = preview && (
        file.mimeType.startsWith("text/") ||
        file.mimeType === "image/svg+xml" ||
        /\.(html?|xml|svg|json|css|js|ts|tsx|jsx|yaml|yml|ini|toml|sh|ps1)$/i.test(file.name)
      );
      return new Response(file.stream, {
        headers: {
          ...noCache,
          "Content-Type": textPreview ? "text/plain; charset=utf-8" : file.mimeType,
          "Content-Length": String(file.size),
          "Content-Disposition": contentDisposition(file.name, preview && (safeInline || textPreview)),
          "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
          "Cross-Origin-Resource-Policy": "same-origin",
        },
      });
    }
    return json({ ok: false, error: "Diese Dateiaktion wurde nicht gefunden." }, 404);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!sameOrigin(request)) {
      return json({ ok: false, error: "Die Anfrage kommt nicht von dieser Webseite." }, 403);
    }
    const action = request.nextUrl.searchParams.get("api");
    if (onlineStorage() && ["upload-begin","upload-chunk","upload-finish","upload-cancel"].includes(action || "")) {
      const token=request.headers.get("x-csrf-token") || "";
      if(!validCsrf(request,token)) throw new CloudStorageError("Bitte lade den Cloud-Bereich erneut.",403);
      const owner=createHash("sha256").update(token).digest("hex");
      if(action === "upload-chunk") {
        await writeChunk(request.nextUrl.searchParams.get("id") || "","cloud",owner,Number(request.nextUrl.searchParams.get("part")),await uploadBody(request));
        return json({ok:true});
      }
      if(!request.headers.get("content-type")?.startsWith("application/json")) throw new CloudStorageError("Ungültiges Anfrageformat.");
      let data: Record<string,unknown>;
      try { data=JSON.parse((await uploadBody(request,65536)).toString("utf8")); }
      catch(error) { if(error instanceof ExchangeStorageError) throw error; throw new CloudStorageError("Ungültige Upload-Daten."); }
      if(!data || typeof data!=="object" || Array.isArray(data)) throw new CloudStorageError("Ungültige Upload-Daten.");
      if(action === "upload-begin") return json({ok:true,...await beginCloudUpload(String(data.path || ""),String(data.name || ""),Number(data.size),owner)});
      if(action === "upload-finish") return json({ok:true,...await finishCloudUpload(String(data.id || ""),owner)});
      await cancelFile(String(data.id || ""),"cloud",owner);
      return json({ok:true});
    }
    if (!["mkdir", "upload", "delete", "zip"].includes(action ?? "")) {
      return json({ ok: false, error: "Diese Dateiaktion wurde nicht gefunden." }, 404);
    }
    const headerToken = request.headers.get("x-csrf-token") ?? "";
    if (action !== "zip" && !validCsrf(request, headerToken)) {
      return json({ ok: false, error: "Bitte den Cloud-Bereich neu laden und erneut versuchen." }, 403);
    }
    const limits = getCloudLimits();
    const form = await limitedFormData(request, action === "upload" ? limits.uploadMaxBytes + 1024 * 1024 : 128 * 1024);
    if (!validCsrf(request, headerToken || field(form, "csrf"))) {
      return json({ ok: false, error: "Bitte den Cloud-Bereich neu laden und erneut versuchen." }, 403);
    }
    if (action === "mkdir") {
      return json({ ok: true, ...(await createCloudDirectory(field(form, "path"), field(form, "name"))) });
    }
    if (action === "upload") {
      const values = form.getAll("files[]");
      if (!values.length || values.some((value) => typeof value === "string")) {
        throw new CloudStorageError("Bitte mindestens eine Datei auswählen.", 400);
      }
      const files = values as File[];
      if (files.length > limits.maxUploadFiles || files.reduce((total, file) => total + file.size, 0) > limits.uploadMaxBytes) {
        throw new CloudStorageError("Der Upload ist größer als das erlaubte Limit.", 413);
      }
      return json({ ok: true, ...(await uploadCloudFiles(field(form, "path"), files)) });
    }
    if (action === "delete") {
      await deleteCloudPath(field(form, "target"));
      return json({ ok: true });
    }
    const targets = form.getAll("targets[]");
    if (targets.some((target) => typeof target !== "string")) {
      throw new CloudStorageError("Die Dateiauswahl ist ungültig.", 400);
    }
    const zip = await createCloudZip(targets as string[]);
    return new Response(zip.stream, {
      headers: {
        ...noCache,
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition(zip.name),
      },
    });
  } catch (error) {
    return fail(error);
  }
}
