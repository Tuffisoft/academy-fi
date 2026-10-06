import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import { createChatStorage, ChatError, DEFAULT_CHANNEL, DEFAULT_SERVER } from "./storage";

let directory: string;
let storage: ReturnType<typeof createChatStorage>;
const alice = { id: "test-alice", name: "Testkonto Alice" };
const bob = { id: "test-bob", name: "Testkonto Bob" };
const carol = { id: "test-carol", name: "Testkonto Carol" };
const status = (expected: number) => (error: unknown) => error instanceof ChatError && error.status === expected;
beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "academy-chat-test-"));
  storage = createChatStorage(directory);
  [alice,bob,carol].forEach(profile => storage.syncProfile(profile));
});
afterEach(async () => {
  storage.close();
  const relative = path.relative(os.tmpdir(), directory);
  assert.ok(!path.isAbsolute(relative) && !relative.startsWith("..") && relative.startsWith("academy-chat-test-"));
  await rm(directory, {recursive:true,force:true});
});

test("website identities remain stable and messages persist through reopening and a second connection", () => {
  const sent=storage.send(alice.id,{channelId:DEFAULT_CHANNEL},"Hallo Bob! 💚");
  const second=createChatStorage(directory);
  assert.equal(second.messages(bob.id,{channelId:DEFAULT_CHANNEL}).messages[0].id,sent.id);
  second.send(bob.id,{channelId:DEFAULT_CHANNEL},"Hallo Alice!");second.close();
  storage.syncProfile({...alice,name:"Alice umbenannt"});
  assert.equal(storage.messages(bob.id,{channelId:DEFAULT_CHANNEL}).messages[0].authorName,"Alice umbenannt");
  storage.close();storage=createChatStorage(directory);
  assert.equal(storage.messages(bob.id,{channelId:DEFAULT_CHANNEL}).messages.length,2);
  assert.equal(storage.snapshot(alice.id).members.filter(member=>member.id===alice.id).length,1);
});
test("private servers require membership and invitations; guests cannot administer them", () => {
  const server=storage.createServer(alice.id,"Projektteam");
  const channel=storage.snapshot(alice.id).channels.find(item=>item.serverId===server.id)!;
  assert.throws(()=>storage.messages(bob.id,{channelId:String(channel.id)}),status(403));
  const invite=storage.snapshot(alice.id).servers.find(item=>item.id===server.id)!.inviteCode;
  storage.joinServer(bob.id,invite);
  storage.send(bob.id,{channelId:String(channel.id)},"Nur für unser Team");
  assert.throws(()=>storage.createChannel(bob.id,server.id,"test","TEXT"),status(403));
  assert.throws(()=>storage.updateServer(bob.id,server.id,"rename","Übernommen"),status(403));
  storage.changeMember(alice.id,server.id,bob.id,"MODERATOR");
  storage.createChannel(bob.id,server.id,"planung","TEXT");
  storage.changeMember(alice.id,server.id,bob.id,"REMOVE");
  assert.throws(()=>storage.messages(bob.id,{channelId:String(channel.id)}),status(403));
  storage.updateServer(alice.id,server.id,"invite");
  assert.throws(()=>storage.joinServer(carol.id,invite),status(404));
});
test("direct messages and attachments are isolated; edits and deletion require ownership", () => {
  const message=storage.send(alice.id,{memberId:bob.id},"Privat");
  assert.equal(storage.messages(bob.id,{memberId:alice.id}).messages[0].id,message.id);
  assert.equal(storage.messages(carol.id,{memberId:alice.id}).messages.length,0);
  assert.throws(()=>storage.editMessage(carol.id,message.id,"Übernommen"),status(403));
  storage.editMessage(alice.id,message.id,"Bearbeitet");
  const file=randomUUID();storage.addAttachment(alice.id,{memberId:bob.id},file,"Dokument.txt","application/octet-stream",5);
  assert.throws(()=>storage.attachment(bob.id,file),status(403));
  storage.send(alice.id,{memberId:bob.id},"",file);
  assert.equal(storage.attachment(bob.id,file).name,"Dokument.txt");
  assert.throws(()=>storage.attachment(carol.id,file),status(403));
  assert.throws(()=>storage.send(carol.id,{memberId:alice.id},"",file),status(403));
  assert.throws(()=>storage.send(alice.id,{channelId:DEFAULT_CHANNEL},"",file),status(403));
  assert.throws(()=>storage.send(alice.id,{memberId:bob.id},"",file),status(403));
  storage.editMessage(alice.id,message.id,"",true);
  assert.equal(storage.messages(bob.id,{memberId:alice.id}).messages[0].deleted,true);
});
test("channel changes protect standard channels and content validation and history pagination work", () => {
  const channel=storage.createChannel(alice.id,DEFAULT_SERVER,"Meine Planung","TEXT");
  assert.throws(()=>storage.createChannel(bob.id,DEFAULT_SERVER,"MEINE-PLANUNG","TEXT"),status(409));
  assert.throws(()=>storage.updateChannel(bob.id,channel.id,"übernommen"),status(403));
  assert.throws(()=>storage.updateChannel(alice.id,DEFAULT_CHANNEL,"neu"),status(400));
  assert.throws(()=>storage.send(alice.id,{channelId:channel.id}," "),status(400));
  assert.throws(()=>storage.send(alice.id,{channelId:channel.id},"x".repeat(4001)),status(400));
  for(let index=0;index<72;index++)storage.send(alice.id,{channelId:channel.id},`Nachricht ${index}`);
  const recent=storage.messages(bob.id,{channelId:channel.id});
  assert.equal(recent.messages.length,60);assert.equal(recent.hasMore,true);
  const older=storage.messages(bob.id,{channelId:channel.id},Number(recent.messages[0].seq));
  assert.equal(older.messages.length,12);assert.equal(older.hasMore,false);
  storage.updateChannel(alice.id,channel.id,"neu");
  storage.updateChannel(alice.id,channel.id,undefined,true);
  assert.throws(()=>storage.messages(bob.id,{channelId:channel.id}),status(404));
});
test("call signaling reaches only the chosen participants in the authorized room", () => {
  const a=randomUUID(),b=randomUUID(),c=randomUUID();
  storage.call(alice.id,{channelId:"sprachraum"},a,"join");
  storage.call(bob.id,{channelId:"sprachraum"},b,"join");
  storage.call(carol.id,{channelId:"videoraum"},c,"join");
  assert.throws(()=>storage.signal(alice.id,{channelId:"sprachraum"},a,carol.id,c,{type:"offer",sdp:"test"}),status(409));
  storage.signal(alice.id,{channelId:"sprachraum"},a,bob.id,b,{type:"offer",sdp:"test"});
  const incoming=storage.call(bob.id,{channelId:"sprachraum"},b,"heartbeat");
  assert.equal(incoming.signals.length,1);assert.equal(incoming.peers.length,1);
  assert.equal(storage.call(bob.id,{channelId:"sprachraum"},b,"heartbeat",Number(incoming.signals[0].seq)).signals.length,0);
  storage.call(alice.id,{channelId:"sprachraum"},a,"leave");
  assert.equal(storage.call(bob.id,{channelId:"sprachraum"},b,"heartbeat").peers.length,0);
});
test("website owners moderate the common chat, while ordinary accounts cannot delete other messages", () => {
  const message=storage.send(bob.id,{channelId:DEFAULT_CHANNEL},"Nachricht");
  assert.throws(()=>storage.editMessage(alice.id,message.id,"",true),status(403));
  storage.syncProfile({...alice,role:"OWNER"});
  storage.editMessage(alice.id,message.id,"",true);
  assert.equal(storage.messages(bob.id,{channelId:DEFAULT_CHANNEL}).messages[0].deleted,true);
  storage.syncProfile({...alice,role:"INTERN"});
  const second=storage.send(bob.id,{channelId:DEFAULT_CHANNEL},"Weitere Nachricht");
  assert.throws(()=>storage.editMessage(alice.id,second.id,"",true),status(403));
});
