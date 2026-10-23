import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  databaseIntegrationEnvironment,
  isolatedEnvironment,
  realtimeIntegrationEnvironment,
} from "../scripts/quality-environment.mjs";

test("Loyalty DB entry refuses empty, foreign and unconfigured test runs before database access", () => {
  for (const files of [[], ["tests/chats.integration.test.ts"], ["tests/loyalty/../../chats.integration.test.ts"], ["tests/loyalty/cards.integration.test.ts"]]) {
    const result = spawnSync(process.execPath, ["scripts/check.mjs", "loyalty-integration", ...files], {
      env: { ...process.env, ACADEMYFI_DATABASE_TEST: "", CHAT_TEST_DATABASE_URL: "", LOYALTY_TEST_DATABASE_URL: "" },
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, files[0] === "tests/loyalty/cards.integration.test.ts" ? /Datenbanktests benötigen/ : /Loyalty-Testliste/);
  }
});

test("Loyalty configuration requires its own URL and rejects ordinary databases", () => {
  const variable = "LOYALTY_TEST_DATABASE_URL";
  const testUrl = "postgresql://test:test@db.example/loyalty_test";
  const source = { ACADEMYFI_DATABASE_TEST: "1", LOYALTY_TEST_DATABASE_URL: testUrl, CHAT_TEST_DATABASE_URL: "postgresql://chat:chat@db.example/chat_test" };
  for (const invalid of [
    { ...source, ACADEMYFI_DATABASE_TEST: "" },
    { ...source, LOYALTY_TEST_DATABASE_URL: "" },
    { ...source, LOYALTY_TEST_DATABASE_URL: "https://db.example/test" },
    { ...source, DATABASE_URL: "postgres://other:pass@DB.EXAMPLE:5432/loyalty_test" },
  ]) assert.throws(() => databaseIntegrationEnvironment(invalid, [], variable));
  assert.throws(() => databaseIntegrationEnvironment(source, [{ DATABASE_URL: testUrl }], variable));
  const env = databaseIntegrationEnvironment(source, [], variable);
  assert.equal(env.DATABASE_URL, testUrl);
  assert.equal(env.LOYALTY_TEST_DATABASE_URL, testUrl);
  assert.equal(env.CHAT_TEST_DATABASE_URL, "");
  assert.equal(isolatedEnvironment(source, []).LOYALTY_TEST_DATABASE_URL, "");
  const chat = databaseIntegrationEnvironment(source, []);
  assert.equal(chat.DATABASE_URL, source.CHAT_TEST_DATABASE_URL);
  assert.equal(chat.LOYALTY_TEST_DATABASE_URL, "");
});

test("unit/build checks replace local and inherited provider credentials without changing the parent", () => {
  const source = { PATH: "/tools", DATABASE_URL: "postgresql://app:secret@db.example/app", ABLY_API_KEY: "app.key:secret", OPENAI_API_KEY: "live-key", STEMPELFI_REGISTRATION_ENABLED: "1" };
  const env = isolatedEnvironment(source, [{ CUSTOM_PROVIDER_KEY: "live-secret", RESEND_KEY: "mail-secret" }]);
  assert.equal(env.PATH, "/tools");
  assert.equal(env.CUSTOM_PROVIDER_KEY, "");
  assert.equal(env.OPENAI_API_KEY, "");
  assert.equal(env.ABLY_API_KEY, "");
  assert.equal(env.RESEND_KEY, "");
  assert.equal(env.STEMPELFI_REGISTRATION_ENABLED, "");
  assert.equal(source.STEMPELFI_REGISTRATION_ENABLED, "1");
  assert.equal(new URL(env.DATABASE_URL).hostname, "127.0.0.1");
  assert.equal(source.OPENAI_API_KEY, "live-key");
});

test("database tests reject missing opt-in, malformed URLs and the application database even with different credentials", () => {
  const app = "postgresql://app:secret@db.example/app";
  const optedIn = { ACADEMYFI_DATABASE_TEST: "1", CHAT_TEST_DATABASE_URL: "postgresql://test:test@db.example/quality_test" };
  for (const source of [
    {}, { CHAT_TEST_DATABASE_URL: optedIn.CHAT_TEST_DATABASE_URL },
    { ...optedIn, CHAT_TEST_DATABASE_URL: "https://db.example/test" },
    { ...optedIn, CHAT_TEST_DATABASE_URL: "postgresql://db.example" },
    { ...optedIn, DATABASE_URL: app, CHAT_TEST_DATABASE_URL: "postgres://other:pass@DB.EXAMPLE:5432/app" },
  ]) assert.throws(() => databaseIntegrationEnvironment(source, []));
  assert.throws(() => databaseIntegrationEnvironment({ ...optedIn, CHAT_TEST_DATABASE_URL: app }, [{ DATABASE_URL: app }]));
});

test("explicit database tests receive only the separate test connection and no provider keys", () => {
  const testUrl = "postgresql://test:test@db.example/quality_test";
  const env = databaseIntegrationEnvironment({ ACADEMYFI_DATABASE_TEST: "1", CHAT_TEST_DATABASE_URL: testUrl, OPENAI_API_KEY: "live" }, []);
  assert.equal(env.DATABASE_URL, testUrl);
  assert.equal(env.DATABASE_ENV, "development");
  assert.equal(env.NODE_ENV, "test");
  assert.equal(env.OPENAI_API_KEY, "");
});

test("realtime tests require a dedicated app and reject rotated or different keys in the ordinary app", () => {
  for (const source of [
    {}, { ABLY_TEST_API_KEY: "test.key:secret" },
    { ACADEMYFI_REALTIME_TEST: "1", ABLY_TEST_API_KEY: "app.key:new", ABLY_API_KEY: "app.key:old" },
    { ACADEMYFI_REALTIME_TEST: "1", ABLY_TEST_API_KEY: "app.other:new", ABLY_API_KEY: "app.key:old" },
    { ACADEMYFI_REALTIME_TEST: "1", ABLY_TEST_API_KEY: "malformed" },
  ]) assert.throws(() => realtimeIntegrationEnvironment(source, []));
  assert.throws(() => realtimeIntegrationEnvironment({ ACADEMYFI_REALTIME_TEST: "1", ABLY_TEST_API_KEY: "app.key:new" }, [{ ABLY_API_KEY: "app.key:old" }]));
  const env = realtimeIntegrationEnvironment({ ACADEMYFI_REALTIME_TEST: "1", ABLY_TEST_API_KEY: "test.key:secret", ABLY_API_KEY: "app.key:secret" }, []);
  assert.equal(env.ABLY_API_KEY, "test.key:secret");
});
