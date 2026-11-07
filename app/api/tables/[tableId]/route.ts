import { setCompletionColumn } from "@/lib/task-completion";
import { db } from "@/lib/db";
import { HttpError, handler, parseBody, requireUserId } from "@/lib/api";
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

  const table = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "tables" WHERE id = ${tableId} FOR NO KEY UPDATE`;
    const current = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
    if (data.completionColumnId !== undefined && data.completionColumnId !== current.completionColumnId) {
      if (data.completionColumnId) {
        const target = await tx.column.findFirst({ where: { id: data.completionColumnId, tableId } });
        if (!target) throw new HttpError(422, "Datos inválidos", { completionColumnId: "Selecciona una columna de este tablero" });
      }
      await setCompletionColumn(tx, tableId, data.completionColumnId);
    }
    return tx.table.update({ where: { id: tableId }, data });
  });
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
