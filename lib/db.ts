import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1"];

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Remote databases (Supabase) get an encrypted connection. Certificate
  // verification needs the provider's CA, which can be supplied through
  // DATABASE_CA_CERT (PEM contents); without it the link is still encrypted.
  const isLocal = LOCAL_HOSTS.includes(new URL(connectionString).hostname);
  const ca = process.env.DATABASE_CA_CERT;
  const ssl = isLocal ? undefined : ca ? { ca } : { rejectUnauthorized: false };

  const adapter = new PrismaPg({ connectionString, ssl });
  return new PrismaClient({ adapter });
}

// Reuse the client across hot reloads in development.
export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
