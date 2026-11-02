import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConstructor?: typeof PrismaClient;
};

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

// Reuse connections only while the generated client is unchanged. A schema
// regeneration must not retain an instance that still knows the old fields.
const cachedClient = globalForPrisma.prisma;
const canReuseClient = globalForPrisma.prismaConstructor === PrismaClient;
export const db = cachedClient && canReuseClient ? cachedClient : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaConstructor = PrismaClient;
  if (cachedClient && cachedClient !== db) {
    void cachedClient.$disconnect().catch(console.error);
  }
}
