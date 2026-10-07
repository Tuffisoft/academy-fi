import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { closeExchangeDatabase, query } from "./database";
import { beginFile, writeChunk, cancelFile, readFile, CHUNK_BYTES } from "./files";
import { beginCloudUpload, finishCloudUpload, createCloudDirectory, deleteCloudPath, listCloudDirectory, openCloudFile, createCloudZip } from "../cloud/postgres";
import { createPostgresChatStorage } from "../chat/postgres";
import { createChatHandlers } from "../chat/http";

test("persistent online storage: separate instances, chunked uploads, private chat and cleanup", {skip:process.env.EXCHANGE_TEST_DATABASE!=="1"}, async () => {
  process.env.EXCHANGE_STORAGE="postgres";
  const suffix=randomUUID(); const folder=`__codex_test_${suffix}`;
  const alice=`codex_alice_${suffix}`,bob=`codex_bob_${suffix}`;
  const owner=`codex_cloud_${suffix}`;
  const origin="http://localhost:3002";
  const siteSessions={alice:{user:{id:alice,name:"Speichertest Alice"},session:{token:`alice-${suffix}`}},bob:{user:{id:bob,name:"Speichertest Bob"},session:{token:`bob-${suffix}`}}};
  const handlers=createChatHandlers(async request=>siteSessions[request.headers.get("x-test-user") as keyof typeof siteSessions] || null);
  const get=(action:string,user="",params:Record<string,string>={})=>handlers.GET(new NextRequest(`${origin}/api/chat?${new URLSearchParams({action,...params})}`,{headers:{"x-test-user":user}}));
  const post=(action:string,user:string,csrf:string,body:unknown)=>handlers.POST(new NextRequest(`${origin}/api/chat?action=${action}`,{method:"POST",headers:{origin,"content-type":"application/json","x-chat-csrf":csrf,"x-test-user":user},body:JSON.stringify(body)}));
  try {
    const first=await createPostgresChatStorage(),second=await createPostgresChatStorage();
    await first.syncProfile(siteSessions.alice.user); await second.syncProfile(siteSessions.bob.user);
    const server=await first.createServer(alice,"Speichertest");
    const state=await first.snapshot(alice); const selected=state.servers.find(row=>row.id===server.id)!;
    const channel=String(state.channels.find(row=>row.serverId===server.id)!.id);
    await assert.rejects(()=>second.messages(bob,{channelId:channel}),/nicht Mitglied/);
    await second.joinServer(bob,selected.inviteCode);
    const sent=await first.send(alice,{channelId:channel},"Dauerhaft gespeichert");
    assert.equal((await second.messages(bob,{channelId:channel})).messages[0].id,sent.id);
    await assert.rejects(()=>second.editMessage(bob,sent.id,"Übernommen"),/nicht ändern/);
    const [a,b]=await Promise.all([get("session","alice").then(r=>r.json()),get("session","bob").then(r=>r.json())]);
    assert.equal((await get("state")).status,401);
    assert.equal((await post("send","alice",b.csrf,{channelId:channel,content:"Falscher Token"})).status,403);
    const chatUpload=await (await post("upload-begin","alice",a.csrf,{channelId:channel,name:"test.html",size:6})).json();
    assert.equal(chatUpload.ok,true);
    const chunk=(user:string,csrf:string)=>new NextRequest(`${origin}/api/chat?action=upload-chunk&id=${chatUpload.id}&part=0`,{method:"POST",headers:{origin,"content-type":"application/octet-stream","x-chat-csrf":csrf,"x-test-user":user},body:"<html>"});
    assert.equal((await handlers.POST(chunk("bob",b.csrf))).status,404);
    assert.equal((await handlers.POST(chunk("alice",a.csrf))).status,200);
    assert.equal((await post("upload-finish","alice",a.csrf,{id:chatUpload.id})).status,200);
    assert.equal((await get("attachment","bob",{id:chatUpload.id})).status,403);
    assert.equal((await post("send","alice",a.csrf,{channelId:channel,content:"Anhang",attachmentId:chatUpload.id})).status,200);
    const downloaded=await get("attachment","bob",{id:chatUpload.id});
    assert.equal(downloaded.status,200); assert.match(downloaded.headers.get("content-disposition")!,/^attachment/); assert.equal(await downloaded.text(),"<html>");
    await createCloudDirectory("",folder);
    const bytes=Buffer.alloc(5*CHUNK_BYTES+13,123);
    const pending=await beginCloudUpload(folder,"grosser-test.bin",bytes.length,owner);
    await assert.rejects(()=>writeChunk(pending.id,"cloud","other",0,bytes.subarray(0,CHUNK_BYTES)),/nicht gefunden/);
    await assert.rejects(()=>finishCloudUpload(pending.id,owner),/nicht vollständig/);
    await assert.rejects(()=>writeChunk(pending.id,"cloud",owner,0,Buffer.from("too short")),/Ungültiger/);
    for(let offset=0;offset<bytes.length;offset+=CHUNK_BYTES) await writeChunk(pending.id,"cloud",owner,offset/CHUNK_BYTES,bytes.subarray(offset,offset+CHUNK_BYTES));
    await writeChunk(pending.id,"cloud",owner,0,bytes.subarray(0,CHUNK_BYTES)); // Idempotent retry.
    await finishCloudUpload(pending.id,owner);
    assert.equal((await listCloudDirectory(folder)).entries[0].size,bytes.length);
    assert.deepEqual(Buffer.from(await new Response((await openCloudFile(`${folder}/grosser-test.bin`)).stream).arrayBuffer()),bytes);
    const duplicates=await Promise.all([beginCloudUpload(folder,"leer.txt",0,owner),beginCloudUpload(folder,"leer.txt",0,owner)]);
    await Promise.all(duplicates.map(file=>finishCloudUpload(file.id,owner)));
    assert.deepEqual((await listCloudDirectory(folder)).entries.map(row=>row.name),["grosser-test.bin","leer (1).txt","leer.txt"]);
    const zip=await createCloudZip([folder,`${folder}/grosser-test.bin`]);
    const archive=Buffer.from(await new Response(zip.stream).arrayBuffer());assert.equal(archive.readUInt32LE(0),0x04034b50);
    const cancelled=await beginFile("cloud",owner,"cancel.txt",1,"text/plain",{path:folder}); await cancelFile(cancelled.id,"cloud",owner);
    await assert.rejects(()=>readFile(cancelled.id),/nicht gefunden/);
    await assert.rejects(()=>beginCloudUpload("../outside","test.txt",1,owner));
  } finally {
    // Only the uniquely named fixtures created by this test are removed.
    await deleteCloudPath(folder).catch(()=>{});
    await query("DELETE FROM academy_exchange.messages WHERE \"authorId\"=ANY($1)",[[alice,bob]]);
    await query("DELETE FROM academy_exchange.calls WHERE \"profileId\"=ANY($1)",[[alice,bob]]);
    await query("DELETE FROM academy_exchange.servers WHERE \"ownerId\"=ANY($1)",[[alice,bob]]);
    await query("DELETE FROM academy_exchange.members WHERE \"profileId\"=ANY($1)",[[alice,bob]]);
    await query("DELETE FROM academy_exchange.files WHERE owner=ANY($1)",[[alice,bob,owner]]);
    await query("DELETE FROM academy_exchange.profiles WHERE id=ANY($1)",[[alice,bob]]);
    await query("DELETE FROM academy_exchange.rate_limits WHERE key LIKE $1",[`%${suffix}%`]);
    await closeExchangeDatabase();
  }
});
