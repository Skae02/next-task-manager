import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifySession,
  type SessionPayload,
} from "@/lib/auth/session";
import type { ApiError } from "@/lib/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
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
      return await fn(request, ctx);
    } catch (error) {
      if (error instanceof HttpError) {
        const body: ApiError = { error: error.message, fields: error.fields };
        return Response.json(body, { status: error.status });
      }
      console.error(error);
      return Response.json(
        { error: "Error interno del servidor" } satisfies ApiError,
        { status: 500 },
      );
    }
  };
}

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "El cuerpo de la petición no es JSON válido");
  }
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
  return verifySession(token);
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

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
