import "server-only";
import bcrypt from "bcryptjs";
import { fitsBcrypt } from "@/lib/security/password";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  if (!fitsBcrypt(password)) throw new Error("Password exceeds bcrypt's 72-byte limit");
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  if (!fitsBcrypt(password)) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}
