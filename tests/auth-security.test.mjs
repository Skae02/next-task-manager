import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { SignJWT } from "jose";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));

// Run the actual server modules with request cookies and database persistence
// replaced, without requiring a running Next.js server or external database.
function fixture() {
  const sessions = new Map();
  const rateQueries = [];
  let rateResult = { count: 1, retryAfter: 900 };
  let cookie;
  const db = {
    authRateLimit: { async deleteMany() {} },
    async $queryRaw(strings, ...values) {
      rateQueries.push({ sql: strings.join("?"), values });
      return [rateResult];
    },
    session: {
      async findFirst({ where }) {
        const row = sessions.get(where.id);
        return row?.userId === where.userId && row.expiresAt > where.expiresAt.gt ? row : null;
      },
      async create({ data }) { sessions.set(data.id, data); },
      async deleteMany({ where }) {
        for (const [id, row] of sessions) {
          if (where.expiresAt ? row.expiresAt <= where.expiresAt.lte : id === where.id && row.userId === where.userId) sessions.delete(id);
        }
      },
    },
    async $transaction(fn) { return fn(db); },
  };
  const cookieStore = {
    get: () => cookie ? { value: cookie } : undefined,
    set: (_name, token) => { cookie = token; },
    delete: () => { cookie = undefined; },
  };
  const cache = new Map();
  function load(name) {
    const path = resolve(root, name);
    if (cache.has(path)) return cache.get(path);
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule.exports);
    const localRequire = (id) => {
      if (id === "server-only") return {};
      if (id === "next/headers") return { cookies: async () => cookieStore };
      if (id === "@/lib/db") return { db };
      if (id.startsWith("@/")) return load(`${id.slice(2)}.ts`);
      return require(id);
    };
    runInThisContext(`(function(require,module,exports){${output}\n})`, { filename: path })(localRequire, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return {
    sessions, load, rateQueries, setRateResult: (value) => { rateResult = value; },
    setCookie: (value) => { cookie = value; }, cookie: () => cookie,
  };
}

test("logout revokes a copied JWT and renewal invalidates the previous session", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-secret-".repeat(4);
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  const f = fixture();
  const api = f.load("lib/api.ts");
  const jwt = f.load("lib/auth/session.ts");
  await api.setSessionCookie({ userId: "alice", profileComplete: true });
  const copied = f.cookie();
  assert.equal((await api.getSession()).userId, "alice");
  await api.clearSessionCookie();
  assert.equal(f.sessions.size, 0);
  assert.ok(await jwt.verifySession(copied)); // Signature alone still passes.
  f.setCookie(copied);
  assert.equal(await api.getSession(), null); // API also checks revocation.

  f.setCookie(undefined);
  await api.setSessionCookie({ userId: "alice", profileComplete: false });
  const beforeRenewal = f.cookie();
  await api.setSessionCookie({ userId: "alice", profileComplete: true });
  assert.equal(f.sessions.size, 1);
  assert.equal((await api.getSession()).profileComplete, true);
  f.setCookie(beforeRenewal);
  assert.equal(await api.getSession(), null);
});

test("expired, missing, wrong-owner and old-format sessions cannot authorize an API request", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-secret-".repeat(4);
  t.after(() => { if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret; });
  const f = fixture();
  const api = f.load("lib/api.ts");
  const jwt = f.load("lib/auth/session.ts");
  await api.setSessionCookie({ userId: "alice", profileComplete: true });
  const payload = await jwt.verifySession(f.cookie());
  f.sessions.get(payload.sessionId).userId = "bob";
  await assert.rejects(api.requireUserId(), { status: 401 });
  f.sessions.get(payload.sessionId).userId = "alice";
  f.sessions.get(payload.sessionId).expiresAt = new Date(0);
  await assert.rejects(api.requireUserId(), { status: 401 });
  const old = await new SignJWT({ pc: true }).setProtectedHeader({ alg: "HS256" })
    .setSubject("alice").setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  assert.equal(await jwt.verifySession(old), null);
  assert.equal(await jwt.verifySession(`${f.cookie()}x`), null);
});

test("password validation rejects the reproduced multibyte bcrypt collision", async () => {
  const f = fixture();
  const { credentialsSchema, loginSchema } = f.load("lib/validation.ts");
  const { hashPassword, verifyPassword } = f.load("lib/auth/password.ts");
  const truncated = "á".repeat(36);
  const hash = await hashPassword(truncated);
  for (const password of [truncated + "A", truncated + "B"]) {
    const credentials = { email: "test@example.com", password };
    assert.equal(credentialsSchema.safeParse(credentials).success, false);
    assert.equal(loginSchema.safeParse(credentials).success, false);
    assert.equal(await verifyPassword(password, hash), false);
    assert.throws(() => hashPassword(password));
  }
  assert.equal(await verifyPassword(truncated, hash), true);
});

test("rate limits reject exhausted counters and ignore untrusted client IP headers", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const previousHeader = process.env.TRUSTED_CLIENT_IP_HEADER;
  process.env.JWT_SECRET = "test-only-secret-".repeat(4);
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    if (previousHeader === undefined) delete process.env.TRUSTED_CLIENT_IP_HEADER; else process.env.TRUSTED_CLIENT_IP_HEADER = previousHeader;
  });
  const f = fixture();
  const { limitAuthTraffic, limitLoginAccount } = f.load("lib/auth/rate-limit.ts");
  const request = (headers) => new Request("https://tasks.example/api/auth/login", { method: "POST", headers });
  await limitAuthTraffic(request({ "x-forwarded-for": "1.2.3.4" }), "login");
  await limitAuthTraffic(request({ "x-forwarded-for": "9.8.7.6" }), "login");
  assert.equal(f.rateQueries[0].values[0], f.rateQueries[1].values[0]);
  f.setRateResult({ count: 101, retryAfter: 37 });
  await assert.rejects(limitAuthTraffic(request({}), "login"), { status: 429, retryAfter: 37 });
  f.setRateResult({ count: 11, retryAfter: 29 });
  await assert.rejects(limitLoginAccount("alice@example.com"), { status: 429, retryAfter: 29 });
  assert.match(f.rateQueries.at(-1).values[0], /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(f.rateQueries).includes("alice@example.com"));
  process.env.TRUSTED_CLIENT_IP_HEADER = "x-client-ip";
  await assert.rejects(limitAuthTraffic(request({}), "login"), { status: 503 });
  await assert.rejects(limitAuthTraffic(request({ "x-client-ip": "1.2.3.4, 5.6.7.8" }), "login"), { status: 503 });
  f.setRateResult({ count: 1, retryAfter: 900 });
  await limitAuthTraffic(request({ "x-client-ip": "2001:db8::1" }), "login");
  await limitAuthTraffic(request({ "x-client-ip": "2001:0db8:0000:0000:0000:0000:0000:0001" }), "login");
  assert.equal(f.rateQueries.at(-1).values[0], f.rateQueries.at(-2).values[0]);
});
