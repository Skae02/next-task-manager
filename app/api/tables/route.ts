import { db } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
import { tableCreateSchema } from "@/lib/validation";
import { toTableBase } from "@/lib/serializers";
import type { TableSummary } from "@/lib/types";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const tables = await db.table.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: {
      columns: { select: { _count: { select: { tasks: true } } } },
    },
  });

  const result: TableSummary[] = tables.map((table) => ({
    ...toTableBase(table),
    columnCount: table.columns.length,
    taskCount: table.columns.reduce((sum, column) => sum + column._count.tasks, 0),
  }));
  return Response.json({ tables: result });
});

export const POST = handler(async (request) => {
  const userId = await requireUserId();
  const data = await parseBody(request, tableCreateSchema);
  const table = await db.table.create({ data: { ...data, ownerId: userId } });
  const result: TableSummary = { ...toTableBase(table), columnCount: 0, taskCount: 0 };
  return Response.json({ table: result }, { status: 201 });
});
