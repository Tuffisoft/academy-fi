import assert from "node:assert/strict";
import { test } from "node:test";

test("authentication trusts exact Vercel deployment hosts and rejects unrelated sites",{skip:process.env.EXCHANGE_TEST_DATABASE!=="1"},async()=>{
  process.env.VERCEL_URL="academy-fi-origin-test.vercel.app";
  const {auth}=await import("./auth");
  const attempt=(origin:string)=>auth.handler(new Request("https://academy-fi-origin-test.vercel.app/api/auth/sign-in/email",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({email:"codex-nonexistent-origin-test@example.invalid",password:"nonexistent-test-password"})}));
  // A nonexistent test account reaches credential validation, instead of failing origin checks.
  assert.equal((await attempt("https://academy-fi-origin-test.vercel.app")).status,401);
  assert.equal((await attempt("https://unrelated.vercel.app")).status,403);
});
