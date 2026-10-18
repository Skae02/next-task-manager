import type { ApiError } from "@/lib/types";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Typed JSON fetch against our own API. Throws ApiRequestError on non-2xx. */
export async function api<T = void>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });

  if (response.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth")) {
    window.location.assign(new URL("/login", window.location.origin));
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      response.status,
      data?.error ?? "Algo salió mal",
      data?.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
