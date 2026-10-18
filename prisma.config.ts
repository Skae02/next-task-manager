import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrations, introspection) needs a direct/session connection:
// Supabase's transaction pooler (DATABASE_URL, port 6543) can't run migrations.
// The app itself connects through DATABASE_URL, see lib/db.ts.
function cliUrl() {
  const raw = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
  if (!raw) return undefined;
  const url = new URL(raw);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLocal && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: cliUrl(),
  },
});
