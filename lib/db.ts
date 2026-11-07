import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { databaseConnectionOptions } from "@/lib/security/database";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConstructor?: typeof PrismaClient;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaPg(databaseConnectionOptions(connectionString, process.env.DATABASE_CA_CERT));
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
