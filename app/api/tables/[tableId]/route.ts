import { db } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { findOwnedTable } from "@/lib/ownership";
import { tableUpdateSchema } from "@/lib/validation";
import { taskInclude, taskOrder, toColumn, toTableBase } from "@/lib/serializers";
import type { TableDetail } from "@/lib/types";

type Ctx = RouteContext<"/api/tables/[tableId]">;

export const GET = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { tableId } = await params;
  await findOwnedTable(userId, tableId);

  const table = await db.table.findUniqueOrThrow({
    where: { id: tableId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { tasks: { orderBy: taskOrder, include: taskInclude } },
      },
    },
  });

  const result: TableDetail = { ...toTableBase(table), columns: table.columns.map(toColumn) };
  return Response.json({ table: result });
});

export const PATCH = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { tableId } = await params;
  await findOwnedTable(userId, tableId);
  const data = await parseBody(request, tableUpdateSchema);

  const table = await db.table.update({ where: { id: tableId }, data });
  return Response.json({ table: toTableBase(table) });
});

// Columns and tasks are removed by the database cascade.
export const DELETE = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { tableId } = await params;
  await findOwnedTable(userId, tableId);
  await db.table.delete({ where: { id: tableId } });
  return new Response(null, { status: 204 });
});
