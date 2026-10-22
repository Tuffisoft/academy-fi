import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  databaseIntegrationEnvironment,
  isolatedEnvironment,
  realtimeIntegrationEnvironment,
} from "./quality-environment.mjs";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const [mode, ...files] = process.argv.slice(2);

function run(args, env) {
  const child = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (child.error) {
    console.error(`Prüfprozess konnte nicht gestartet werden (${child.error.code}).`);
    return 1;
  }
  return child.status ?? 1;
}

function npm(script, env) {
  if (!process.env.npm_execpath) throw new Error("Prüfungen über npm run aufrufen.");
  return run([process.env.npm_execpath, "run", script], env);
}

function tests(paths, env) {
  if (!paths.length || paths.some((path) => !existsSync(path))) {
    throw new Error("Testliste ist leer oder enthält fehlende Dateien; der Lauf gilt nicht als bestanden.");
  }
  return run(["--conditions=react-server", "--import", "tsx", "--test", ...paths], { ...env, NODE_ENV: "test" });
}

try {
  if (mode === "test") {
    if (files.some((file) => file.includes(".integration."))) throw new Error("Integrationstests separat ausführen.");
    process.exitCode = tests(files, isolatedEnvironment());
  } else if (mode === "build") {
    process.exitCode = npm("build", { ...isolatedEnvironment(), NODE_ENV: "production" });
  } else if (mode === "typecheck") {
    const env = { ...isolatedEnvironment(), NODE_ENV: "production" };
    // A fresh checkout has neither next-env.d.ts nor generated route types.
    const generated = run(["node_modules/next/dist/bin/next", "typegen"], env);
    process.exitCode = generated || run(["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"], env);
  } else if (mode === "integration") {
    process.exitCode = tests([
      "tests/chats.integration.test.ts", "tests/friendships.integration.test.ts",
    ], databaseIntegrationEnvironment());
  } else if (mode === "realtime") {
    process.exitCode = tests(["tests/realtime.integration.test.ts"], realtimeIntegrationEnvironment());
  } else if (mode === "all") {
    const failed = [];
    for (const script of ["lint", "typecheck", "test", "check:build"]) {
      if (npm(script, isolatedEnvironment()) !== 0) failed.push(script);
    }
    if (failed.length) console.error(`Nicht bestanden: ${failed.join(", ")}`);
    process.exitCode = failed.length ? 1 : 0;
  } else {
    throw new Error("Unbekannte Prüfung.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Prüfung fehlgeschlagen.");
  process.exitCode = 1;
}
