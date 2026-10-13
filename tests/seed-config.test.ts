import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import {
  getSeedConfiguration,
  SeedConfigurationError,
} from "../db/seed-config";

function env(): Record<string, string | undefined> {
  return {
    DATABASE_ENV: "development",
    DATABASE_URL: "postgresql://test:test@localhost/test_db",
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
    CHAT_MASTER_KEY: randomBytes(32).toString("base64"),
    SEED_FI_PASSWORD: "Owner test password",
    SEED_USER_1_PASSWORD: "Alex test password",
    SEED_USER_2_PASSWORD: "Sam test password",
  };
}

test("fresh development seed creates one Owner and two optional Interns with normal login passwords", () => {
  const config = getSeedConfiguration(env());
  assert.deepEqual(
    config.accounts.map(({ role, locale }) => ({ role, locale })),
    [
      { role: "OWNER", locale: "de" },
      { role: "INTERN", locale: "de" },
      { role: "INTERN", locale: "de" },
    ],
  );
  assert.equal(config.accounts[0].password, "Owner test password");
  assert.equal(config.seedChats, true);
});

test("optional accounts and demo chats can be omitted without changing the Owner", () => {
  const config = getSeedConfiguration({
    ...env(),
    SEED_USER_1_PASSWORD: "",
    SEED_USER_2_PASSWORD: "",
    SEED_CHAT_DEMO: "false",
  });
  assert.equal(config.accounts.length, 1);
  assert.equal(config.accounts[0].role, "OWNER");
  assert.equal(config.seedChats, false);
});

test("invalid development target, secrets and passwords fail before database work", () => {
  const overrides: Array<Record<string, string | undefined>> = [
    { DATABASE_ENV: "production" },
    { NODE_ENV: "production" },
    { DATABASE_URL: "" },
    { DATABASE_URL: "https://example.com/database" },
    { DATABASE_URL: "postgresql://localhost" },
    { BETTER_AUTH_SECRET: "short" },
    { CHAT_MASTER_KEY: "password" },
    { SEED_FI_PASSWORD: "" },
    { SEED_FI_PASSWORD: "short" },
    { SEED_USER_1_PASSWORD: "short" },
    { SEED_USER_2_PASSWORD: "a".repeat(129) },
  ];
  for (const override of overrides)
    assert.throws(
      () => getSeedConfiguration({ ...env(), ...override }),
      SeedConfigurationError,
    );
});

test("emails are normalized and duplicate or malformed identities are rejected", () => {
  const config = getSeedConfiguration({
    ...env(),
    SEED_OWNER_EMAIL: "  Owner@Example.com ",
  });
  assert.equal(config.accounts[0].email, "owner@example.com");
  assert.throws(
    () =>
      getSeedConfiguration({
        ...env(),
        SEED_USER_1_EMAIL: "calem@studio-fi.com",
      }),
    SeedConfigurationError,
  );
  assert.throws(
    () => getSeedConfiguration({ ...env(), SEED_USER_2_EMAIL: "invalid" }),
    SeedConfigurationError,
  );
});

test("unsupported seed modes and locales are rejected", () => {
  assert.throws(
    () => getSeedConfiguration({ ...env(), SEED_CHAT_DEMO: "yes" }),
    SeedConfigurationError,
  );
  assert.throws(
    () => getSeedConfiguration({ ...env(), SEED_OWNER_LOCALE: "fr" }),
    SeedConfigurationError,
  );
  assert.equal(
    getSeedConfiguration({ ...env(), SEED_USER_1_LOCALE: "en" }).accounts[1]
      .locale,
    "en",
  );
});
