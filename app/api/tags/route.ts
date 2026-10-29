import { db } from "@/lib/db";
import { handler, requireUserId } from "@/lib/api";
import { connection } from "next/server";

/** Suggestions come only from tags on the current user's tasks. */
const suggestions = handler(async (request) => {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 30);
  const userId = await requireUserId();
  const tags = await db.taskTag.groupBy({
    by: ["label", "color"],
    where: {
      task: { column: { table: { ownerId: userId } } },
      label: { contains: query, mode: "insensitive" },
    },
    orderBy: [{ label: "asc" }, { color: "asc" }],
    ...(params.get("all") === "1" ? {} : { take: 20 }),
  });
  return Response.json({ tags }, { headers: { "Cache-Control": "private, no-store" } });
});

export async function GET(request: Request) {
  await connection();
  return suggestions(request, undefined);
}
