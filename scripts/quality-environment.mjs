import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";

/** @typedef {Record<string, string | undefined>} CheckEnvironment */

// Read names for isolation and database/key identities for rejection only.
// Never print local configuration values or copy them into a check process.
export function localConfigurations() {
  return readdirSync(process.cwd())
    .filter((name) => /^\.env(?:\.[\w.-]+)?$/.test(name))
    .map((name) => parse(readFileSync(name)));
}

/**
 * @param {CheckEnvironment} source
 * @param {CheckEnvironment[]} configurations
 * @returns {CheckEnvironment & { DATABASE_URL: string }}
 */
export function isolatedEnvironment(
  source = process.env,
  configurations = localConfigurations(),
) {
  // Deny all inherited application configuration without maintaining a credential catalog.
  // Explicit empty values also stop framework .env loading from restoring those values.
  const env = Object.fromEntries(Object.keys(source).map(name => [name, ""]));
  for (const configuration of configurations) {
    for (const name of Object.keys(configuration)) env[name] = "";
  }
  for (const name of [
    "PATH", "Path", "PATHEXT", "SystemRoot", "SYSTEMROOT", "WINDIR",
    "COMSPEC", "ComSpec", "SystemDrive", "OS", "TEMP", "TMP", "TMPDIR",
    "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "ProgramData",
    "ProgramFiles", "ProgramFiles(x86)", "PROCESSOR_ARCHITECTURE",
    "NUMBER_OF_PROCESSORS", "LANG", "LC_ALL", "TERM", "CI", "NO_COLOR",
    "FORCE_COLOR", "npm_execpath", "npm_node_execpath", "npm_config_cache",
  ])
    if (source[name] !== undefined) env[name] = source[name];
  // The sandbox's Windows temporary directory has ACLs rejected by native SWC.
  // Keep its materialization cache inside the already ignored workspace cache.
  if (process.platform === "win32")
    env.SWC_NATIVE_BINDING_CACHE = join(process.cwd(), ".swc", "native");
  return {
    ...env,
    NODE_ENV: "test",
    DATABASE_URL:
      "postgresql://quality:quality@127.0.0.1:5432/academyfi_quality",
    DATABASE_ENV: "test",
    BETTER_AUTH_SECRET: "quality-check-placeholder-not-a-production-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    CHAT_MASTER_KEY: randomBytes(32).toString("base64"),
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

function databaseIdentity(value) {
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      url.pathname.length < 2
    )
      throw new Error();
    return `${url.hostname.toLowerCase()}:${url.port || "5432"}/${decodeURIComponent(url.pathname.slice(1))}`;
  } catch {
    throw new Error(
      "Testdatenbank benötigt eine gültige PostgreSQL-URL mit Datenbankname.",
    );
  }
}

/**
 * @param {CheckEnvironment} source
 * @param {CheckEnvironment[]} configurations
 * @returns {CheckEnvironment & { DATABASE_URL: string }}
 */
export function databaseIntegrationEnvironment(
  source = process.env,
  configurations = localConfigurations(),
  variable = "CHAT_TEST_DATABASE_URL",
) {
  if (
    !["CHAT_TEST_DATABASE_URL", "LOYALTY_TEST_DATABASE_URL"].includes(variable)
  ) {
    throw new Error("Unbekannte Testdatenbank-Zuordnung.");
  }
  const testUrl = source[variable];
  if (source.ACADEMYFI_DATABASE_TEST !== "1" || !testUrl) {
    throw new Error(
      `Datenbanktests benötigen ACADEMYFI_DATABASE_TEST=1 und ${variable}. Ausschließlich eine separate, entbehrliche Testdatenbank verwenden.`,
    );
  }
  const identity = databaseIdentity(testUrl);
  const ordinaryUrls = [
    source.DATABASE_URL,
    ...configurations.map((configuration) => configuration.DATABASE_URL),
  ];
  if (ordinaryUrls.some((url) => url && databaseIdentity(url) === identity)) {
    throw new Error(
      "Testdatenbank entspricht einer normalen Anwendungsdatenbank; Testlauf verweigert.",
    );
  }
  return {
    ...isolatedEnvironment(source, configurations),
    NODE_ENV: "test",
    DATABASE_ENV: "development",
    DATABASE_URL: testUrl,
    [variable]: testUrl,
    ACADEMYFI_DATABASE_TEST: "1",
  };
}

/**
 * @param {CheckEnvironment} source
 * @param {CheckEnvironment[]} configurations
 * @returns {CheckEnvironment & { ABLY_API_KEY: string }}
 */
export function realtimeIntegrationEnvironment(
  source = process.env,
  configurations = localConfigurations(),
) {
  if (
    source.ACADEMYFI_REALTIME_TEST !== "1" ||
    !source.ABLY_TEST_API_KEY?.trim()
  ) {
    throw new Error(
      "Realtime-Test benötigt ACADEMYFI_REALTIME_TEST=1 und ABLY_TEST_API_KEY aus einer separaten Test-App.",
    );
  }
  const ordinaryKeys = [
    source.ABLY_API_KEY,
    ...configurations.map((configuration) => configuration.ABLY_API_KEY),
  ];
  // Ably keys have appId.keyId:secret format. A new key in the same app
  // must not turn a production app into an apparent test environment.
  const match = /^([^.:\s]+)\.([^.:\s]+):\S+$/.exec(source.ABLY_TEST_API_KEY);
  if (!match)
    throw new Error(
      "Realtime-Testschlüssel hat kein gültiges App-/Schlüsselformat.",
    );
  if (ordinaryKeys.some((key) => key && key.split(".")[0] === match[1])) {
    throw new Error(
      "Realtime-Testschlüssel gehört zu einer normalen Anwendungs-App; Testlauf verweigert.",
    );
  }
  return {
    ...isolatedEnvironment(source, configurations),
    NODE_ENV: "test",
    ABLY_API_KEY: source.ABLY_TEST_API_KEY,
    ABLY_TEST_API_KEY: source.ABLY_TEST_API_KEY,
    ACADEMYFI_REALTIME_TEST: "1",
  };
}
