import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const operation = process.argv[2];
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const commands = { migrate: ["migrate", "deploy"], seed: ["db", "seed"] };

function abort(message) {
  console.error(message);
  process.exit(1);
}
if (!Object.hasOwn(commands, operation) && operation !== "reset")
  abort("Unbekannter Datenbankbefehl.");
if (
  process.env.DATABASE_ENV !== "development" ||
  process.env.NODE_ENV === "production"
)
  abort(
    "Datenbankbefehl abgebrochen: Nur für DATABASE_ENV=development außerhalb der Produktion freigegeben.",
  );

function databaseIdentity(value) {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length <= 1
  )
    throw new Error();
  // Neon pooled/direct connections to the same endpoint are the same database.
  return [
    url.hostname.toLowerCase().replace(/-pooler(?=\.)/, ""),
    url.port || "5432",
    decodeURIComponent(url.pathname),
  ].join("/");
}
try {
  databaseIdentity(process.env.DATABASE_URL);
} catch {
  abort(
    "DATABASE_URL ist keine gültige PostgreSQL-Verbindung zur Entwicklungsdatenbank.",
  );
}

if (operation === "reset") {
  // Avoid resetting Academy if its connection was accidentally copied into v4.
  for (const filename of [".env", ".env.local"]) {
    const mainEnv = new URL(`../../academy-fi/${filename}`, import.meta.url);
    if (!existsSync(mainEnv)) continue;
    const mainUrl = parse(readFileSync(mainEnv, "utf8")).DATABASE_URL;
    if (mainUrl) {
      try {
        if (
          databaseIdentity(mainUrl) ===
          databaseIdentity(process.env.DATABASE_URL)
        )
          abort(
            "Reset abgebrochen: Die konfigurierte Verbindung zeigt auf die Hauptprojekt-Datenbank. Eine separate Entwicklungsdatenbank verwenden.",
          );
      } catch {
        abort(
          "Reset abgebrochen: Die Datenbankabgrenzung zum Hauptprojekt konnte nicht geprüft werden.",
        );
      }
    }
  }
}

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error)
    abort("Datenbank-Unterbefehl konnte nicht gestartet werden.");
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (operation === "reset") {
  // Prisma 7 does not automatically seed after migrate reset.
  run([
    "--conditions=react-server",
    "--import",
    "tsx",
    "db/seed.ts",
    "--check",
  ]);
  run([cli, "generate"]);
  console.log(
    "Die Entwicklungsdatenbank wird vollständig zurückgesetzt. Prisma fragt vor dem Löschen nach Bestätigung.",
  );
  run([cli, "migrate", "reset"]);
  run([cli, "db", "seed"]);
} else {
  run([cli, ...commands[operation]]);
}
