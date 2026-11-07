import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";

const WINDOW_SECONDS = 15 * 60;

async function consume(bucket: string, limit: number) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET is not configured");
  const key = createHmac("sha256", secret).update(bucket).digest("hex");
  // Atomic UPSERT: concurrent requests and multiple servers share one counter.
  // Use the database clock and cap rejected counters to avoid integer overflow.
  const [row] = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "auth_rate_limits" ("key", "count", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${WINDOW_SECONDS} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "auth_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP
        THEN 1 ELSE LEAST("auth_rate_limits"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "auth_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + ${WINDOW_SECONDS} * INTERVAL '1 second'
        ELSE "auth_rate_limits"."expiresAt" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("expiresAt" - CURRENT_TIMESTAMP)))::int AS "retryAfter"
  `;
  if (row.count > limit) {
    throw new HttpError(429, "Demasiados intentos. Inténtalo más tarde.", undefined, Math.max(1, row.retryAfter));
  }
}

export async function limitAuthTraffic(request: Request, action: "login" | "register") {
  // Only configure this header if the ingress overwrites it, never appends or
  // passes through caller input. Without a trusted ingress, use a global cap.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  const value = header ? request.headers.get(header)?.trim() : undefined;
  if (header && (!value || !isIP(value))) {
    throw new HttpError(503, "No se pudo verificar el origen de la conexión");
  }
  const source = value && isIP(value) === 6 ? new URL(`http://[${value}]`).hostname : value;
  await consume(`${action}:source:${source ?? "global"}`, action === "login" ? 100 : 20);
  // Source cap runs first, bounding cleanup work and new account buckets.
  await db.authRateLimit.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

export async function limitLoginAccount(email: string) {
  await consume(`login:account:${email}`, 10);
}
