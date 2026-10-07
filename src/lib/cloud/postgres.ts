import path from "node:path";
import { PassThrough, Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { ZipArchive } from "archiver";
import { databaseReady, query, transaction } from "@/lib/exchange/database";
import { beginFile, cancelFile, finishFile, readFile, writeChunk, CHUNK_BYTES } from "@/lib/exchange/files";
import { CloudStorageError, normalizeCloudPath, safeName, uniqueName, mimeTypes, type CloudListing, type CloudTreeNode } from "./storage";

type Node = { path: string; parent: string | null; name: string; kind: "directory" | "file"; file_id: string | null; modified: string; size?: string };
const table = "academy_exchange.cloud_nodes";
const join = (parent: string, name: string) => parent ? `${parent}/${name}` : name;
async function node(value: string, directory = false) {
  await databaseReady();
  const [entry] = await query<Node>(`SELECT * FROM ${table} WHERE path=$1`, [normalizeCloudPath(value)]);
  if (!entry) throw new CloudStorageError("Datei oder Ordner nicht gefunden.",404);
  if (directory && entry.kind !== "directory") throw new CloudStorageError("Dieser Pfad ist kein Ordner.");
  return entry;
}
async function entryLimit() {
  const [count] = await query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  if (Number(count.n) >= 10000) throw new CloudStorageError("Der Testspeicher enthält zu viele Einträge.",413);
}
export async function listCloudDirectory(value = ""): Promise<CloudListing> {
  const directory = await node(value,true);
  const entries = await query<Node>(`SELECT n.*,f.size FROM ${table} n LEFT JOIN academy_exchange.files f ON f.id=n.file_id WHERE n.parent=$1 ORDER BY n.kind,n.name`,[directory.path]);
  const directories = await query<Node>(`SELECT * FROM ${table} WHERE kind='directory' ORDER BY length(path),path LIMIT 513`);
  const root: CloudTreeNode = { name: "Dateien", path: "", children: [], truncated: directories.length>512 };
  const tree = new Map<string,CloudTreeNode>([["",root]]);
  for (const folder of directories.slice(0,512)) {
    if (!folder.path) continue;
    const item: CloudTreeNode = { name: folder.name,path:folder.path,children:[],truncated:false };
    tree.set(folder.path,item); tree.get(folder.parent || "")?.children.push(item);
  }
  return { path: directory.path, entries: entries.map(entry => ({ name:entry.name,kind:entry.kind,type:entry.kind === "directory" ? "Ordner" : path.extname(entry.name).slice(1).toUpperCase() || "Datei",size:entry.kind === "file" ? Number(entry.size) : null,modified:Number(entry.modified)/1000 })),tree:root,rootLabel:"Dateien",rootPath:"Gemeinsamer Online-Speicher",allowDelete:true };
}
export async function createCloudDirectory(value: string, requestedName: string) {
  await databaseReady();
  return transaction(async () => {
    const directory=await node(value,true); const name=safeName(requestedName); const target=join(directory.path,name);
    await entryLimit();
    if (await query(`SELECT 1 FROM ${table} WHERE path=$1`,[target]).then(rows=>rows.length)) throw new CloudStorageError("Ein Eintrag mit diesem Namen existiert bereits.",409);
    await query(`INSERT INTO ${table} VALUES($1,$2,$3,'directory',null,$4)`,[target,directory.path,name,Date.now()]);
    return { path:target,name };
  },710062);
}
export async function beginCloudUpload(value: string, name: string, size: number, owner: string) {
  const directory=await node(value,true); safeName(name);
  return beginFile("cloud",owner,name,size,mimeTypes[path.extname(name).toLowerCase()] || "application/octet-stream",{path:directory.path});
}
export async function finishCloudUpload(id: string, owner: string) {
  return finishFile(id,"cloud",owner,async file => {
    const directory=await node(file.metadata.path,true); await entryLimit();
    let name=file.name; let target=join(directory.path,name); let suffix=0;
    while ((await query(`SELECT 1 FROM ${table} WHERE path=$1`,[target])).length) {
      name=uniqueName(file.name,++suffix); target=join(directory.path,name);
    }
    await query(`INSERT INTO ${table} VALUES($1,$2,$3,'file',$4,$5)`,[target,directory.path,name,file.id,Date.now()]);
    return { uploaded:1,files:[name] };
  });
}
export async function uploadCloudFiles(value: string, files: readonly File[]) {
  let uploaded=0; const names:string[]=[];
  if (!files.length || files.length>100 || files.reduce((sum,file)=>sum+file.size,0)>100*1024*1024) throw new CloudStorageError("Der Upload ist zu groß.",413);
  for(const file of files) {
    const owner=crypto.randomUUID(); const pending=await beginCloudUpload(value,file.name,file.size,owner);
    try {
      for(let offset=0;offset<file.size;offset+=CHUNK_BYTES) await writeChunk(pending.id,"cloud",owner,offset/CHUNK_BYTES,Buffer.from(await file.slice(offset,offset+CHUNK_BYTES).arrayBuffer()));
      const saved=await finishCloudUpload(pending.id,owner); uploaded+=saved.uploaded; names.push(...saved.files);
    } catch(error) { await cancelFile(pending.id,"cloud",owner).catch(()=>{}); throw error; }
  }
  return { uploaded,files:names };
}
export async function deleteCloudPath(value: string) {
  await databaseReady();
  return transaction(async () => {
    const target=await node(value);
    if (!target.path) throw new CloudStorageError("Der Hauptordner kann nicht gelöscht werden.",403);
    const entries=await query<Node>(`WITH RECURSIVE selected AS (SELECT * FROM ${table} WHERE path=$1 UNION ALL SELECT n.* FROM ${table} n JOIN selected s ON n.parent=s.path) SELECT * FROM selected`,[target.path]);
    await query(`DELETE FROM ${table} WHERE path=$1`,[target.path]);
    for(const entry of entries) if(entry.file_id) await query("DELETE FROM academy_exchange.files WHERE id=$1",[entry.file_id]);
  },710062);
}
export async function openCloudFile(value: string) {
  const target=await node(value);
  if (!target.file_id) throw new CloudStorageError("Datei nicht gefunden.",404);
  const {file,stream}=await readFile(target.file_id);
  return {name:target.name,size:Number(file.size),mimeType:file.mime,stream};
}
export async function createCloudZip(values: readonly string[]) {
  if (!values.length || values.length>100) throw new CloudStorageError("Wähle 1 bis 100 Einträge.");
  const targets=await Promise.all([...new Set(values.map(normalizeCloudPath))].map(value=>node(value)));
  if(targets.some(target=>!target.path)) throw new CloudStorageError("Wähle Dateien oder Unterordner.");
  const all=await query<Node>(`SELECT * FROM ${table} ORDER BY path`);
  const selected=all.filter(entry=>targets.some(target=>entry.path===target.path || entry.path.startsWith(target.path+"/")));
  const archive=new ZipArchive({zlib:{level:6}}); const output=new PassThrough();
  archive.on("error",error=>output.destroy(error)); output.on("close",()=>archive.abort()); archive.pipe(output);
  void (async()=>{
    for(const entry of selected) {
      if(entry.kind==="directory") archive.append("",{name:entry.path+"/"});
      else { const file=await openCloudFile(entry.path); archive.append(Readable.fromWeb(file.stream as NodeReadableStream<Uint8Array>),{name:entry.path}); }
    }
    await archive.finalize();
  })().catch(error=>output.destroy(error));
  return {stream:Readable.toWeb(output) as ReadableStream<Uint8Array>,name:"Cloud-Auswahl.zip"};
}
