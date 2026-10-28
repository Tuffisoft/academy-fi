import assert from "node:assert/strict";
import test from "node:test";
import { logoFileError, maxLogoBytes } from "../src/lib/loyalty/logo-input";
import { logoProgress, sendLogo } from "../src/lib/loyalty/logo-upload";

test("logo metadata distinguishes size, unsupported format and empty files before transfer", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.equal(logoFileError({ size: maxLogoBytes, type }), null);
  assert.equal(logoFileError({ size: maxLogoBytes + 1, type: "image/png" }), "LOGO_TOO_LARGE");
  assert.equal(logoFileError({ size: 10, type: "image/svg+xml" }), "LOGO_UNSUPPORTED");
  assert.equal(logoFileError({ size: 0, type: "image/png" }), "LOGO_INVALID");
});
test("transfer metrics clamp bytes, defer estimates and distinguish processing from confirmation", () => {
  assert.equal(logoProgress(0, 1000, 0).bytesPerSecond, null);
  const halfway = logoProgress(500, 1000, 1000);
  assert.deepEqual([halfway.percent, halfway.bytesPerSecond, halfway.secondsRemaining, halfway.processing], [50, 500, 1, false]);
  const done = logoProgress(1200, 1000, 2000);
  assert.deepEqual([done.loaded, done.percent, done.processing], [1000, 100, true]);
});

// Deliberately partial browser adapter: only the XMLHttpRequest surface used by
// sendLogo is simulated. No real network/credentials; production types stay strict.
class RequestStub {
  timeout = 0; status = 200; responseText = ""; aborted = false; body: FormData | null = null;
  onload: (() => void) | null = null; onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null; onabort: (() => void) | null = null;
  upload = { onprogress: null as ((value: { lengthComputable: boolean; loaded: number; total: number }) => void) | null, onload: null as (() => void) | null };
  open() {} setRequestHeader() {}
  send(body: FormData) { this.body = body; }
  abort() { this.aborted = true; this.onabort?.(); }
  factory = () => this as unknown as XMLHttpRequest;
}
const file = new File(["1234567890"], "logo.png", { type: "image/png" });
test("full transfer never confirms an asset before valid server success; malformed replies remain uncertain", async () => {
  const request = new RequestStub(), controller = new AbortController(); let completed = false;
  const values: number[] = [];
  const result = sendLogo({ file, organizationId: "org", operationId: "same-operation", locale: "de", signal: controller.signal, onProgress: p => values.push(p.percent), createRequest: request.factory });
  void result.then(() => { completed = true; });
  request.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
  request.upload.onload?.();
  await Promise.resolve(); assert.equal(completed, false); assert.deepEqual(values, [50, 100]);
  request.responseText = JSON.stringify({ ok: true, data: { id: "confirmed-asset" } }); request.onload?.();
  assert.equal(await result, "confirmed-asset");
  const bad = new RequestStub();
  const failed = sendLogo({ file, organizationId: "org", operationId: "same-operation", locale: "de", signal: controller.signal, onProgress: () => {}, createRequest: bad.factory });
  bad.responseText = "<html>gateway error</html>"; bad.onload?.();
  await assert.rejects(failed, { code: "UNAVAILABLE", uncertain: true });
});
test("cancellation, network loss and timeout preserve uncertainty; retry transmits the identical operation", async () => {
  for (const event of ["onabort", "onerror", "ontimeout"] as const) {
    const request = new RequestStub(), controller = new AbortController();
    const result = sendLogo({ file, organizationId: "org", operationId: "same-operation", locale: "en", signal: controller.signal, onProgress: () => {}, createRequest: request.factory });
    if (event === "onabort") controller.abort(); else request[event]?.();
    await assert.rejects(result, { code: event === "onabort" ? "CANCELLED" : event === "onerror" ? "NETWORK" : "TIMEOUT", uncertain: true });
    assert.equal(request.body?.get("operationId"), "same-operation");
  }
  const rejected = new RequestStub();
  const result = sendLogo({ file, organizationId: "org", operationId: "same-operation", locale: "de", signal: new AbortController().signal, onProgress: () => {}, createRequest: rejected.factory });
  rejected.status = 413; rejected.responseText = JSON.stringify({ ok: false, error: { code: "LOGO_TOO_LARGE" } }); rejected.onload?.();
  await assert.rejects(result, { code: "LOGO_TOO_LARGE", uncertain: false });
});
