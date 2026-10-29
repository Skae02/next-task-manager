import { connection } from "next/server";
import { db } from "@/lib/db";
import { handler, requireUserId } from "@/lib/api";

const list = handler(async () => {
  await requireUserId();
  const priorities = await db.priority.findMany({ orderBy: { position: "asc" } });
  return Response.json({ priorities }, { headers: { "Cache-Control": "private, no-store" } });
});

export async function GET(request: Request) {
  await connection();
  return list(request, undefined);
}
