export class RequestSecurityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const MAX_JSON_BYTES = 64 * 1024;

export function assertTrustedMutation(request: Request, appOrigin?: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  const expected = new URL(appOrigin ?? request.url).origin;
  // Forwarded host headers must not decide which origins are trusted.
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin !== null && origin !== expected) ||
      (origin === null && request.headers.get("sec-fetch-site") !== "same-origin")) {
    throw new RequestSecurityError(403, "Origen de la petición no permitido");
  }
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") throw new RequestSecurityError(415, "Usa Content-Type: application/json");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_JSON_BYTES)) {
    throw new RequestSecurityError(413, "El cuerpo de la petición es demasiado grande");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestSecurityError(400, "El cuerpo de la petición no es JSON válido");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new RequestSecurityError(413, "El cuerpo de la petición es demasiado grande");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestSecurityError(400, "El cuerpo de la petición no es JSON válido");
  }
}
