import { setCompletionColumn } from "@/lib/task-completion";
import { db } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { findOwnedColumn } from "@/lib/ownership";
import { columnUpdateSchema } from "@/lib/validation";
import { taskInclude, taskOrder, toColumn } from "@/lib/serializers";

type Ctx = RouteContext<"/api/columns/[columnId]">;

const withTasks = {
  tasks: { orderBy: taskOrder, include: taskInclude },
} as const;

export const GET = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { columnId } = await params;
  await findOwnedColumn(userId, columnId);
  const column = await db.column.findUniqueOrThrow({
    where: { id: columnId },
    include: withTasks,
  });
  return Response.json({ column: toColumn(column) });
});

export const PATCH = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { columnId } = await params;
  const owned = await findOwnedColumn(userId, columnId);
  const data = await parseBody(request, columnUpdateSchema);

  const { isCompletion, ...fields } = data;
  const tableId = owned.tableId;
  const column = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "tables" WHERE id = ${tableId} FOR NO KEY UPDATE`;
    const table = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
    if (isCompletion === true) await setCompletionColumn(tx, tableId, columnId);
    else if (isCompletion === false && table.completionColumnId === columnId) {
      await setCompletionColumn(tx, tableId, null);
    }
    return tx.column.update({ where: { id: columnId }, data: fields, include: withTasks });
  });
  return Response.json({ column: toColumn(column) });
});

// Tasks in the column are removed by the database cascade.
export const DELETE = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { columnId } = await params;
  await findOwnedColumn(userId, columnId);
  await db.column.delete({ where: { id: columnId } });
  return new Response(null, { status: 204 });
});
