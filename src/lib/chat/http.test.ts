import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { createChatHandlers } from "./http";
import { chatStorage } from "./storage";

let directory: string;
before(async()=>{ directory=await mkdtemp(path.join(os.tmpdir(),"academy-chat-http-test-")); process.env.CHAT_STORAGE_DIR=directory; });
const fixtures = {
  alice: {user:{id:"test-alice",name:"Testkonto Alice"},session:{token:"test-session-alice"}},
  bob: {user:{id:"test-bob",name:"Testkonto Bob"},session:{token:"test-session-bob"}},
};
// Injection is confined to tests. The production route always uses Better Auth.
const handlers=createChatHandlers(async request=>fixtures[request.headers.get("x-test-user") as keyof typeof fixtures] || null);
const origin="http://localhost:3002";
async function get(action:string,user="",params:Record<string,string>={}) {
  return handlers.GET(new NextRequest(`${origin}/api/chat?${new URLSearchParams({action,...params})}`,{headers:{"x-test-user":user}}));
}
async function post(action:string,user:string,csrf:string,body:unknown,site=origin) {
  return handlers.POST(new NextRequest(`${origin}/api/chat?action=${action}`,{method:"POST",headers:{origin:site,"x-test-user":user,"x-chat-csrf":csrf,"content-type":"application/json"},body:JSON.stringify(body)}));
}
after(async()=>{chatStorage().close();const relative=path.relative(os.tmpdir(),directory);assert.ok(relative.startsWith("academy-chat-http-test-")&&!relative.includes(".."));await rm(directory,{recursive:true,force:true});});
test("existing website authentication, CSRF and origins guard all chat data and writes",async()=>{
  assert.equal((await get("session").then(response=>response.json())).profile,null);
  assert.equal((await get("state")).status,401);
  assert.equal((await post("send","","",{channelId:"allgemein",content:"Nicht angemeldet"})).status,401);
  const a=await (await get("session","alice")).json();const b=await (await get("session","bob")).json();
  assert.equal(a.profile.id,fixtures.alice.user.id);assert.notEqual(a.csrf,b.csrf);
  assert.equal((await post("send","alice",b.csrf,{channelId:"allgemein",content:"Falscher Token"})).status,403);
  assert.equal((await post("send","alice",a.csrf,{channelId:"allgemein",content:"Falscher Ursprung"},"https://example.com")).status,403);
  const sent=await (await post("send","alice",a.csrf,{channelId:"allgemein",content:"Hallo aus dem Website-Konto"})).json();
  assert.equal(sent.ok,true);
  const messages=await (await get("messages","bob",{channelId:"allgemein"})).json();assert.equal(messages.messages[0].id,sent.result.id);
  assert.equal((await post("edit-message","bob",b.csrf,{id:sent.result.id,content:"Übernommen"})).status,403);
  assert.equal((await post("edit-message","alice",a.csrf,{id:sent.result.id,content:"Bearbeitet"})).status,200);
});
test("uploads are bound to a chat and active HTML is forced to download",async()=>{
  const a=await (await get("session","alice")).json();
  const form=new FormData();form.append("channelId","allgemein");form.append("file",new File(["<script>alert(1)</script>"],"Test.html",{type:"text/html"}));
  const response=await handlers.POST(new NextRequest(`${origin}/api/chat?action=upload`,{method:"POST",headers:{origin,"x-test-user":"alice","x-chat-csrf":a.csrf},body:form}));
  assert.equal(response.status,200);const file=(await response.json()).attachment;
  assert.equal((await get("attachment","bob",{id:file.id})).status,403);
  await post("send","alice",a.csrf,{channelId:"allgemein",content:"Anhang",attachmentId:file.id});
  const downloaded=await get("attachment","bob",{id:file.id});assert.equal(downloaded.status,200);assert.match(downloaded.headers.get("content-disposition")!,/^attachment/);assert.equal(downloaded.headers.get("content-type"),"application/octet-stream");assert.equal(await downloaded.text(),"<script>alert(1)</script>");
  assert.equal((await get("attachment","",{id:file.id})).status,401);
  assert.equal((await get("attachment","alice",{id:"../../outside"})).status,400);
});
test("live events publish revisions and close when canceled",async()=>{
  const response=await get("events","alice");assert.equal(response.headers.get("content-type"),"text/event-stream");
  const reader=response.body!.getReader();const event=await reader.read();assert.match(new TextDecoder().decode(event.value),/^data: \{"revision":\d+\}\n\n$/);await reader.cancel();
});
