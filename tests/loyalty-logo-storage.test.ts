import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { logoObjectKey, r2Configuration } from "../src/lib/loyalty/logo-storage-config";
import { deleteLogoObject, getLogoObject, logoObjectUrl, putLogoObject } from "../src/lib/loyalty/logo-storage";

const endpoint = `https://${"a".repeat(32)}.r2.cloudflarestorage.com`;
const config = { endpoint, bucket: "synthetic-bucket", accessKeyId: "synthetic-access-key", secretAccessKey: "synthetic-secret-key" };
test("R2 configuration allows regional account endpoints and normalizes dashboard bucket paths", () => {
  assert.equal(r2Configuration.parse({ ...config, endpoint: `${endpoint}/${config.bucket}` }).endpoint, endpoint);
  assert.ok(r2Configuration.safeParse({ ...config, endpoint: endpoint.replace(".r2.", ".eu.r2.") }).success);
  for (const value of ["not-a-url", "http://127.0.0.1", endpoint.replace("https:", "http:"), `${endpoint}/other-bucket`, `${endpoint}?token=synthetic`, `https://user:pass@${new URL(endpoint).host}`]) {
    assert.equal(r2Configuration.safeParse({ ...config, endpoint: value }).success, false);
  }
  assert.equal(r2Configuration.safeParse({ ...config, secretAccessKey: "" }).success, false);
  assert.throws(() => logoObjectKey("../foreign", randomUUID(), "0".repeat(64)));
  assert.throws(() => logoObjectKey("org", randomUUID(), "invalid"));
});

test("R2 signs scoped server requests, sets private caching, forbids redirects and hides provider errors", async t => {
  const values = { STEMPELFI_R2_ENDPOINT: `${endpoint}/${config.bucket}`, STEMPELFI_R2_BUCKET_NAME: config.bucket,
    STEMPELFI_R2_ACCESS_KEY_ID: config.accessKeyId, STEMPELFI_R2_SECRET_ACCESS_KEY: config.secretAccessKey };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => { for (const key of Object.keys(values)) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
  const requests: Request[] = []; let mode = "ok";
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init); requests.push(request);
    assert.equal(request.redirect, "error"); assert.equal(request.cache, "no-store");
    assert.equal(new URL(request.url).search, "");
    assert.ok(request.headers.get("authorization")?.includes("/auto/s3/aws4_request"));
    assert.equal(request.headers.get("x-amz-acl"), null);
    if (mode === "network-error") throw new Error("synthetic-provider-secret");
    if (mode === "denied") return new Response("synthetic-provider-secret", { status: 403 });
    if (request.method === "PUT") {
      assert.equal(request.headers.get("content-type"), "image/png");
      assert.equal(request.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(new Uint8Array(await request.arrayBuffer()), bytes);
      return new Response(null, { status: 200 });
    }
    return request.method === "DELETE" ? new Response(null, { status: 204 }) : new Response(bytes, { headers: { "content-type": "image/png" } });
  });
  const operation = randomUUID();
  const key = await putLogoObject(bytes, "org", operation, "0".repeat(64));
  assert.equal(key, logoObjectKey("org", operation, "0".repeat(64)));
  assert.equal(logoObjectUrl(key).pathname, `/${config.bucket}/${key}`);
  assert.deepEqual(new Uint8Array(await (await getLogoObject(key)).arrayBuffer()), bytes);
  await deleteLogoObject(key);
  assert.deepEqual(requests.map(request => request.method), ["PUT", "GET", "DELETE"]);
  for (mode of ["denied", "network-error"]) await assert.rejects(getLogoObject(key), { message: "LOGO_STORAGE_UNAVAILABLE" });
  const before = requests.length;
  await assert.rejects(getLogoObject("https://foreign.invalid/object"), { message: "LOGO_STORAGE_UNAVAILABLE" });
  assert.equal(requests.length, before);
});
