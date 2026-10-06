import { ZipArchive } from "archiver";
import { constants, type Stats } from "node:fs";
import { lstat, mkdir, open, opendir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { PassThrough, Readable } from "node:stream";

export class CloudStorageError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "CloudStorageError";
  }
}

export interface CloudEntry {
  name: string;
  kind: "directory" | "file";
  type: string;
  size: number | null;
  modified: number;
}

export interface CloudTreeNode {
  name: string;
  path: string;
  children: CloudTreeNode[];
  truncated: boolean;
}

export interface CloudListing {
  path: string;
  entries: CloudEntry[];
  tree: CloudTreeNode;
  rootLabel: string;
  rootPath: string;
  allowDelete: boolean;
}

export interface CloudFileStream {
  stream: ReadableStream<Uint8Array>;
  name: string;
  size: number;
  mimeType: string;
}

export interface CloudStorageOptions {
  rootDirectory?: string;
  uploadMaxBytes?: number;
  maxUploadFiles?: number;
  maxDirectoryEntries?: number;
  treeMaxNodes?: number;
  treeMaxDepth?: number;
  zipMaxEntries?: number;
  zipMaxBytes?: number;
  zipMaxDepth?: number;
}

const DEFAULT_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_CONFIGURED_UPLOAD_BYTES = 1024 * 1024 * 1024;
const naturalOrder = new Intl.Collator("de", { numeric: true, sensitivity: "base" });

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function validatedLimit(value: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new CloudStorageError("Die Cloud-Speichereinstellungen sind ungültig.", 500);
  }
  return value;
}

function configuredUploadBytes(): number {
  const configured = process.env.CLOUD_UPLOAD_MAX_BYTES;
  return validatedLimit(
    configured === undefined || configured === "" ? DEFAULT_UPLOAD_BYTES : Number(configured),
    MAX_CONFIGURED_UPLOAD_BYTES,
  );
}

function safeName(name: string): string {
  if (
    typeof name !== "string" || !name || name !== name.trim() || name === "." || name === ".." ||
    /[\u0000-\u001f\u007f\\/:*?"<>|]/.test(name) || /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name) ||
    name.length > 255 || Buffer.byteLength(name, "utf8") > 255
  ) {
    throw new CloudStorageError("Der Name enthält ungültige Zeichen oder ist zu lang.");
  }
  return name;
}

export function normalizeCloudPath(value: string): string {
  if (typeof value !== "string" || value.length > 4096 || /^[\\/]/.test(value)) {
    throw new CloudStorageError("Ungültiger Pfad.");
  }
  const components = value.replaceAll("\\", "/").split("/").filter((part) => part !== "" && part !== ".");
  return components.map(safeName).join("/");
}

function joinCloudPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

function comparable(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(comparable(root), comparable(target));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function uniqueName(original: string, index: number): string {
  if (index === 0) return original;
  const extension = path.extname(original);
  const suffix = ` (${index})${extension}`;
  let base = extension ? original.slice(0, -extension.length) : original;
  // A suffix must remain valid even when an original filename already has 255 bytes.
  while (Buffer.byteLength(base + suffix, "utf8") > 255 || (base + suffix).length > 255) {
    base = Array.from(base).slice(0, -1).join("");
  }
  return safeName(base + suffix);
}

const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".bmp": "image/bmp",
  ".ico": "image/x-icon", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".m4a": "audio/mp4", ".flac": "audio/flac", ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8", ".csv": "text/plain; charset=utf-8", ".log": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".zip": "application/zip",
};

export function contentDisposition(name: string, inline = false): string {
  const basename = name.replaceAll("\\", "/").split("/").at(-1) || "Datei";
  const fallback = basename.replace(/[^\x20-\x7e]|["\\;]/g, "_");
  const encoded = encodeURIComponent(basename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${inline ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

/** Isolated local storage; no reference files or website source are imported. */
export function createCloudStorage(options: CloudStorageOptions = {}) {
  const configuredRoot = options.rootDirectory ?? process.env.CLOUD_STORAGE_DIR;
  if (configuredRoot && !path.isAbsolute(configuredRoot)) {
    throw new CloudStorageError("CLOUD_STORAGE_DIR muss ein absoluter Ordnerpfad sein.", 500);
  }
  const rootDirectory = path.resolve(configuredRoot || path.join(process.cwd(), ".cloud-data", "files"));
  const uploadMaxBytes = validatedLimit(options.uploadMaxBytes ?? configuredUploadBytes(), MAX_CONFIGURED_UPLOAD_BYTES);
  const maxUploadFiles = validatedLimit(options.maxUploadFiles ?? 100, 500);
  const maxDirectoryEntries = validatedLimit(options.maxDirectoryEntries ?? 10000, 100000);
  const treeMaxNodes = validatedLimit(options.treeMaxNodes ?? 650, 10000);
  const treeMaxDepth = validatedLimit(options.treeMaxDepth ?? 8, 64);
  const zipMaxEntries = validatedLimit(options.zipMaxEntries ?? 10000, 100000);
  const zipMaxBytes = validatedLimit(options.zipMaxBytes ?? 2 * 1024 * 1024 * 1024, 20 * 1024 * 1024 * 1024);
  const zipMaxDepth = validatedLimit(options.zipMaxDepth ?? 64, 128);
  let rootPromise: Promise<string> | undefined;
  let mutationQueue: Promise<unknown> = Promise.resolve();

  async function checkRootAncestors() {
    const parsed = path.parse(rootDirectory);
    let current = parsed.root;
    for (const segment of rootDirectory.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      try {
        const info = await lstat(current);
        if (info.isSymbolicLink() || !info.isDirectory()) {
          throw new CloudStorageError("Der Cloud-Speicher darf keine Verknüpfung sein.", 500);
        }
      } catch (error) {
        if (errorCode(error) === "ENOENT") break;
        throw error;
      }
    }
  }

  async function root(): Promise<string> {
    if (!rootPromise) {
      rootPromise = (async () => {
        await checkRootAncestors();
        await mkdir(rootDirectory, { recursive: true });
        await checkRootAncestors();
        const canonical = await realpath(rootDirectory);
        if (comparable(canonical) !== comparable(rootDirectory)) {
          throw new CloudStorageError("Der Cloud-Speicher darf keine Verknüpfung sein.", 500);
        }
        return canonical;
      })().catch((error) => {
        rootPromise = undefined;
        throw error;
      });
    }
    return rootPromise;
  }

  async function resolveExisting(value: string): Promise<{ absolute: string; relative: string; info: Stats }> {
    const relative = normalizeCloudPath(value);
    const base = await root();
    let absolute = base;
    let info: Stats;
    try {
      info = await lstat(base);
      if (info.isSymbolicLink() || !info.isDirectory() || comparable(await realpath(base)) !== comparable(base)) {
        throw new CloudStorageError("Der Speicherpfad ist nicht erlaubt.", 403);
      }
      for (const segment of relative.split("/").filter(Boolean)) {
        absolute = path.join(absolute, segment);
        info = await lstat(absolute);
        if (info.isSymbolicLink()) throw new CloudStorageError("Verknüpfungen sind im Cloud-Speicher nicht erlaubt.", 403);
      }
      if (!isInsideRoot(base, await realpath(absolute))) {
        throw new CloudStorageError("Der Speicherpfad ist nicht erlaubt.", 403);
      }
    } catch (error) {
      if (errorCode(error) === "ENOENT" || errorCode(error) === "ENOTDIR") {
        throw new CloudStorageError("Datei oder Ordner nicht gefunden.", 404);
      }
      throw error;
    }
    return { absolute, relative, info };
  }

  async function resolveDirectory(value: string) {
    const resolved = await resolveExisting(value);
    if (!resolved.info.isDirectory()) throw new CloudStorageError("Dieser Pfad ist kein Ordner.", 400);
    return resolved;
  }

  async function readEntries(value: string, truncate = false) {
    const directory = await resolveDirectory(value);
    const entries: { name: string; relative: string; info: Stats }[] = [];
    let truncated = false;
    let scanned = 0;
    const iterator = await opendir(directory.absolute);
    for await (const entry of iterator) {
      if (++scanned > maxDirectoryEntries) {
        if (!truncate) throw new CloudStorageError("Dieser Ordner enthält zu viele Einträge.", 413);
        truncated = true;
        break;
      }
      if (entry.isSymbolicLink()) continue;
      try { safeName(entry.name); } catch { continue; }
      const relative = joinCloudPath(directory.relative, entry.name);
      try {
        const resolved = await resolveExisting(relative);
        if (resolved.info.isDirectory() || resolved.info.isFile()) entries.push({ name: entry.name, relative, info: resolved.info });
      } catch (error) {
        // A file may be removed while another visitor refreshes a listing.
        if (error instanceof CloudStorageError && (error.status === 404 || error.status === 403)) continue;
        throw error;
      }
    }
    entries.sort((left, right) => {
      if (left.info.isDirectory() !== right.info.isDirectory()) return left.info.isDirectory() ? -1 : 1;
      return naturalOrder.compare(left.name, right.name);
    });
    return { entries, truncated, scanned };
  }

  async function tree(): Promise<CloudTreeNode> {
    let nodes = 1;
    let scanned = 0;
    async function visit(relative: string, depth: number): Promise<CloudTreeNode> {
      const node: CloudTreeNode = { name: relative.split("/").at(-1) || "Dateien", path: relative, children: [], truncated: false };
      if (depth >= treeMaxDepth || scanned >= maxDirectoryEntries * 2) {
        node.truncated = true;
        return node;
      }
      const result = await readEntries(relative, true);
      scanned += result.scanned;
      node.truncated = result.truncated;
      for (const entry of result.entries) {
        if (!entry.info.isDirectory()) continue;
        if (nodes >= treeMaxNodes || scanned >= maxDirectoryEntries * 2) {
          node.truncated = true;
          break;
        }
        nodes++;
        node.children.push(await visit(entry.relative, depth + 1));
      }
      return node;
    }
    return visit("", 0);
  }

  function mutate<T>(operation: () => Promise<T>): Promise<T> {
    const pending = mutationQueue.then(operation);
    mutationQueue = pending.catch(() => undefined);
    return pending;
  }

  async function openSafeFile(value: string) {
    const resolved = await resolveExisting(value);
    if (!resolved.info.isFile()) throw new CloudStorageError("Datei nicht gefunden.", 404);
    const handle = await open(resolved.absolute, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try {
      const info = await handle.stat();
      const checked = await resolveExisting(resolved.relative);
      if (!info.isFile() || checked.info.dev !== info.dev || checked.info.ino !== info.ino) {
        throw new CloudStorageError("Die Datei wurde während des Zugriffs verändert.", 409);
      }
      return { ...resolved, info, handle };
    } catch (error) {
      await handle.close();
      throw error;
    }
  }

  async function listCloudDirectory(value = ""): Promise<CloudListing> {
    const relative = normalizeCloudPath(value);
    const result = await readEntries(relative);
    return {
      path: relative,
      entries: result.entries.map(({ name, info }) => ({
        name,
        kind: info.isDirectory() ? "directory" : "file",
        type: info.isDirectory() ? "Ordner" : (path.extname(name).slice(1).toUpperCase() || "Datei"),
        size: info.isDirectory() ? null : info.size,
        modified: Math.floor(info.mtimeMs / 1000),
      })),
      tree: await tree(),
      rootLabel: "Dateien",
      rootPath: "Gemeinsamer Cloud-Speicher",
      allowDelete: true,
    };
  }

  async function createCloudDirectory(value: string, requestedName: string) {
    const name = safeName(requestedName);
    return mutate(async () => {
      const directory = await resolveDirectory(value);
      const target = path.join(directory.absolute, name);
      try {
        await mkdir(target);
      } catch (error) {
        if (errorCode(error) === "EEXIST") throw new CloudStorageError("Ein Eintrag mit diesem Namen existiert bereits.", 409);
        throw error;
      }
      return { path: joinCloudPath(directory.relative, name), name };
    });
  }

  async function uploadCloudFiles(value: string, files: readonly File[]) {
    if (!files.length || files.length > maxUploadFiles) {
      throw new CloudStorageError(`Bitte wähle zwischen 1 und ${maxUploadFiles} Dateien aus.`);
    }
    let declaredBytes = 0;
    for (const file of files) {
      safeName(file.name);
      if (!Number.isSafeInteger(file.size) || file.size < 0) throw new CloudStorageError("Ungültige Dateigröße.");
      declaredBytes += file.size;
      if (declaredBytes > uploadMaxBytes) throw new CloudStorageError("Der Upload überschreitet die erlaubte Gesamtgröße.", 413);
    }
    return mutate(async () => {
      const directory = await resolveDirectory(value);
      const created: { name: string; absolute: string }[] = [];
      let actualBytes = 0;
      try {
        for (const file of files) {
          await resolveDirectory(directory.relative);
          let saved: { name: string; absolute: string; handle: Awaited<ReturnType<typeof open>> } | undefined;
          for (let index = 0; index <= 10000; index++) {
            const name = uniqueName(file.name, index);
            const absolute = path.join(directory.absolute, name);
            try {
              const handle = await open(absolute, "wx", 0o600);
              saved = { name, absolute, handle };
              created.push({ name, absolute });
              break;
            } catch (error) {
              if (errorCode(error) !== "EEXIST") throw error;
            }
          }
          if (!saved) throw new CloudStorageError("Es gibt zu viele Dateien mit diesem Namen.", 409);
          const reader = file.stream().getReader();
          let fileBytes = 0;
          try {
            while (true) {
              const next = await reader.read();
              if (next.done) break;
              fileBytes += next.value.byteLength;
              actualBytes += next.value.byteLength;
              if (fileBytes > file.size || actualBytes > uploadMaxBytes) {
                throw new CloudStorageError("Der Upload überschreitet die erlaubte Größe.", 413);
              }
              const buffer = Buffer.from(next.value);
              let offset = 0;
              while (offset < buffer.length) {
                const { bytesWritten } = await saved.handle.write(buffer, offset, buffer.length - offset);
                if (!bytesWritten) throw new CloudStorageError("Die Datei konnte nicht vollständig gespeichert werden.", 500);
                offset += bytesWritten;
              }
            }
            if (fileBytes !== file.size) throw new CloudStorageError("Die Datei wurde nicht vollständig übertragen.");
          } catch (error) {
            await reader.cancel().catch(() => undefined);
            throw error;
          } finally {
            reader.releaseLock();
            await saved.handle.close();
          }
        }
        return { uploaded: created.length, names: created.map((entry) => entry.name) };
      } catch (error) {
        for (const entry of created) await rm(entry.absolute, { force: true }).catch(() => undefined);
        throw error;
      }
    });
  }

  async function deleteCloudPath(value: string): Promise<void> {
    const relative = normalizeCloudPath(value);
    if (!relative) throw new CloudStorageError("Der Basisordner kann nicht gelöscht werden.", 403);
    return mutate(async () => {
      const target = await resolveExisting(relative);
      if (!target.info.isDirectory() && !target.info.isFile()) {
        throw new CloudStorageError("Dieser Eintrag kann nicht gelöscht werden.", 403);
      }
      // rm removes symlink children themselves and never follows them into other folders.
      await rm(target.absolute, { recursive: target.info.isDirectory(), force: false });
    });
  }

  async function openCloudFile(value: string): Promise<CloudFileStream> {
    const file = await openSafeFile(value);
    const name = file.relative.split("/").at(-1)!;
    return {
      stream: Readable.toWeb(file.handle.createReadStream({ autoClose: true })) as ReadableStream<Uint8Array>,
      name,
      size: file.info.size,
      mimeType: mimeTypes[path.extname(name).toLowerCase()] ?? "application/octet-stream",
    };
  }

  async function createCloudZip(values: readonly string[]): Promise<{ stream: ReadableStream<Uint8Array>; name: string }> {
    if (!values.length || values.length > 500) throw new CloudStorageError("Bitte wähle zwischen 1 und 500 Einträgen aus.");
    const normalized = [...new Set(values.map(normalizeCloudPath))].sort((left, right) => left.length - right.length);
    const selected: string[] = [];
    for (const candidate of normalized) {
      if (!selected.some((parent) => parent === "" || comparable(candidate) === comparable(parent) || comparable(candidate).startsWith(`${comparable(parent)}/`))) {
        selected.push(candidate);
      }
    }
    const entries: { relative: string; archivePath: string; info: Stats }[] = [];
    const usedNames = new Set<string>();
    let totalBytes = 0;
    let scanned = 0;
    async function collect(relative: string, archivePath: string, depth: number): Promise<void> {
      if (depth > zipMaxDepth) throw new CloudStorageError("Die Ordnerstruktur ist für den ZIP-Download zu tief.", 413);
      const resolved = await resolveExisting(relative);
      if (!resolved.info.isFile() && !resolved.info.isDirectory()) return;
      if (entries.length >= zipMaxEntries) throw new CloudStorageError("Die Auswahl enthält zu viele Einträge für einen ZIP-Download.", 413);
      if (resolved.info.isFile()) {
        totalBytes += resolved.info.size;
        if (totalBytes > zipMaxBytes) throw new CloudStorageError("Die Auswahl ist zu groß für einen ZIP-Download.", 413);
      }
      entries.push({ relative: resolved.relative, archivePath, info: resolved.info });
      if (!resolved.info.isDirectory()) return;
      const iterator = await opendir(resolved.absolute);
      for await (const entry of iterator) {
        if (++scanned > zipMaxEntries * 2) throw new CloudStorageError("Die Auswahl enthält zu viele Einträge für einen ZIP-Download.", 413);
        if (entry.isSymbolicLink()) continue;
        try { safeName(entry.name); } catch { continue; }
        await collect(joinCloudPath(relative, entry.name), `${archivePath}/${entry.name}`, depth + 1);
      }
    }
    for (const relative of selected) {
      const original = relative.split("/").at(-1) || "Dateien";
      let index = 0;
      let name = original;
      while (usedNames.has(name.toLowerCase())) name = uniqueName(original, ++index);
      usedNames.add(name.toLowerCase());
      await collect(relative, name, 0);
    }

    const archive = new ZipArchive({ zlib: { level: 6 } });
    const output = new PassThrough();
    const sources = new Set<Readable>();
    let streamedBytes = 0;
    const fail = (error: Error) => {
      archive.abort();
      output.destroy(error);
      for (const source of sources) source.destroy();
    };
    archive.on("error", fail);
    archive.on("warning", fail);
    output.on("close", () => {
      archive.abort();
      for (const source of sources) source.destroy();
    });
    archive.pipe(output);
    for (const entry of entries) {
      if (entry.info.isDirectory()) {
        archive.append(Buffer.alloc(0), { name: `${entry.archivePath}/`, type: "directory", date: entry.info.mtime });
        continue;
      }
      // Open only the active ZIP entry, with a fresh containment check and no-follow flag.
      const source = Readable.from((async function* () {
        const file = await openSafeFile(entry.relative);
        try {
          for await (const chunk of file.handle.createReadStream({ autoClose: false })) {
            streamedBytes += (chunk as Buffer).byteLength;
            if (streamedBytes > zipMaxBytes) throw new CloudStorageError("Die Auswahl ist zu groß für einen ZIP-Download.", 413);
            yield chunk;
          }
        } finally {
          await file.handle.close();
        }
      })());
      sources.add(source);
      source.on("error", fail);
      source.on("close", () => sources.delete(source));
      archive.append(source, { name: entry.archivePath, date: entry.info.mtime });
    }
    const stream = Readable.toWeb(output) as ReadableStream<Uint8Array>;
    void archive.finalize().catch(fail);
    return { stream, name: `Cloud-Auswahl-${new Date().toISOString().replaceAll(":", "-").slice(0, 19)}.zip` };
  }

  return {
    getCloudLimits: () => ({ uploadMaxBytes, maxUploadFiles }),
    listCloudDirectory,
    createCloudDirectory,
    uploadCloudFiles,
    deleteCloudPath,
    openCloudFile,
    createCloudZip,
  };
}

let defaultStorage: ReturnType<typeof createCloudStorage> | undefined;
function storage() { return defaultStorage ??= createCloudStorage(); }

export function getCloudLimits() { return storage().getCloudLimits(); }
export function listCloudDirectory(path = "") { return storage().listCloudDirectory(path); }
export function createCloudDirectory(path: string, name: string) { return storage().createCloudDirectory(path, name); }
export function uploadCloudFiles(path: string, files: readonly File[]) { return storage().uploadCloudFiles(path, files); }
export function deleteCloudPath(target: string) { return storage().deleteCloudPath(target); }
export function openCloudFile(target: string) { return storage().openCloudFile(target); }
export function createCloudZip(targets: readonly string[]) { return storage().createCloudZip(targets); }
