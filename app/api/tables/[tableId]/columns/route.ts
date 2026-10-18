import { db } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { findOwnedTable } from "@/lib/ownership";
import { columnCreateSchema } from "@/lib/validation";
import { toColumn } from "@/lib/serializers";

type Ctx = RouteContext<"/api/tables/[tableId]/columns">;

export const POST = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { tableId } = await params;
  await findOwnedTable(userId, tableId);
  const data = await parseBody(request, columnCreateSchema);

  const last = await db.column.findFirst({
    where: { tableId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const column = await db.column.create({
    data: { ...data, tableId, position: (last?.position ?? -1) + 1 },
  });

  return Response.json({ column: toColumn(column) }, { status: 201 });
});
