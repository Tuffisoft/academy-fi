import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query as pgQuery, transaction, databaseReady } from "@/lib/exchange/database";
import { ChatError, cleanName, DEFAULT_CHANNEL, DEFAULT_SERVER, type Profile, type Target } from "./storage";
type Row = Record<string, string | number | null>;
type MessageRow = { seq: number; id: string; content: string; authorId: string; authorName: string; channelId: string | null; dmKey: string | null; attachmentId: string | null; fileName: string | null; fileSize: number | null; fileMime: string | null; deleted: number; createdAt: number; editedAt: number | null };
const uuid = () => randomUUID();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function content(value: unknown) {
  if (typeof value !== "string" || value.length > 4000 || /\u0000/.test(value)) throw new ChatError("Eine Nachricht darf höchstens 4000 Zeichen enthalten.");
  return value.trim();
}
// Translate the existing, fixed SQL statements; never interpolate request values.
function sqlForPostgres(sql: string) {
  const ignored = /INSERT OR IGNORE/i.test(sql);
  sql = sql.replace(/INSERT OR IGNORE/gi,"INSERT").replace(/ COLLATE NOCASE/gi,"");
  const tables = new Set(["meta","profiles","servers","members","channels","attachments","messages","calls","signals","rate_limits"]);
  let parameter=0;
  sql = sql.replace(/'(?:''|[^'])*'|\b[A-Za-z_][A-Za-z_0-9]*\b|\?/g, token => {
    if (token.startsWith("'")) return token;
    if (token === "?") return "$" + (++parameter);
    if (tables.has(token)) return "academy_exchange." + token;
    if (/[A-Z]/.test(token) && /[a-z]/.test(token) || token === "window") return '"'+token+'"';
    return token;
  });
  return ignored ? sql + " ON CONFLICT DO NOTHING" : sql;
}
async function query(sql: string, ...args: (string | number | null)[]) {
  const rows=await pgQuery<Row>(sqlForPostgres(sql),args);
  const numbers=new Set(["seq","lastSeen","createdAt","editedAt","size","fileSize","revision","lastSequence","n","count","window"]);
  for(const row of rows) for(const key of numbers) if(row[key] !== null && row[key] !== undefined) row[key]=Number(row[key]);
  return rows;
}
const one = async (sql: string, ...args: (string | number | null)[]) => (await query(sql,...args))[0];
const run = async (sql: string, ...args: (string | number | null)[]) => { await query(sql,...args); };
const bump = async () => { await run("UPDATE meta SET revision=revision+1 WHERE id=1"); };
export async function createPostgresChatStorage() {
  await databaseReady();
await transaction(async () => {
    await run("INSERT OR IGNORE INTO servers VALUES(?,?,?,?,?)", DEFAULT_SERVER, "Academy Fi", null, randomBytes(16).toString("hex"), Date.now());
    await run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", DEFAULT_CHANNEL, DEFAULT_SERVER, "allgemein", "TEXT", null, Date.now());
    await run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "austausch", DEFAULT_SERVER, "austausch", "TEXT", null, Date.now());
    await run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "sprachraum", DEFAULT_SERVER, "sprachraum", "AUDIO", null, Date.now());
    await run("INSERT OR IGNORE INTO channels VALUES(?,?,?,?,?,?)", "videoraum", DEFAULT_SERVER, "videoraum", "VIDEO", null, Date.now());
});
async function rateLimit(key: string, maximum = 45, seconds = 60) {
    const now = Math.floor(Date.now() / (seconds * 1000));
    await transaction(async () => {
        await run("INSERT INTO rate_limits AS current_limit VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN current_limit.window=excluded.window THEN current_limit.count+1 ELSE 1 END, window=excluded.window", key, now);
        if (Number((await one("SELECT count FROM rate_limits WHERE key=?", key))?.count) > maximum)
            throw new ChatError("Bitte warte einen Moment und versuche es erneut.", 429);
    });
}
async function syncProfile(user: {
    id: string;
    name: string;
    role?: string | null;
}): Promise<Profile> {
    const valid = cleanName(user.name, "Kontoname", 128);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(user.id))
        throw new ChatError("Das Benutzerkonto hat eine ungültige Kennung.", 500);
    return await transaction(async () => {
        const existing = await one("SELECT name FROM profiles WHERE id=?", user.id);
        await run("INSERT INTO profiles VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,lastSeen=excluded.lastSeen", user.id, valid, digest(`site:${user.id}`), Date.now());
        const role = user.role === "OWNER" ? "MODERATOR" : "GUEST";
        const existingRole = (await one("SELECT role FROM members WHERE serverId=? AND profileId=?", DEFAULT_SERVER, user.id))?.role;
        await run("INSERT INTO members VALUES(?,?,?) ON CONFLICT(serverId,profileId) DO UPDATE SET role=excluded.role", DEFAULT_SERVER, user.id, role);
        if (!existing || existing.name !== valid || existingRole !== role)
            await bump();
        return { id: user.id, name: valid, lastSeen: Date.now() };
    });
}
async function membership(profileId: string, serverId: string) {
    const member = await one("SELECT m.*,s.ownerId FROM members m JOIN servers s ON s.id=m.serverId WHERE m.profileId=? AND m.serverId=?", profileId, serverId);
    if (!member)
        throw new ChatError("Du bist nicht Mitglied dieses Servers.", 403);
    return member;
}
async function canManage(profileId: string, serverId: string, creatorId?: string | null) {
    const member = await membership(profileId, serverId);
    return member.role === "ADMIN" || member.role === "MODERATOR" || (member.ownerId === null && (!creatorId || creatorId === profileId));
}
async function targetFor(profileId: string, target: Target) {
    if (target.channelId && target.memberId)
        throw new ChatError("Wähle einen Kanal oder eine Direktnachricht.");
    if (target.channelId) {
        const channel = await one("SELECT * FROM channels WHERE id=?", target.channelId);
        if (!channel)
            throw new ChatError("Der Kanal wurde nicht gefunden.", 404);
        await membership(profileId, String(channel.serverId));
        return { channelId: String(channel.id), dmKey: null, roomId: `channel:${channel.id}`, channel };
    }
    if (!target.memberId || target.memberId === profileId)
        throw new ChatError("Wähle ein anderes Mitglied.");
    const shared = await one("SELECT 1 FROM members a JOIN members b ON a.serverId=b.serverId WHERE a.profileId=? AND b.profileId=?", profileId, target.memberId);
    if (!shared)
        throw new ChatError("Direktnachrichten sind nur zwischen Mitgliedern gemeinsamer Server möglich.", 403);
    const dmKey = [profileId, target.memberId].sort().join(":");
    return { channelId: null, dmKey, roomId: `direct:${dmKey}`, channel: null };
}
async function snapshot(profileId: string) {
    const servers = await query("SELECT s.*,m.role FROM servers s JOIN members m ON m.serverId=s.id WHERE m.profileId=? ORDER BY s.createdAt", profileId);
    const channels = await query("SELECT c.* FROM channels c JOIN members m ON m.serverId=c.serverId WHERE m.profileId=? ORDER BY c.createdAt,c.name", profileId);
    const members = await query("SELECT m.serverId,m.role,p.id,p.name,p.lastSeen FROM members m JOIN profiles p ON p.id=m.profileId WHERE m.serverId IN (SELECT serverId FROM members WHERE profileId=?) ORDER BY p.name", profileId);
    const directs = await query("SELECT p.id,p.name,p.lastSeen,MAX(msg.seq) AS lastSequence FROM profiles p JOIN messages msg ON msg.dmKey IS NOT NULL AND (msg.dmKey=? || ':' || p.id OR msg.dmKey=p.id || ':' || ?) WHERE p.id != ? GROUP BY p.id ORDER BY lastSequence DESC", profileId, profileId, profileId);
    return { servers, channels, members, directs, revision: await revision() };
}
async function messages(profileId: string, target: Target, before = 0) {
    const resolved = await targetFor(profileId, target);
    const rows = await query(`SELECT m.*,p.name AS authorName,a.name AS fileName,a.size AS fileSize,a.mime AS fileMime FROM messages m JOIN profiles p ON p.id=m.authorId LEFT JOIN attachments a ON a.id=m.attachmentId WHERE ${resolved.channelId ? "m.channelId=?" : "m.dmKey=?"} AND (?=0 OR m.seq<?) ORDER BY m.seq DESC LIMIT 61`, resolved.channelId || resolved.dmKey, before, before) as unknown as MessageRow[];
    const hasMore = rows.length > 60;
    const result = rows.slice(0, 60).reverse().map(row => ({ ...row, deleted: Boolean(row.deleted), content: row.deleted ? "" : row.content, attachmentId: row.deleted ? null : row.attachmentId }));
    return { messages: result, hasMore, revision: await revision() };
}
async function send(profileId: string, target: Target, value: unknown, attachmentId?: string) {
    const text = content(value ?? "");
    if (!text && !attachmentId)
        throw new ChatError("Die Nachricht ist leer.");
    return await transaction(async () => {
        const resolved = await targetFor(profileId, target);
        if (attachmentId) {
            const attachment = await one("SELECT * FROM attachments WHERE id=? AND ownerId=?", attachmentId, profileId);
            if (!attachment || attachment.channelId !== resolved.channelId || attachment.dmKey !== resolved.dmKey || await one("SELECT 1 FROM messages WHERE attachmentId=?", attachmentId))
                throw new ChatError("Der Anhang gehört nicht zu diesem Chat.", 403);
        }
        const id = uuid();
        await run("INSERT INTO messages(id,content,authorId,channelId,dmKey,attachmentId,createdAt) VALUES(?,?,?,?,?,?,?)", id, text, profileId, resolved.channelId, resolved.dmKey, attachmentId || null, Date.now());
        await bump();
        return { id };
    });
}
async function editMessage(profileId: string, messageId: string, value: unknown, remove = false) {
    return await transaction(async () => {
        const message = await one("SELECT * FROM messages WHERE id=?", messageId);
        if (!message)
            throw new ChatError("Nachricht nicht gefunden.", 404);
        const own = message.authorId === profileId;
        let moderator = false;
        if (message.channelId) {
            const channel = await one("SELECT serverId FROM channels WHERE id=?", message.channelId);
            const member = await membership(profileId, String(channel?.serverId));
            moderator = member.role === "ADMIN" || member.role === "MODERATOR";
        }
        if (!own && !(remove && moderator))
            throw new ChatError("Du darfst diese Nachricht nicht ändern.", 403);
        if (message.deleted)
            throw new ChatError("Diese Nachricht wurde bereits gelöscht.", 409);
        const text = remove ? "" : content(value);
        if (!remove && !text)
            throw new ChatError("Die Nachricht ist leer.");
        await run("UPDATE messages SET content=?,deleted=?,editedAt=? WHERE id=?", text, remove ? 1 : 0, Date.now(), messageId);
        if(remove && message.attachmentId) {
            await run("UPDATE messages SET attachmentId=null WHERE id=?",messageId);
            await run("DELETE FROM attachments WHERE id=?",message.attachmentId);
        }
        await bump();
        return { id: messageId };
    });
}
async function createServer(profileId: string, name: unknown) {
    return await transaction(async () => {
        if (Number((await one("SELECT count(*) AS n FROM servers WHERE ownerId=?", profileId))?.n) >= 20)
            throw new ChatError("Du kannst höchstens 20 Server erstellen.");
        const id = uuid();
        const now = Date.now();
        await run("INSERT INTO servers VALUES(?,?,?,?,?)", id, cleanName(name, "Servername"), profileId, randomBytes(16).toString("hex"), now);
        await run("INSERT INTO members VALUES(?,?,'ADMIN')", id, profileId);
        await run("INSERT INTO channels VALUES(?,?,?,?,?,?)", uuid(), id, "allgemein", "TEXT", profileId, now);
        await bump();
        return { id };
    });
}
async function joinServer(profileId: string, invite: unknown) {
    return await transaction(async () => {
        if (typeof invite !== "string")
            throw new ChatError("Einladung fehlt.");
        const server = await one("SELECT id FROM servers WHERE inviteCode=?", invite);
        if (!server)
            throw new ChatError("Diese Einladung ist ungültig.", 404);
        await run("INSERT OR IGNORE INTO members VALUES(?,?,'GUEST')", server.id, profileId);
        await bump();
        return { id: server.id };
    });
}
async function updateServer(profileId: string, id: string, action: string, name?: unknown) {
    return await transaction(async () => {
        const member = await membership(profileId, id);
        if (action === "leave") {
            if (id === DEFAULT_SERVER || member.role === "ADMIN")
                throw new ChatError("Den allgemeinen oder deinen eigenen Server kannst du nicht verlassen.");
            await run("DELETE FROM members WHERE serverId=? AND profileId=?", id, profileId);
        }
        else {
            if (member.role !== "ADMIN")
                throw new ChatError("Nur der Serverinhaber darf das ändern.", 403);
            if (action === "rename")
                await run("UPDATE servers SET name=? WHERE id=?", cleanName(name, "Servername"), id);
            else if (action === "invite")
                await run("UPDATE servers SET inviteCode=? WHERE id=?", randomBytes(16).toString("hex"), id);
            else if (action === "delete")
                await run("DELETE FROM servers WHERE id=?", id);
            else
                throw new ChatError("Unbekannte Serveraktion.");
        }
        await bump();
        return { id };
    });
}
async function changeMember(profileId: string, serverId: string, memberId: string, role: string) {
    return await transaction(async () => {
        if ((await membership(profileId, serverId)).role !== "ADMIN" || profileId === memberId)
            throw new ChatError("Nur der Serverinhaber darf andere Mitglieder verwalten.", 403);
        if (!new Set(["GUEST", "MODERATOR", "REMOVE"]).has(role))
            throw new ChatError("Ungültige Rolle.");
        if (role === "REMOVE")
            await run("DELETE FROM members WHERE serverId=? AND profileId=?", serverId, memberId);
        else
            await run("UPDATE members SET role=? WHERE serverId=? AND profileId=?", role, serverId, memberId);
        await bump();
        return {};
    });
}
async function createChannel(profileId: string, serverId: string, name: unknown, type: string) {
    return await transaction(async () => {
        if (!await canManage(profileId, serverId))
            throw new ChatError("Du darfst hier keine Kanäle erstellen.", 403);
        if (!new Set(["TEXT", "AUDIO", "VIDEO"]).has(type))
            throw new ChatError("Ungültiger Kanaltyp.");
        if (Number((await one("SELECT count(*) AS n FROM channels WHERE serverId=?", serverId))?.n) >= 100)
            throw new ChatError("Ein Server kann höchstens 100 Kanäle enthalten.");
        const valid = cleanName(name, "Kanalname").replace(/\s+/g, "-").toLowerCase();
        if (await one("SELECT 1 FROM channels WHERE serverId=? AND name=? COLLATE NOCASE", serverId, valid))
            throw new ChatError("Dieser Kanalname ist bereits vergeben.", 409);
        const id = uuid();
        await run("INSERT INTO channels VALUES(?,?,?,?,?,?)", id, serverId, valid, type, profileId, Date.now());
        await bump();
        return { id };
    });
}
async function updateChannel(profileId: string, id: string, name?: unknown, remove = false) {
    return await transaction(async () => {
        const channel = await one("SELECT * FROM channels WHERE id=?", id);
        if (!channel)
            throw new ChatError("Kanal nicht gefunden.", 404);
        if (!await canManage(profileId, String(channel.serverId), channel.creatorId as string | null))
            throw new ChatError("Du darfst diesen Kanal nicht ändern.", 403);
        if (channel.id === DEFAULT_CHANNEL || channel.creatorId === null)
            throw new ChatError("Die Standardkanäle bleiben bestehen.");
        if (remove) {
            await run("DELETE FROM calls WHERE roomId=?", `channel:${id}`);
            await run("DELETE FROM channels WHERE id=?", id);
        }
        else {
            const valid = cleanName(name, "Kanalname").replace(/\s+/g, "-").toLowerCase();
            if (await one("SELECT 1 FROM channels WHERE serverId=? AND name=? COLLATE NOCASE AND id!=?", channel.serverId, valid, id))
                throw new ChatError("Dieser Kanalname ist bereits vergeben.", 409);
            await run("UPDATE channels SET name=? WHERE id=?", valid, id);
        }
        await bump();
        return { id };
    });
}
async function addAttachment(profileId: string, target: Target, id: string, name: string, mime: string, size: number) {
    const resolved = await targetFor(profileId, target);
    await run("INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?)", id, name, mime, size, profileId, resolved.channelId, resolved.dmKey, Date.now());
}
async function attachment(profileId: string, id: string) {
    const row = await one("SELECT * FROM attachments WHERE id=?", id);
    if (!row)
        throw new ChatError("Anhang nicht gefunden.", 404);
    if (row.ownerId === profileId)
        return row;
    const message = await one("SELECT 1 FROM messages WHERE attachmentId=? AND deleted=0", id);
    if (!message)
        throw new ChatError("Du kannst diesen Anhang nicht öffnen.", 403);
    if (row.channelId)
        await targetFor(profileId, { channelId: String(row.channelId) });
    else if (!String(row.dmKey).split(":").includes(profileId))
        throw new ChatError("Du kannst diesen Anhang nicht öffnen.", 403);
    return row;
}
const revision = async () => Number((await one("SELECT revision FROM meta WHERE id=1"))?.revision || 0);
async function touch(profileId: string) { await run("UPDATE profiles SET lastSeen=? WHERE id=?", Date.now(), profileId); }
async function call(profileId: string, target: Target, clientId: string, action: string, after = 0) {
    const resolved = await targetFor(profileId, target);
    if (!["join", "heartbeat", "leave"].includes(action) || !Number.isSafeInteger(after) || after < 0)
        throw new ChatError("Ungültige Anrufaktion.");
    if (!/^[a-f0-9-]{36}$/.test(clientId))
        throw new ChatError("Ungültige Verbindung.");
    return await transaction(async () => {
        await run("DELETE FROM calls WHERE lastSeen<?", Date.now() - 25000);
        await run("DELETE FROM signals WHERE createdAt<?", Date.now() - 60000);
        if (action === "leave")
            await run("DELETE FROM calls WHERE roomId=? AND profileId=? AND clientId=?", resolved.roomId, profileId, clientId);
        else {
            if (Number((await one("SELECT count(*) AS n FROM calls WHERE roomId=? AND NOT(profileId=? AND clientId=?)", resolved.roomId, profileId, clientId))?.n) >= 8)
                throw new ChatError("Dieser Raum ist voll (maximal 8 Verbindungen).", 409);
            await run("INSERT INTO calls VALUES(?,?,?,?) ON CONFLICT(roomId,profileId,clientId) DO UPDATE SET lastSeen=excluded.lastSeen", resolved.roomId, profileId, clientId, Date.now());
        }
        const peers = await query("SELECT c.profileId,c.clientId,p.name FROM calls c JOIN profiles p ON p.id=c.profileId WHERE c.roomId=? AND NOT(c.profileId=? AND c.clientId=?)", resolved.roomId, profileId, clientId);
        const signals = (await query("SELECT seq,senderId,senderClient,payload FROM signals WHERE roomId=? AND recipientId=? AND recipientClient=? AND seq>? ORDER BY seq LIMIT 100", resolved.roomId, profileId, clientId, after)).map(row => ({ seq: Number(row.seq), senderId: String(row.senderId), senderClient: String(row.senderClient), payload: JSON.parse(String(row.payload)) as Record<string, unknown> }));
        return { peers, signals };
    });
}
async function signal(profileId: string, target: Target, clientId: string, recipientId: string, recipientClient: string, payload: unknown) {
    const resolved = await targetFor(profileId, target);
    const encoded = JSON.stringify(payload);
    if (!encoded || encoded.length > 32000 || !payload || typeof payload !== "object")
        throw new ChatError("Ungültige Verbindungsdaten.");
    const data = payload as Record<string, unknown>;
    if (!new Set(["offer", "answer", "candidate"]).has(String(data.type)))
        throw new ChatError("Ungültige Verbindungsdaten.");
    if (!await one("SELECT 1 FROM calls WHERE roomId=? AND profileId=? AND clientId=? AND lastSeen>?", resolved.roomId, profileId, clientId, Date.now() - 25000) || !await one("SELECT 1 FROM calls WHERE roomId=? AND profileId=? AND clientId=? AND lastSeen>?", resolved.roomId, recipientId, recipientClient, Date.now() - 25000))
        throw new ChatError("Die andere Verbindung ist nicht mehr aktiv.", 409);
    await run("INSERT INTO signals(roomId,senderId,senderClient,recipientId,recipientClient,payload,createdAt) VALUES(?,?,?,?,?,?,?)", resolved.roomId, profileId, clientId, recipientId, recipientClient, encoded, Date.now());
    return {};
}
return { directory: "", db: null, rateLimit, syncProfile, targetFor, membership, snapshot, messages, send, editMessage, createServer, joinServer, updateServer, changeMember, createChannel, updateChannel, addAttachment, attachment, revision, touch, call, signal, close: async () => { } };
}
