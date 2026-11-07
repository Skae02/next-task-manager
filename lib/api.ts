import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/session";
import type { ApiError } from "@/lib/types";
import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { assertTrustedMutation, readBoundedJson, RequestSecurityError } from "@/lib/security/request";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export const notFound = (message = "Recurso no encontrado") =>
  new HttpError(404, message);

/**
 * Wraps a route handler so thrown HttpErrors become JSON responses and
 * anything unexpected becomes a generic 500.
 */
export function handler<Ctx>(
  fn: (request: Request, ctx: Ctx) => Promise<Response>,
) {
  return async (request: Request, ctx: Ctx) => {
    try {
      assertTrustedMutation(request, process.env.APP_ORIGIN);
      const response = await fn(request, ctx);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof HttpError || error instanceof RequestSecurityError) {
        const body: ApiError = { error: error.message, fields: error instanceof HttpError ? error.fields : undefined };
        return Response.json(body, { status: error.status, headers: {
          "Cache-Control": "private, no-store",
          ...(error instanceof HttpError && error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}),
        } });
      }
      console.error(error);
      return Response.json(
        { error: "Error interno del servidor" } satisfies ApiError,
        { status: 500, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  const json = await readBoundedJson(request);
  const result = schema.safeParse(json);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    throw new HttpError(422, "Datos inválidos", fields);
  }
  return result.data;
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const stored = await db.session.findFirst({
    where: { id: session.sessionId, userId: session.userId, expiresAt: { gt: new Date() } },
  });
  return stored ? session : null;
}

/**
 * Returns the authenticated user's id. By default the user must also have
 * completed the second registration step.
 */
export async function requireUserId(
  { allowIncompleteProfile = false } = {},
): Promise<string> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "No autenticado");
  if (!allowIncompleteProfile && !session.profileComplete) {
    throw new HttpError(403, "Completa tu perfil para continuar");
  }
  return session.userId;
}

export async function setSessionCookie(payload: Omit<SessionPayload, "sessionId">) {
  const sessionId = randomUUID();
  const token = await signSession({ ...payload, sessionId });
  const previous = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  await db.$transaction(async (tx) => {
    if (previous) await tx.session.deleteMany({ where: { id: previous.sessionId, userId: previous.userId } });
    await tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await tx.session.create({ data: {
      id: sessionId, userId: payload.userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    } });
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) await db.session.deleteMany({ where: { id: session.sessionId, userId: session.userId } });
  (await cookies()).delete(SESSION_COOKIE);
}
