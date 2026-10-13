import { randomBytes } from "node:crypto";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { parse } from "dotenv";

const filename = new URL("../.env", import.meta.url);
const content = existsSync(filename) ? readFileSync(filename, "utf8") : "";
const existing = parse(content).CHAT_MASTER_KEY;
if (existing) {
  const decoded = Buffer.from(existing, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== existing)
    throw new Error(
      "Vorhandener CHAT_MASTER_KEY ist ungültig; er wurde nicht verändert.",
    );
  decoded.fill(0);
  console.log(
    "CHAT_MASTER_KEY ist bereits eingerichtet und bleibt unverändert.",
  );
} else {
  appendFileSync(
    filename,
    `${content.endsWith("\n") || !content ? "" : "\n"}\n# Gemeinsamer serverseitiger Chat-Schlüssel; dauerhaft sichern.\nCHAT_MASTER_KEY=${randomBytes(32).toString("base64")}\n`,
  );
  console.log(
    "CHAT_MASTER_KEY wurde in der lokalen .env eingerichtet. Der Wert wird nicht ausgegeben.",
  );
}
