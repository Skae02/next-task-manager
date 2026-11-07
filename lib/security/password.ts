export function fitsBcrypt(password: string) {
  return new TextEncoder().encode(password).byteLength <= 72;
}
