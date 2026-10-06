import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { CloudStorageError, contentDisposition, createCloudStorage } from "./storage";

let fixture: string;
let directory: string;

beforeEach(async () => {
  fixture = await mkdtemp(path.join(os.tmpdir(), "academy-cloud-test-"));
  directory = path.join(fixture, "files");
});

afterEach(async () => {
  // Verify the computed recursive cleanup stays within this test's temporary workspace.
  const relative = path.relative(os.tmpdir(), fixture);
  assert.ok(!path.isAbsolute(relative) && !relative.startsWith("..") && relative.startsWith("academy-cloud-test-"));
  await rm(fixture, { recursive: true, force: true });
});

function cloud(options: Parameters<typeof createCloudStorage>[0] = {}) {
  return createCloudStorage({ ...options, rootDirectory: directory });
}

function status(expected: number) {
  return (error: unknown) => error instanceof CloudStorageError && error.status === expected;
}

// Inspect central-directory entries and extract their payloads, independently of archiver.
function zipContents(buffer: Buffer): Map<string, Buffer> {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, "ZIP has an end-of-central-directory record");
  const count = buffer.readUInt16LE(end + 10);
  let cursor = buffer.readUInt32LE(end + 16);
  const result = new Map<string, Buffer>();
  for (let index = 0; index < count; index++) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50);
    const method = buffer.readUInt16LE(cursor + 10);
    const size = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const offset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    assert.equal(buffer.readUInt32LE(offset), 0x04034b50);
    const payloadOffset = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    const payload = buffer.subarray(payloadOffset, payloadOffset + size);
    assert.ok(!result.has(name), `ZIP entry ${name} is unique`);
    result.set(name, method === 8 ? inflateRawSync(payload) : payload);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

test("folders, concurrent uploads, listing, streaming and recursive deletion preserve originals", async () => {
  const storage = cloud();
  await storage.createCloudDirectory("", "Austausch");
  await storage.createCloudDirectory("", "Ziele");
  await Promise.all(Array.from({ length: 4 }, () => storage.uploadCloudFiles("Austausch", [new File(["Hallo Welt"], "Notizen.txt")])));
  const listing = await storage.listCloudDirectory("Austausch");
  assert.deepEqual(listing.entries.map((entry) => entry.name), ["Notizen (1).txt", "Notizen (2).txt", "Notizen (3).txt", "Notizen.txt"]);
  assert.equal(listing.rootPath, "Gemeinsamer Cloud-Speicher");
  assert.equal(listing.rootLabel, "Dateien");
  assert.equal(listing.entries[0].size, Buffer.byteLength("Hallo Welt"));
  assert.ok(Math.abs(listing.entries[0].modified - Math.floor(Date.now() / 1000)) < 10);
  assert.deepEqual(listing.tree.children.map((node) => node.path), ["Austausch", "Ziele"]);
  const opened = await storage.openCloudFile("Austausch/Notizen.txt");
  assert.equal(opened.mimeType, "text/plain; charset=utf-8");
  assert.equal(await new Response(opened.stream).text(), "Hallo Welt");
  await assert.rejects(storage.createCloudDirectory("", "Austausch"), status(409));
  await storage.deleteCloudPath("Austausch");
  assert.deepEqual((await storage.listCloudDirectory()).entries.map((entry) => entry.name), ["Ziele"]);
});

test("invalid names, absolute paths, traversal and root deletion are rejected", async () => {
  const storage = cloud();
  for (const name of ["..", "CON", "nul.txt", "LPT1.csv", "COM¹.txt", "bad.", "bad ", "a/b", "a\\b", "evil\r\n", "file:stream"]) {
    await assert.rejects(storage.createCloudDirectory("", name), status(400));
  }
  for (const target of ["../outside", "folder/../../outside", "C:\\outside", "/outside", "\\\\server\\share"]) {
    await assert.rejects(storage.listCloudDirectory(target), status(400));
  }
  await assert.rejects(storage.deleteCloudPath(""), status(403));
  await assert.rejects(storage.deleteCloudPath("."), status(403));
  assert.throws(() => createCloudStorage({ rootDirectory: "relative/path" }), status(500));
  await assert.rejects(storage.openCloudFile("missing.txt"), status(404));
  const disposition = contentDisposition('ä\r\n".txt', true);
  assert.ok(!disposition.includes("\r") && !disposition.includes("\n"));
  assert.ok(disposition.startsWith("inline;"));
  assert.ok(disposition.includes("filename*=UTF-8''"));
});

test("oversized batches and interrupted streams create no files or overwritten data", async () => {
  const storage = cloud({ uploadMaxBytes: 8, maxUploadFiles: 2 });
  await storage.uploadCloudFiles("", [new File(["original"], "keep.txt")]);
  await assert.rejects(storage.uploadCloudFiles("", [new File(["12345"], "one.txt"), new File(["67890"], "two.txt")]), status(413));
  await assert.rejects(storage.uploadCloudFiles("", Array.from({ length: 3 }, (_, index) => new File([""], `${index}.txt`))), status(400));
  const interrupted = {
    name: "keep.txt",
    size: 2,
    stream: () => new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1])); controller.close(); } }),
  } as File;
  await assert.rejects(storage.uploadCloudFiles("", [new File(["ok"], "created.txt"), interrupted]), status(400));
  assert.deepEqual((await storage.listCloudDirectory()).entries.map((entry) => entry.name), ["keep.txt"]);
  assert.equal(await readFile(path.join(directory, "keep.txt"), "utf8"), "original");
});

test("junctions cannot expose outside files and recursive deletion never follows them", async () => {
  const storage = cloud();
  const outside = path.join(fixture, "outside");
  await mkdir(outside);
  await writeFile(path.join(outside, "private.txt"), "outside");
  await storage.createCloudDirectory("", "Container");
  await symlink(outside, path.join(directory, "Container", "link"), process.platform === "win32" ? "junction" : "dir");
  assert.deepEqual((await storage.listCloudDirectory("Container")).entries, []);
  await assert.rejects(storage.openCloudFile("Container/link/private.txt"), status(403));
  await assert.rejects(storage.createCloudDirectory("Container/link", "injected"), status(403));
  await assert.rejects(storage.createCloudZip(["Container/link"]), status(403));
  const zip = await storage.createCloudZip(["Container"]);
  assert.deepEqual([...zipContents(Buffer.from(await new Response(zip.stream).arrayBuffer())).keys()], ["Container/"]);
  await storage.deleteCloudPath("Container");
  assert.equal(await readFile(path.join(outside, "private.txt"), "utf8"), "outside");
  const ancestor = path.join(fixture, "redirect");
  await symlink(outside, ancestor, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(createCloudStorage({ rootDirectory: path.join(ancestor, "new-root") }).listCloudDirectory(), status(500));
});

test("ZIP keeps nested files and empty folders, removes overlaps and disambiguates matching names", async () => {
  const storage = cloud();
  await storage.createCloudDirectory("", "A");
  await storage.createCloudDirectory("", "B");
  await storage.createCloudDirectory("A", "Empty");
  await storage.uploadCloudFiles("A", [new File(["content A"], "same.txt")]);
  await storage.uploadCloudFiles("B", [new File(["content B"], "same.txt")]);
  const zip = await storage.createCloudZip(["A", "A/same.txt", "B/same.txt"]);
  const entries = zipContents(Buffer.from(await new Response(zip.stream).arrayBuffer()));
  assert.deepEqual([...entries.keys()].sort(), ["A/", "A/Empty/", "A/same.txt", "same.txt"]);
  assert.equal(entries.get("A/same.txt")?.toString(), "content A");
  assert.equal(entries.get("same.txt")?.toString(), "content B");
  const selectedFiles = await storage.createCloudZip(["A/same.txt", "B/same.txt"]);
  const files = zipContents(Buffer.from(await new Response(selectedFiles.stream).arrayBuffer()));
  assert.equal(files.get("same.txt")?.toString(), "content A");
  assert.equal(files.get("same (1).txt")?.toString(), "content B");
});

test("tree and ZIP walking obey configured limits", async () => {
  const storage = cloud({ treeMaxNodes: 2, zipMaxEntries: 2, zipMaxBytes: 4 });
  await storage.createCloudDirectory("", "First");
  await storage.createCloudDirectory("", "Second");
  await storage.uploadCloudFiles("First", [new File(["12345"], "large.txt")]);
  const listing = await storage.listCloudDirectory();
  assert.equal(listing.tree.children.length, 1);
  assert.equal(listing.tree.truncated, true);
  await assert.rejects(storage.createCloudZip(["First/large.txt"]), status(413));
  await assert.rejects(storage.createCloudZip([""]), status(413));
  await assert.rejects(storage.createCloudZip([]), status(400));
  await assert.rejects(cloud({ maxDirectoryEntries: 1 }).listCloudDirectory(), status(413));
});
