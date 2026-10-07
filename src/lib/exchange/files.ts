import { randomUUID } from "node:crypto";
import { databaseReady, query, transaction } from "./database";

export class ExchangeStorageError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const CHUNK_BYTES = 1024 * 1024;
export const STORAGE_BYTES = 250 * 1024 * 1024;
export type StoredFile = { id: string; scope: "cloud" | "chat"; owner: string; name: string; size: string; mime: string; metadata: Record<string, string>; complete: boolean; created: string };
const table = "academy_exchange.files";
export async function beginFile(scope: StoredFile["scope"], owner: string, name: string, size: number, mime: string, metadata: Record<string, string>) {
  await databaseReady();
  if (!Number.isSafeInteger(size) || size < 0 || size > (scope === "chat" ? 25 : 100) * 1024 * 1024) throw new ExchangeStorageError("Die Datei ist zu groß.", 413);
  return transaction(async () => {
    // Expired, unfinished uploads never appear in listings and release their reservation.
    await query(`DELETE FROM ${table} WHERE NOT complete AND created<$1`, [Date.now() - 3_600_000]);
    await query(`DELETE FROM ${table} f WHERE complete AND NOT EXISTS(SELECT 1 FROM academy_exchange.cloud_nodes n WHERE n.file_id=f.id) AND NOT EXISTS(SELECT 1 FROM academy_exchange.attachments a WHERE a.id=f.id)`);
    const [usage] = await query<{ bytes: string; pending: string }>(`SELECT COALESCE(sum(size),0) AS bytes,count(*) FILTER(WHERE NOT complete) AS pending FROM ${table}`);
    if (Number(usage.pending) >= 100 || Number(usage.bytes) + size > STORAGE_BYTES) throw new ExchangeStorageError("Der gemeinsame Testspeicher (250 MB) ist voll. Bitte lösche nicht mehr benötigte Dateien.", 507);
    const id = randomUUID();
    await query(`INSERT INTO ${table}(id,scope,owner,name,size,mime,metadata,created) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id,scope,owner,name,size,mime,JSON.stringify(metadata),Date.now()]);
    return { id, chunkBytes: CHUNK_BYTES };
  }, 710062);
}
export async function ownedFile(id: string, scope: StoredFile["scope"], owner: string) {
  await databaseReady();
  const [file] = await query<StoredFile>(`SELECT * FROM ${table} WHERE id=$1 AND scope=$2 AND owner=$3`, [id,scope,owner]);
  if (!file) throw new ExchangeStorageError("Der Upload wurde nicht gefunden.", 404);
  return file;
}
export async function writeChunk(id: string, scope: StoredFile["scope"], owner: string, part: number, bytes: Buffer) {
  return transaction(async () => {
    const file = await ownedFile(id, scope, owner);
    const expected = Math.min(CHUNK_BYTES, Number(file.size) - part * CHUNK_BYTES);
    if (file.complete || !Number.isSafeInteger(part) || part < 0 || expected <= 0 || bytes.length !== expected) throw new ExchangeStorageError("Ungültiger Dateiabschnitt.");
    await query("INSERT INTO academy_exchange.chunks VALUES($1,$2,$3) ON CONFLICT(file_id,part) DO UPDATE SET bytes=excluded.bytes", [id,part,bytes]);
  }, 710062);
}
export async function finishFile<T>(id: string, scope: StoredFile["scope"], owner: string, attach: (file: StoredFile) => Promise<T>) {
  return transaction(async () => {
    const file = await ownedFile(id,scope,owner);
    if (file.complete) throw new ExchangeStorageError("Die Datei wurde bereits gespeichert.", 409);
    const [parts] = await query<{ n: string; bytes: string }>("SELECT count(*) AS n,COALESCE(sum(octet_length(bytes)),0) AS bytes FROM academy_exchange.chunks WHERE file_id=$1", [id]);
    if (Number(parts.n) !== Math.ceil(Number(file.size)/CHUNK_BYTES) || Number(parts.bytes) !== Number(file.size)) throw new ExchangeStorageError("Der Upload ist noch nicht vollständig.", 409);
    const result = await attach(file);
    await query(`UPDATE ${table} SET complete=true WHERE id=$1`, [id]);
    return result;
  }, 710062);
}
export async function cancelFile(id: string, scope: StoredFile["scope"], owner: string) {
  await ownedFile(id,scope,owner);
  await query(`DELETE FROM ${table} WHERE id=$1 AND NOT complete`, [id]);
}
export async function readFile(id: string) {
  await databaseReady();
  const [file] = await query<StoredFile>(`SELECT * FROM ${table} WHERE id=$1 AND complete`, [id]);
  if (!file) throw new ExchangeStorageError("Datei nicht gefunden.",404);
  let part=0; let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({
    async pull(controller) {
      if(part>=Math.ceil(Number(file.size)/CHUNK_BYTES)) {controller.close();return;}
      try {
        const [chunk]=await query<{bytes:Buffer}>("SELECT bytes FROM academy_exchange.chunks WHERE file_id=$1 AND part=$2",[id,part++]);
        if(cancelled) return;
        if(!chunk) throw new ExchangeStorageError("Die Datei wurde während des Downloads entfernt.",409);
        controller.enqueue(chunk.bytes);
      } catch(error) {if(!cancelled) controller.error(error);}
    },
    cancel() {cancelled=true;},
  },{highWaterMark:0});
  return {file,stream};
}
export async function sniffImageMime(id: string) {
  const [chunk]=await query<{ bytes:Buffer }>("SELECT bytes FROM academy_exchange.chunks WHERE file_id=$1 AND part=0",[id]);
  const bytes=chunk?.bytes || Buffer.alloc(0);
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if(bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  if(/^GIF8[79]a$/.test(bytes.subarray(0,6).toString("ascii"))) return "image/gif";
  if(bytes.subarray(0,4).toString("ascii")==="RIFF" && bytes.subarray(8,12).toString("ascii")==="WEBP") return "image/webp";
  return "application/octet-stream";
}
export async function uploadBody(request: Request, maximum = CHUNK_BYTES) {
  if(Number(request.headers.get("content-length") || 0)>maximum || !request.body) throw new ExchangeStorageError("Die Anfrage ist zu groß oder enthält keine Daten.",413);
  const reader=request.body.getReader(); const chunks:Uint8Array[]=[]; let size=0;
  while(true) {
    const next=await reader.read(); if(next.done) break;
    size+=next.value.length;
    if(size>maximum) {await reader.cancel();throw new ExchangeStorageError("Die Anfrage ist zu groß.",413);}
    chunks.push(next.value);
  }
  return Buffer.concat(chunks,size);
}
