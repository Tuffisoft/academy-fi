import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

export class ChatError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
type Row = Record<string, string | number | null>;
export type Profile = { id: string; name: string; lastSeen: number };
export type Target = { channelId?: string; memberId?: string };
type MessageRow = { seq: number; id: string; content: string; authorId: string; authorName: string; channelId: string | null; dmKey: string | null; attachmentId: string | null; fileName: string | null; fileSize: number | null; fileMime: string | null; deleted: number; createdAt: number; editedAt: number | null };
export const DEFAULT_SERVER = "academy-fi";
export const DEFAULT_CHANNEL = "allgemein";
const uuid = () => randomUUID();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const csrfFor = (token: string) => digest(`${token}:academy-chat-csrf`);
export function cleanName(value: unknown, label = "Name", maximum = 48) {
  if (typeof value !== "string") throw new ChatError(`${label} fehlt.`);
  const result = value.normalize("NFC").trim();
  if (!result || result.length > maximum || /[\u0000-\u001f\u007f-\u009f]/.test(result)) throw new ChatError(`${label} muss 1 bis ${maximum} Zeichen enthalten.`);
  return result;
}
function content(value: unknown) {
  if (typeof value !== "string" || value.length > 4000 || /\u0000/.test(value)) throw new ChatError("Eine Nachricht darf höchstens 4000 Zeichen enthalten.");
  return value.trim();
}
export function chatDirectory() {
  const directory = process.env.CHAT_STORAGE_DIR || path.join(process.cwd(), ".chat-data");
  if (!path.isAbsolute(directory)) throw new ChatError("CHAT_STORAGE_DIR muss ein absoluter Pfad sein.", 500);
  return directory;
}

export function createChatStorage(directory = chatDirectory()) {
  if (!path.isAbsolute(directory)) throw new ChatError("Der Chat-Speicher benötigt einen absoluten Pfad.", 500);
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "chat.sqlite"), { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0);
    INSERT OR IGNORE INTO meta(id) VALUES(1);
    CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, sessionHash TEXT UNIQUE NOT NULL, lastSeen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, name TEXT NOT NULL, ownerId TEXT REFERENCES profiles(id), inviteCode TEXT UNIQUE NOT NULL, createdAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS members (serverId TEXT REFERENCES servers(id) ON DELETE CASCADE, profileId TEXT REFERENCES profiles(id), role TEXT NOT NULL DEFAULT 'GUEST', PRIMARY KEY(serverId, profileId));
    CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, serverId TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE, name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('TEXT','AUDIO','VIDEO')), creatorId TEXT REFERENCES profiles(id), createdAt INTEGER NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS channel_names ON channels(serverId,name COLLATE NOCASE);
    CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, ownerId TEXT NOT NULL REFERENCES profiles(id), channelId TEXT REFERENCES channels(id) ON DELETE CASCADE, dmKey TEXT, createdAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, content TEXT NOT NULL, authorId TEXT NOT NULL REFERENCES profiles(id), channelId TEXT REFERENCES channels(id) ON DELETE CASCADE, dmKey TEXT, attachmentId TEXT UNIQUE REFERENCES attachments(id), deleted INTEGER NOT NULL DEFAULT 0, createdAt INTEGER NOT NULL, editedAt INTEGER, CHECK((channelId IS NULL) != (dmKey IS NULL)));
    CREATE INDEX IF NOT EXISTS channel_messages ON messages(channelId,seq);
    CREATE INDEX IF NOT EXISTS direct_messages ON messages(dmKey,seq);
    CREATE TABLE IF NOT EXISTS calls (roomId TEXT NOT NULL, profileId TEXT NOT NULL REFERENCES profiles(id), clientId TEXT NOT NULL, lastSeen INTEGER NOT NULL, PRIMARY KEY(roomId,profileId,clientId));
    CREATE TABLE IF NOT EXISTS signals (seq INTEGER PRIMARY KEY AUTOINCREMENT, roomId TEXT NOT NULL, senderId TEXT NOT NULL, senderClient TEXT NOT NULL, recipientId TEXT NOT NULL, recipientClient TEXT NOT NULL, payload TEXT NOT NULL, createdAt INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, window INTEGER NOT NULL);
  `);
  const query = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).all(...args) as Row[];
  const one = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).get(...args) as Row | undefined;
  const run = (sql: string, ...args: SQLInputValue[]) => db.prepare(sql).run(...args);
  const bump = () => run("UPDATE meta SET revision=revision+1 WHERE id=1");
  function transaction<T>(callback: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try { const result = callback(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  transaction(() => {
    run("INSERT OR IGNORE INTO servers VALUES(?,?,?,?,?)", DEFAULT_SERVER, "Academy Fi", null, randomBytes(16).toString("hex"), Date.now());
    run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", DEFAULT_CHANNEL, DEFAULT_SERVER, "allgemein", "TEXT", null, Date.now());
    run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "austausch", DEFAULT_SERVER, "austausch", "TEXT", null, Date.now());
    run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "sprachraum", DEFAULT_SERVER, "sprachraum", "AUDIO", null, Date.now());
    run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "videoraum", DEFAULT_SERVER, "videoraum", "VIDEO", null, Date.now());
  });
  function rateLimit(key: string, maximum = 45, seconds = 60) {
    const now = Math.floor(Date.now() / (seconds * 1000));
    transaction(() => {
      run("INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END, window=excluded.window", key, now);
      if (Number(one("SELECT count FROM rate_limits WHERE key=?", key)?.count) > maximum) throw new ChatError("Bitte warte einen Moment und versuche es erneut.", 429);
    });
  }
  function syncProfile(user: { id: string; name: string; role?: string | null }): Profile {
    const valid = cleanName(user.name, "Kontoname", 128);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(user.id)) throw new ChatError("Das Benutzerkonto hat eine ungültige Kennung.", 500);
    return transaction(() => {
      const existing = one("SELECT name FROM profiles WHERE id=?", user.id);
      run("INSERT INTO profiles VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,lastSeen=excluded.lastSeen", user.id, valid, digest(`site:${user.id}`), Date.now());
      const role = user.role === "OWNER" ? "MODERATOR" : "GUEST";
      const existingRole = one("SELECT role FROM members WHERE serverId=? AND profileId=?", DEFAULT_SERVER, user.id)?.role;
      run("INSERT INTO members VALUES(?,?,?) ON CONFLICT(serverId,profileId) DO UPDATE SET role=excluded.role", DEFAULT_SERVER, user.id, role);
      if (!existing || existing.name !== valid || existingRole !== role) bump();
      return { id: user.id, name: valid, lastSeen: Date.now() };
    });
  }
  function membership(profileId: string, serverId: string) {
    const member = one("SELECT m.*,s.ownerId FROM members m JOIN servers s ON s.id=m.serverId WHERE m.profileId=? AND m.serverId=?", profileId, serverId);
    if (!member) throw new ChatError("Du bist nicht Mitglied dieses Servers.", 403);
    return member;
  }
  function canManage(profileId: string, serverId: string, creatorId?: string | null) {
    const member = membership(profileId, serverId);
    return member.role === "ADMIN" || member.role === "MODERATOR" || (member.ownerId === null && (!creatorId || creatorId === profileId));
  }
  function targetFor(profileId: string, target: Target) {
    if (target.channelId && target.memberId) throw new ChatError("Wähle einen Kanal oder eine Direktnachricht.");
    if (target.channelId) {
      const channel = one("SELECT * FROM channels WHERE id=?", target.channelId);
      if (!channel) throw new ChatError("Der Kanal wurde nicht gefunden.", 404);
      membership(profileId, String(channel.serverId));
      return { channelId: String(channel.id), dmKey: null, roomId: `channel:${channel.id}`, channel };
    }
    if (!target.memberId || target.memberId === profileId) throw new ChatError("Wähle ein anderes Mitglied.");
    const shared = one("SELECT 1 FROM members a JOIN members b ON a.serverId=b.serverId WHERE a.profileId=? AND b.profileId=?", profileId, target.memberId);
    if (!shared) throw new ChatError("Direktnachrichten sind nur zwischen Mitgliedern gemeinsamer Server möglich.", 403);
    const dmKey = [profileId, target.memberId].sort().join(":");
    return { channelId: null, dmKey, roomId: `direct:${dmKey}`, channel: null };
  }
  function snapshot(profileId: string) {
    const servers = query("SELECT s.*,m.role FROM servers s JOIN members m ON m.serverId=s.id WHERE m.profileId=? ORDER BY s.createdAt", profileId);
    const channels = query("SELECT c.* FROM channels c JOIN members m ON m.serverId=c.serverId WHERE m.profileId=? ORDER BY c.createdAt,c.name", profileId);
    const members = query("SELECT m.serverId,m.role,p.id,p.name,p.lastSeen FROM members m JOIN profiles p ON p.id=m.profileId WHERE m.serverId IN (SELECT serverId FROM members WHERE profileId=?) ORDER BY p.name", profileId);
    const directs = query("SELECT p.id,p.name,p.lastSeen,MAX(msg.seq) AS lastSequence FROM profiles p JOIN messages msg ON msg.dmKey IS NOT NULL AND (msg.dmKey=? || ':' || p.id OR msg.dmKey=p.id || ':' || ?) WHERE p.id != ? GROUP BY p.id ORDER BY lastSequence DESC", profileId, profileId, profileId);
    return { servers, channels, members, directs, revision: revision() };
  }
  function messages(profileId: string, target: Target, before = 0) {
    const resolved = targetFor(profileId, target);
    const rows = query(`SELECT m.*,p.name AS authorName,a.name AS fileName,a.size AS fileSize,a.mime AS fileMime FROM messages m JOIN profiles p ON p.id=m.authorId LEFT JOIN attachments a ON a.id=m.attachmentId WHERE ${resolved.channelId ? "m.channelId=?" : "m.dmKey=?"} AND (?=0 OR m.seq<?) ORDER BY m.seq DESC LIMIT 61`, resolved.channelId || resolved.dmKey, before, before) as unknown as MessageRow[];
    const hasMore = rows.length > 60;
    const result = rows.slice(0, 60).reverse().map(row => ({...row, deleted: Boolean(row.deleted), content: row.deleted ? "" : row.content, attachmentId: row.deleted ? null : row.attachmentId}));
    return { messages: result, hasMore, revision: revision() };
  }
  function send(profileId: string, target: Target, value: unknown, attachmentId?: string) {
    const text = content(value ?? "");
    if (!text && !attachmentId) throw new ChatError("Die Nachricht ist leer.");
    return transaction(() => {
      const resolved = targetFor(profileId, target);
      if (attachmentId) {
        const attachment = one("SELECT * FROM attachments WHERE id=? AND ownerId=?", attachmentId, profileId);
        if (!attachment || attachment.channelId !== resolved.channelId || attachment.dmKey !== resolved.dmKey || one("SELECT 1 FROM messages WHERE attachmentId=?", attachmentId)) throw new ChatError("Der Anhang gehört nicht zu diesem Chat.", 403);
      }
      const id = uuid();
      run("INSERT INTO messages(id,content,authorId,channelId,dmKey,attachmentId,createdAt) VALUES(?,?,?,?,?,?,?)", id, text, profileId, resolved.channelId, resolved.dmKey, attachmentId || null, Date.now());
      bump(); return { id };
    });
  }
  function editMessage(profileId: string, messageId: string, value: unknown, remove = false) {
    return transaction(() => {
      const message = one("SELECT * FROM messages WHERE id=?", messageId);
      if (!message) throw new ChatError("Nachricht nicht gefunden.", 404);
      const own = message.authorId === profileId;
      let moderator = false;
      if (message.channelId) {
        const channel = one("SELECT serverId FROM channels WHERE id=?", message.channelId);
        const member = membership(profileId, String(channel?.serverId));
        moderator = member.role === "ADMIN" || member.role === "MODERATOR";
      }
      if (!own && !(remove && moderator)) throw new ChatError("Du darfst diese Nachricht nicht ändern.", 403);
      if (message.deleted) throw new ChatError("Diese Nachricht wurde bereits gelöscht.", 409);
      const text = remove ? "" : content(value);
      if (!remove && !text) throw new ChatError("Die Nachricht ist leer.");
      run("UPDATE messages SET content=?,deleted=?,editedAt=? WHERE id=?", text, remove ? 1 : 0, Date.now(), messageId);
      bump(); return { id: messageId };
    });
  }
  function createServer(profileId: string, name: unknown) {
    return transaction(() => {
      if (Number(one("SELECT count(*) AS n FROM servers WHERE ownerId=?", profileId)?.n) >= 20) throw new ChatError("Du kannst höchstens 20 Server erstellen.");
      const id = uuid(); const now = Date.now();
      run("INSERT INTO servers VALUES(?,?,?,?,?)", id, cleanName(name, "Servername"), profileId, randomBytes(16).toString("hex"), now);
      run("INSERT INTO members VALUES(?,?,'ADMIN')", id, profileId);
      run("INSERT INTO channels VALUES(?,?,?,?,?,?)", uuid(), id, "allgemein", "TEXT", profileId, now);
      bump(); return { id };
    });
  }
  function joinServer(profileId: string, invite: unknown) {
    return transaction(() => {
      if (typeof invite !== "string") throw new ChatError("Einladung fehlt.");
      const server = one("SELECT id FROM servers WHERE inviteCode=?", invite);
      if (!server) throw new ChatError("Diese Einladung ist ungültig.", 404);
      run("INSERT OR IGNORE INTO members VALUES(?,?,'GUEST')", server.id, profileId);
      bump(); return { id: server.id };
    });
  }
  function updateServer(profileId: string, id: string, action: string, name?: unknown) {
    return transaction(() => {
      const member = membership(profileId, id);
      if (action === "leave") {
        if (id === DEFAULT_SERVER || member.role === "ADMIN") throw new ChatError("Den allgemeinen oder deinen eigenen Server kannst du nicht verlassen.");
        run("DELETE FROM members WHERE serverId=? AND profileId=?", id, profileId);
      } else {
        if (member.role !== "ADMIN") throw new ChatError("Nur der Serverinhaber darf das ändern.", 403);
        if (action === "rename") run("UPDATE servers SET name=? WHERE id=?", cleanName(name, "Servername"), id);
        else if (action === "invite") run("UPDATE servers SET inviteCode=? WHERE id=?", randomBytes(16).toString("hex"), id);
        else if (action === "delete") run("DELETE FROM servers WHERE id=?", id);
        else throw new ChatError("Unbekannte Serveraktion.");
      }
      bump(); return { id };
    });
  }
  function changeMember(profileId: string, serverId: string, memberId: string, role: string) {
    return transaction(() => {
      if (membership(profileId, serverId).role !== "ADMIN" || profileId === memberId) throw new ChatError("Nur der Serverinhaber darf andere Mitglieder verwalten.", 403);
      if (!new Set(["GUEST", "MODERATOR", "REMOVE"]).has(role)) throw new ChatError("Ungültige Rolle.");
      if (role === "REMOVE") run("DELETE FROM members WHERE serverId=? AND profileId=?", serverId, memberId);
      else run("UPDATE members SET role=? WHERE serverId=? AND profileId=?", role, serverId, memberId);
      bump(); return {};
    });
  }
  function createChannel(profileId: string, serverId: string, name: unknown, type: string) {
    return transaction(() => {
      if (!canManage(profileId, serverId)) throw new ChatError("Du darfst hier keine Kanäle erstellen.", 403);
      if (!new Set(["TEXT", "AUDIO", "VIDEO"]).has(type)) throw new ChatError("Ungültiger Kanaltyp.");
      if (Number(one("SELECT count(*) AS n FROM channels WHERE serverId=?", serverId)?.n) >= 100) throw new ChatError("Ein Server kann höchstens 100 Kanäle enthalten.");
      const valid = cleanName(name, "Kanalname").replace(/\s+/g, "-").toLowerCase();
      if (one("SELECT 1 FROM channels WHERE serverId=? AND name=? COLLATE NOCASE", serverId, valid)) throw new ChatError("Dieser Kanalname ist bereits vergeben.", 409);
      const id = uuid(); run("INSERT INTO channels VALUES(?,?,?,?,?,?)", id, serverId, valid, type, profileId, Date.now());
      bump(); return { id };
    });
  }
  function updateChannel(profileId: string, id: string, name?: unknown, remove = false) {
    return transaction(() => {
      const channel = one("SELECT * FROM channels WHERE id=?", id);
      if (!channel) throw new ChatError("Kanal nicht gefunden.", 404);
      if (!canManage(profileId, String(channel.serverId), channel.creatorId as string | null)) throw new ChatError("Du darfst diesen Kanal nicht ändern.", 403);
      if (channel.id === DEFAULT_CHANNEL || channel.creatorId === null) throw new ChatError("Die Standardkanäle bleiben bestehen.");
      if (remove) {
        run("DELETE FROM calls WHERE roomId=?", `channel:${id}`);
        run("DELETE FROM channels WHERE id=?", id);
      } else {
        const valid = cleanName(name, "Kanalname").replace(/\s+/g, "-").toLowerCase();
        if (one("SELECT 1 FROM channels WHERE serverId=? AND name=? COLLATE NOCASE AND id!=?", channel.serverId, valid, id)) throw new ChatError("Dieser Kanalname ist bereits vergeben.", 409);
        run("UPDATE channels SET name=? WHERE id=?", valid, id);
      }
      bump(); return { id };
    });
  }
  function addAttachment(profileId: string, target: Target, id: string, name: string, mime: string, size: number) {
    const resolved = targetFor(profileId, target);
    run("INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?)", id, name, mime, size, profileId, resolved.channelId, resolved.dmKey, Date.now());
  }
  function attachment(profileId: string, id: string) {
    const row = one("SELECT * FROM attachments WHERE id=?", id);
    if (!row) throw new ChatError("Anhang nicht gefunden.", 404);
    if (row.ownerId === profileId) return row;
    const message = one("SELECT 1 FROM messages WHERE attachmentId=? AND deleted=0", id);
    if (!message) throw new ChatError("Du kannst diesen Anhang nicht öffnen.", 403);
    if (row.channelId) targetFor(profileId, { channelId: String(row.channelId) });
    else if (!String(row.dmKey).split(":").includes(profileId)) throw new ChatError("Du kannst diesen Anhang nicht öffnen.", 403);
    return row;
  }
  const revision = () => Number(one("SELECT revision FROM meta WHERE id=1")?.revision || 0);
  function touch(profileId: string) { run("UPDATE profiles SET lastSeen=? WHERE id=?", Date.now(), profileId); }
  function call(profileId: string, target: Target, clientId: string, action: string, after = 0) {
    const resolved = targetFor(profileId, target);
    if (!["join", "heartbeat", "leave"].includes(action) || !Number.isSafeInteger(after) || after < 0) throw new ChatError("Ungültige Anrufaktion.");
    if (!/^[a-f0-9-]{36}$/.test(clientId)) throw new ChatError("Ungültige Verbindung.");
    return transaction(() => {
      run("DELETE FROM calls WHERE lastSeen<?", Date.now() - 25_000);
      run("DELETE FROM signals WHERE createdAt<?", Date.now() - 60_000);
      if (action === "leave") run("DELETE FROM calls WHERE roomId=? AND profileId=? AND clientId=?", resolved.roomId, profileId, clientId);
      else {
        if (Number(one("SELECT count(*) AS n FROM calls WHERE roomId=? AND NOT(profileId=? AND clientId=?)", resolved.roomId, profileId, clientId)?.n) >= 8) throw new ChatError("Dieser Raum ist voll (maximal 8 Verbindungen).", 409);
        run("INSERT INTO calls VALUES(?,?,?,?) ON CONFLICT(roomId,profileId,clientId) DO UPDATE SET lastSeen=excluded.lastSeen", resolved.roomId, profileId, clientId, Date.now());
      }
      const peers = query("SELECT c.profileId,c.clientId,p.name FROM calls c JOIN profiles p ON p.id=c.profileId WHERE c.roomId=? AND NOT(c.profileId=? AND c.clientId=?)", resolved.roomId, profileId, clientId);
      const signals = query("SELECT seq,senderId,senderClient,payload FROM signals WHERE roomId=? AND recipientId=? AND recipientClient=? AND seq>? ORDER BY seq LIMIT 100", resolved.roomId, profileId, clientId, after).map(row => ({ seq: Number(row.seq), senderId: String(row.senderId), senderClient: String(row.senderClient), payload: JSON.parse(String(row.payload)) as Record<string, unknown> }));
      return { peers, signals };
    });
  }
  function signal(profileId: string, target: Target, clientId: string, recipientId: string, recipientClient: string, payload: unknown) {
    const resolved = targetFor(profileId, target);
    const encoded = JSON.stringify(payload);
    if (!encoded || encoded.length > 32_000 || !payload || typeof payload !== "object") throw new ChatError("Ungültige Verbindungsdaten.");
    const data = payload as Record<string, unknown>;
    if (!new Set(["offer", "answer", "candidate"]).has(String(data.type))) throw new ChatError("Ungültige Verbindungsdaten.");
    if (!one("SELECT 1 FROM calls WHERE roomId=? AND profileId=? AND clientId=? AND lastSeen>?", resolved.roomId, profileId, clientId, Date.now() - 25_000) || !one("SELECT 1 FROM calls WHERE roomId=? AND profileId=? AND clientId=? AND lastSeen>?", resolved.roomId, recipientId, recipientClient, Date.now() - 25_000)) throw new ChatError("Die andere Verbindung ist nicht mehr aktiv.", 409);
    run("INSERT INTO signals(roomId,senderId,senderClient,recipientId,recipientClient,payload,createdAt) VALUES(?,?,?,?,?,?,?)", resolved.roomId, profileId, clientId, recipientId, recipientClient, encoded, Date.now());
    return {};
  }
  return { directory, db, rateLimit, syncProfile, targetFor, membership, snapshot, messages, send, editMessage, createServer, joinServer, updateServer, changeMember, createChannel, updateChannel, addAttachment, attachment, revision, touch, call, signal, close: () => db.close() };
}

// Next development reloads share one connection; SQLite also serializes separate processes.
const cache = globalThis as typeof globalThis & { academyChatStores?: Map<string, ReturnType<typeof createChatStorage>> };
export function chatStorage() {
  const directory = chatDirectory();
  cache.academyChatStores ??= new Map();
  let storage = cache.academyChatStores.get(directory);
  if (!storage) { storage = createChatStorage(directory); cache.academyChatStores.set(directory, storage); }
  return storage;
}
