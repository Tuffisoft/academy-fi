import { z } from "zod";
import { resourceId } from "./program-input";

const failureCode = z.enum(["LOGO_TOO_LARGE", "LOGO_UNSUPPORTED", "LOGO_INVALID", "INVALID_INPUT", "FORBIDDEN", "UNAUTHENTICATED", "NOT_FOUND", "IDEMPOTENCY_CONFLICT", "UNAVAILABLE"]);
const replySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.object({ id: resourceId }) }),
  z.object({ ok: z.literal(false), error: z.object({ code: failureCode }) }),
]);
export type UploadFailure = z.infer<typeof failureCode> | "NETWORK" | "CANCELLED" | "TIMEOUT";
export class LogoUploadError extends Error {
  constructor(public readonly code: UploadFailure, public readonly uncertain: boolean) { super(code); }
}
export type LogoProgress = { loaded: number; total: number; percent: number; bytesPerSecond: number | null; secondsRemaining: number | null; processing: boolean };
export function logoProgress(loaded: number, total: number, elapsedMs: number): LogoProgress {
  const bounded = Math.max(0, Math.min(loaded, total));
  const speed = elapsedMs >= 250 && bounded > 0 ? bounded / (elapsedMs / 1000) : null;
  return { loaded: bounded, total, percent: total > 0 ? Math.floor(bounded / total * 100) : 0,
    bytesPerSecond: speed, secondsRemaining: speed && bounded < total ? Math.ceil((total - bounded) / speed) : null,
    processing: total > 0 && bounded >= total };
}

/** Progress measures browser-to-server transfer only; success requires a validated server reply. */
export function sendLogo({ file, operationId, organizationId, locale, signal, onProgress, createRequest = () => new XMLHttpRequest() }: {
  file: File; operationId: string; organizationId: string; locale: string;
  signal: AbortSignal; onProgress: (progress: LogoProgress) => void; createRequest?: () => XMLHttpRequest;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = createRequest(), started = performance.now();
    let settled = false;
    const abort = () => xhr.abort();
    const finish = (id: string | null, error?: LogoUploadError) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      if (id) resolve(id); else reject(error ?? new LogoUploadError("UNAVAILABLE", true));
    };
    xhr.open("POST", `/api/loyalty/organizations/${encodeURIComponent(organizationId)}/assets`);
    xhr.setRequestHeader("Accept-Language", locale);
    xhr.timeout = 120_000;
    xhr.upload.onprogress = event => {
      if (!settled && event.lengthComputable && event.total > 0) onProgress(logoProgress(file.size * event.loaded / event.total, file.size, performance.now() - started));
    };
    xhr.upload.onload = () => { if (!settled) onProgress(logoProgress(file.size, file.size, performance.now() - started)); };
    xhr.onload = () => {
      let raw: unknown;
      try { raw = JSON.parse(xhr.responseText); }
      catch { finish(null, new LogoUploadError("UNAVAILABLE", true)); return; }
      const reply = replySchema.safeParse(raw);
      if (!reply.success) { finish(null, new LogoUploadError("UNAVAILABLE", true)); return; }
      if (reply.data.ok && xhr.status >= 200 && xhr.status < 300) finish(reply.data.data.id);
      else if (!reply.data.ok) finish(null, new LogoUploadError(reply.data.error.code, xhr.status >= 500 || reply.data.error.code === "UNAVAILABLE"));
      else finish(null, new LogoUploadError("UNAVAILABLE", true));
    };
    xhr.onerror = () => finish(null, new LogoUploadError("NETWORK", true));
    xhr.ontimeout = () => finish(null, new LogoUploadError("TIMEOUT", true));
    xhr.onabort = () => finish(null, new LogoUploadError("CANCELLED", true));
    if (signal.aborted) { finish(null, new LogoUploadError("CANCELLED", false)); return; }
    signal.addEventListener("abort", abort, { once: true });
    const body = new FormData(); body.set("file", file); body.set("operationId", operationId);
    xhr.send(body);
  });
}
