import assert from "node:assert/strict";
import test from "node:test";
import { accountRequest, customerRegistrationEnabled } from "../src/lib/loyalty/customer-account";
import { POST } from "../src/app/api/stempelfi/account/route";

test("customer registration is opt-in and only available in development/test", () => {
  const enabled = process.env.STEMPELFI_REGISTRATION_ENABLED, environment = process.env.DATABASE_ENV;
  try {
    delete process.env.STEMPELFI_REGISTRATION_ENABLED;
    assert.equal(customerRegistrationEnabled(), false);
    process.env.STEMPELFI_REGISTRATION_ENABLED = "1"; process.env.DATABASE_ENV = "production";
    assert.equal(customerRegistrationEnabled(), false);
    process.env.DATABASE_ENV = "test"; assert.equal(customerRegistrationEnabled(), true);
  } finally { if (enabled === undefined) delete process.env.STEMPELFI_REGISTRATION_ENABLED; else process.env.STEMPELFI_REGISTRATION_ENABLED = enabled; process.env.DATABASE_ENV = environment; }
});
test("customer input rejects role/verification/redirect injection and weak credentials", () => {
  const valid = { action: "register", email: "test@example.invalid", name: "Test", password: "Fixture!Pass2026", locale: "en", operationId: "dd3a5745-d44b-4c29-b485-7a598188679e" };
  assert.equal(accountRequest.safeParse(valid).success, true);
  for (const injected of [{ role: "OWNER" }, { emailVerified: true }, { returnTo: "https://bad.invalid" }, { password: "short" }, { name: "\u0000" }, { email: "bad" }, { locale: "xx" }]) assert.equal(accountRequest.safeParse({ ...valid, ...injected }).success, false);
});
test("account HTTP entry rejects disabled, foreign-origin, invalid and oversized requests before DB I/O", async () => {
  process.env.STEMPELFI_REGISTRATION_ENABLED = "0";
  assert.equal((await POST(new Request("http://localhost/api/stempelfi/account", { method: "POST" }))).status, 403);
  process.env.STEMPELFI_REGISTRATION_ENABLED = "1"; process.env.DATABASE_ENV = "test"; process.env.BETTER_AUTH_URL = "http://localhost";
  const request = (body: string, origin = "http://localhost") => new Request("http://localhost/api/stempelfi/account", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body });
  assert.equal((await POST(request("{}", "https://bad.invalid"))).status, 403);
  assert.equal((await POST(request("{}"))).status, 400);
  assert.equal((await POST(request("x".repeat(9000)))).status, 400);
});
