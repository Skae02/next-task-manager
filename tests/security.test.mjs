import assert from "node:assert/strict";
import test from "node:test";
import { assertTrustedMutation, readBoundedJson, MAX_JSON_BYTES } from "../lib/security/request.ts";
import { databaseConnectionOptions } from "../lib/security/database.ts";
import { fitsBcrypt } from "../lib/security/password.ts";

const mutation = (headers = {}) => new Request("https://tasks.example/api/auth/login", { method: "POST", headers });

test("mutations reject foreign, null, missing and spoofed forwarded origins", () => {
  for (const headers of [
    { origin: "https://evil.example" }, { origin: "null" }, {},
    { origin: "https://evil.example", "x-forwarded-host": "evil.example" },
    { origin: "https://tasks.example", "sec-fetch-site": "cross-site" },
  ]) assert.throws(() => assertTrustedMutation(mutation(headers)), { status: 403 });
  assert.doesNotThrow(() => assertTrustedMutation(mutation({ origin: "https://tasks.example" })));
  assert.doesNotThrow(() => assertTrustedMutation(mutation({ "sec-fetch-site": "same-origin" })));
  assert.doesNotThrow(() => assertTrustedMutation(new Request("https://tasks.example/api/tables")));
});

test("configured public origin works behind a proxy without trusting forwarded hosts", () => {
  const req = new Request("http://internal:3000/api/tables", { method: "DELETE", headers: { origin: "https://tasks.example" } });
  assert.doesNotThrow(() => assertTrustedMutation(req, "https://tasks.example"));
  assert.throws(() => assertTrustedMutation(req), { status: 403 });
});

test("JSON accepts valid UTF-8 and rejects malformed JSON and simple form content types", async () => {
  const json = (body, type = "application/json; charset=utf-8") => new Request("https://tasks.example/api", {
    method: "POST", headers: { "Content-Type": type }, body,
  });
  assert.deepEqual(await readBoundedJson(json('{"title":"mañana"}')), { title: "mañana" });
  await assert.rejects(readBoundedJson(json("{")), { status: 400 });
  await assert.rejects(readBoundedJson(json("{}", "text/plain")), { status: 415 });
  await assert.rejects(readBoundedJson(json("{}", "application/x-www-form-urlencoded")), { status: 415 });
});

test("JSON streaming limit counts bytes even without Content-Length and cancels oversized input", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_JSON_BYTES + 1)); },
    cancel() { cancelled = true; },
  });
  const req = new Request("https://tasks.example/api", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half",
  });
  await assert.rejects(readBoundedJson(req), { status: 413 });
  assert.equal(cancelled, true);
  const declared = new Request("https://tasks.example/api", {
    method: "POST", headers: { "Content-Type": "application/json", "Content-Length": String(MAX_JSON_BYTES + 1) }, body: "{}",
  });
  await assert.rejects(readBoundedJson(declared), { status: 413 });
});

test("remote database TLS cannot be disabled through connection parameters", () => {
  for (const query of ["sslmode=disable", "sslmode=no-verify", "ssl=false", "sslmode=require&uselibpqcompat=true", "sslrootcert=untrusted.pem"]) {
    const options = databaseConnectionOptions(`postgres://user:password@remote.example/db?${query}`, "CA");
    assert.deepEqual(options.ssl, { rejectUnauthorized: true, ca: "CA" });
    const params = new URL(options.connectionString).searchParams;
    assert.equal([...params].length, 0);
  }
  assert.deepEqual(databaseConnectionOptions("postgres://u:p@remote.example/db").ssl, { rejectUnauthorized: true });
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(databaseConnectionOptions(`postgres://u:p@${host}/db`).ssl, false);
  }
  assert.deepEqual(databaseConnectionOptions("postgres://u:p@localhost/db?host=remote.example").ssl, { rejectUnauthorized: true });
});

test("bcrypt limit counts UTF-8 bytes rather than characters", () => {
  assert.equal(fitsBcrypt("a".repeat(72)), true);
  assert.equal(fitsBcrypt("a".repeat(73)), false);
  assert.equal(fitsBcrypt("á".repeat(36)), true);
  assert.equal(fitsBcrypt("á".repeat(36) + "A"), false);
  assert.equal(fitsBcrypt("😀".repeat(18)), true);
  assert.equal(fitsBcrypt("😀".repeat(18) + "B"), false);
});
