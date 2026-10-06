import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";

// Run against an already started app with an isolated, empty CLOUD_STORAGE_DIR:
// CLOUD_TEST_URL=http://localhost:3001 node --test tests/cloud-api.test.mjs
const baseUrl = process.env.CLOUD_TEST_URL;

function readZipFiles(buffer) {
  assert.equal(buffer.readUInt32LE(0), 0x04034b50, "ZIP local header");
  const endOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(endOffset >= 0, "ZIP end-of-central-directory record");
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  let offset = buffer.readUInt32LE(endOffset + 16);
  const files = new Map();

  for (let index = 0; index < entryCount; index++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, "ZIP central header");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    assert.ok(!name.startsWith("/") && !name.split("/").includes(".."), "ZIP path stays relative");
    assert.equal(buffer.readUInt32LE(localOffset), 0x04034b50);
    const dataOffset = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    assert.ok(method === 0 || method === 8, "ZIP uses standard storage/deflate");
    const content = method === 8 ? inflateRawSync(compressed) : compressed;
    assert.equal(content.length, size);
    files.set(name, content);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function findTreeNode(node, path) {
  if (node.path === path) return node;
  for (const child of node.children ?? []) {
    const found = findTreeNode(child, path);
    if (found) return found;
  }
  return undefined;
}

test("shared cloud API works without website login", { skip: !baseUrl, timeout: 120_000 }, async (t) => {
  const origin = new URL(baseUrl).origin;
  const testDirectory = `cloud-test-${randomUUID()}`;
  const nestedDirectory = `${testDirectory}/Unterordner`;
  const payload = Buffer.from("Cloud-Integrationstest: Grüß dich!\n", "utf8");
  const duplicatePayload = Buffer.from("Zweite Datei bleibt separat erhalten.\n", "utf8");
  const nestedPayload = Buffer.from([0, 1, 2, 3, 127, 128, 254, 255]);
  let csrf = "";
  let cookie = "";
  let created = false;

  function request(action, { method = "GET", params = {}, form, headers = {}, authenticated = true } = {}) {
    const url = new URL("/api/cloud", origin);
    url.searchParams.set("api", action);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return fetch(url, {
      method,
      body: form,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: {
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
        ...(method !== "GET" ? { Origin: origin } : {}),
        ...headers,
      },
    });
  }

  function formData(fields) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
    }
    return form;
  }

  async function json(response) {
    const body = await response.json();
    assert.equal(response.status, 200, body.error ?? `HTTP ${response.status}`);
    assert.equal(body.ok, true, body.error);
    return body;
  }

  async function mutate(action, fields) {
    return json(await request(action, {
      method: "POST",
      form: formData(fields),
      headers: { "X-CSRF-Token": csrf },
    }));
  }

  async function rejected(response, expectedStatus) {
    assert.equal(response.status, expectedStatus);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(typeof body.error, "string");
    assert.ok(body.error.length > 0);
  }

  t.after(async () => {
    if (created) {
      // Cleanup can target only this test's fresh folder, never the cloud root.
      assert.match(testDirectory, /^cloud-test-[0-9a-f-]{36}$/);
      await mutate("delete", { target: testDirectory });
    }
  });

  await t.test("anonymous status creates an HttpOnly CSRF cookie", async () => {
    const response = await request("status", { authenticated: false });
    const cookies = response.headers.getSetCookie();
    assert.ok(cookies.some((value) => /;\s*HttpOnly(?:;|$)/i.test(value)), "CSRF cookie is HttpOnly");
    assert.ok(cookies.some((value) => /;\s*SameSite=(?:Strict|Lax)(?:;|$)/i.test(value)), "CSRF cookie is SameSite");
    cookie = cookies.map((value) => value.split(";", 1)[0]).join("; ");
    const data = await json(response);
    assert.equal(typeof data.csrf, "string");
    assert.ok(data.csrf.length >= 32);
    csrf = data.csrf;
  });

  await t.test("list is available anonymously and returns a directory tree", async () => {
    const data = await json(await request("list", { params: { path: "" }, authenticated: false }));
    assert.ok(Array.isArray(data.entries));
    assert.equal(data.path, "");
    assert.equal(data.tree.path, "");
    assert.ok(Array.isArray(data.tree.children));
  });

  await t.test("mkdir creates the test folder and nested folder", async () => {
    await mutate("mkdir", { path: "", name: testDirectory });
    created = true;
    await mutate("mkdir", { path: testDirectory, name: "Unterordner" });
    const data = await json(await request("list", { params: { path: testDirectory } }));
    assert.equal(data.path, testDirectory);
    assert.ok(data.entries.some((entry) => entry.name === "Unterordner" && entry.kind === "directory"));
    assert.ok(findTreeNode(data.tree, nestedDirectory));
  });

  await t.test("upload preserves duplicate names instead of overwriting", async () => {
    for (const [path, name, content, type] of [
      [testDirectory, "test.txt", payload, "text/plain"],
      [testDirectory, "test.txt", duplicatePayload, "text/plain"],
      [nestedDirectory, "binary.bin", nestedPayload, "application/octet-stream"],
      [testDirectory, "preview.html", Buffer.from("<script>window.cloudPreviewUnsafe=true</script><p>Preview</p>"), "text/html"],
    ]) {
      const form = formData({ path });
      form.append("files[]", new Blob([content], { type }), name);
      const data = await json(await request("upload", { method: "POST", form, headers: { "X-CSRF-Token": csrf } }));
      assert.equal(data.uploaded, 1);
    }
    const data = await json(await request("list", { params: { path: testDirectory } }));
    assert.ok(data.entries.some((entry) => entry.name === "test.txt" && entry.size === payload.length));
    assert.ok(data.entries.some((entry) => entry.name === "test (1).txt" && entry.size === duplicatePayload.length));
    assert.ok(data.entries.every((entry) => typeof entry.modified === "number"));
    const later = await json(await request("list", { params: { path: testDirectory } }));
    assert.deepEqual(later.entries, data.entries, "saved files persist across requests");
  });

  await t.test("download returns exact original bytes and an attachment", async () => {
    for (const [target, content] of [
      [`${testDirectory}/test.txt`, payload],
      [`${testDirectory}/test (1).txt`, duplicatePayload],
      [`${nestedDirectory}/binary.bin`, nestedPayload],
    ]) {
      const response = await request("download", { params: { target }, authenticated: false });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-disposition") ?? "", /^attachment/i);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), content);
    }
  });

  await t.test("preview applies nosniff and an isolated sandbox", async () => {
    const response = await request("preview", { params: { target: `${testDirectory}/preview.html` }, authenticated: false });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const contentType = response.headers.get("content-type") ?? "";
    assert.ok(!/^(text\/html|image\/svg\+xml)(?:;|$)/i.test(contentType), "HTML preview cannot execute as an active document");
    if (!/^text\/plain(?:;|$)/i.test(contentType)) {
      assert.match(response.headers.get("content-disposition") ?? "", /^attachment/i, "unknown document types download safely");
    }
    assert.match(response.headers.get("content-security-policy") ?? "", /(?:^|;)\s*sandbox(?:;|$)/i);
    assert.match(await response.text(), /<p>Preview<\/p>/);
  });

  await t.test("ZIP accepts a form CSRF token and contains selected files and nested content", async () => {
    const response = await request("zip", {
      method: "POST",
      form: formData({ csrf, "targets[]": [`${testDirectory}/test.txt`, `${testDirectory}/test (1).txt`, nestedDirectory] }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/zip/i);
    assert.match(response.headers.get("content-disposition") ?? "", /^attachment/i);
    const files = readZipFiles(Buffer.from(await response.arrayBuffer()));
    assert.deepEqual(files.get("test.txt"), payload);
    assert.deepEqual(files.get("test (1).txt"), duplicatePayload);
    assert.deepEqual(files.get("Unterordner/binary.bin"), nestedPayload);
    assert.ok(![...files.keys()].some((name) => name.includes("preview.html")), "unselected files excluded");
  });

  await t.test("missing CSRF and forged Origin reject writes without creating entries", async () => {
    await rejected(await request("mkdir", { method: "POST", form: formData({ path: testDirectory, name: "missing-csrf" }) }), 403);
    await rejected(await request("mkdir", {
      method: "POST",
      form: formData({ path: testDirectory, name: "forged-origin" }),
      headers: { "X-CSRF-Token": csrf, Origin: "https://forged-origin.invalid" },
    }), 403);
    const data = await json(await request("list", { params: { path: testDirectory } }));
    assert.ok(!data.entries.some((entry) => entry.name === "missing-csrf" || entry.name === "forged-origin"));
  });

  await t.test("root deletion and traversal with either separator are rejected", async () => {
    await rejected(await request("delete", { method: "POST", form: formData({ target: "" }), headers: { "X-CSRF-Token": csrf } }), 403);
    for (const path of ["../", `${testDirectory}/../`, `${testDirectory}\\..\\outside`, "..\\outside", "C:\\Windows"]) {
      await rejected(await request("list", { params: { path } }), 400);
    }
    const normalized = await json(await request("list", { params: { path: `${testDirectory}\\Unterordner` } }));
    assert.equal(normalized.path, nestedDirectory, "safe Windows separators normalize to a relative path");
    await rejected(await request("mkdir", { method: "POST", form: formData({ path: testDirectory, name: "../outside" }), headers: { "X-CSRF-Token": csrf } }), 400);
    await rejected(await request("download", { params: { target: "../package.json" } }), 400);
    const data = await json(await request("list", { params: { path: testDirectory } }));
    assert.ok(data.entries.some((entry) => entry.name === "test.txt"), "invalid operations leave data intact");
  });

  await t.test("delete removes only selected test file and recursive test directory", async () => {
    await mutate("delete", { target: `${testDirectory}/test (1).txt` });
    const afterFileDelete = await json(await request("list", { params: { path: testDirectory } }));
    assert.ok(!afterFileDelete.entries.some((entry) => entry.name === "test (1).txt"));
    assert.ok(afterFileDelete.entries.some((entry) => entry.name === "test.txt"));
    await mutate("delete", { target: nestedDirectory });
    const afterDirectoryDelete = await json(await request("list", { params: { path: testDirectory } }));
    assert.ok(!afterDirectoryDelete.entries.some((entry) => entry.name === "Unterordner"));
    assert.ok(!findTreeNode(afterDirectoryDelete.tree, nestedDirectory));
  });
});
