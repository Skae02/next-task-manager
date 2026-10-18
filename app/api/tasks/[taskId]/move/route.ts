import { db } from "@/lib/db";
import { HttpError, handler, notFound, parseBody, requireUserId } from "@/lib/api";
import { findOwnedColumn, findOwnedTask } from "@/lib/ownership";
import { taskMoveSchema } from "@/lib/validation";
import { taskInclude, taskOrder, toTask } from "@/lib/serializers";

type Ctx = RouteContext<"/api/tasks/[taskId]/move">;

/**
 * Drag and drop. Moves the task to `index` within `columnId` (same or another
 * column of the same table) and renumbers the affected columns as 0..n-1.
 *
 * The request says where the task must end up, not where it comes from, so
 * overlapping moves of the same task simply apply in order: the last one wins.
 */
export const PATCH = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { taskId } = await params;
  const task = await findOwnedTask(userId, taskId);
  const { columnId, index } = await parseBody(request, taskMoveSchema);

  const tableId = task.column.tableId;
  const target = await findOwnedColumn(userId, columnId);
  if (target.tableId !== tableId) {
    throw new HttpError(422, "Datos inválidos", {
      columnId: "La columna destino debe pertenecer a la misma tabla",
    });
  }

  const order = await db.$transaction(async (tx) => {
    // One move at a time per table. NO KEY UPDATE still lets rows that
    // reference the table (new columns) be inserted meanwhile.
    await tx.$queryRaw`SELECT id FROM "tables" WHERE id = ${tableId} FOR NO KEY UPDATE`;

    // Read the current column under the lock: an earlier move may have just
    // changed it.
    const current = await tx.task.findUnique({ where: { id: taskId }, select: { columnId: true } });
    if (!current) throw notFound("Tarea no encontrada");
    const sourceId = current.columnId;

    const siblings = await tx.task.findMany({
      where: { columnId: { in: [sourceId, columnId] }, id: { not: taskId } },
      orderBy: taskOrder,
      select: { id: true, columnId: true },
    });
    const idsIn = (id: string) => siblings.filter((t) => t.columnId === id).map((t) => t.id);

    const targetIds = idsIn(columnId);
    targetIds.splice(Math.min(index, targetIds.length), 0, taskId);
    const result = new Map([[columnId, targetIds]]);
    if (sourceId !== columnId) {
      result.set(sourceId, idsIn(sourceId));
      await tx.task.update({ where: { id: taskId }, data: { columnId } });
    }

    for (const ids of result.values()) {
      await tx.$executeRaw`
        UPDATE "tasks" AS t
        SET "position" = (v.ord - 1)::int
        FROM unnest(${ids}::text[]) WITH ORDINALITY AS v(id, ord)
        WHERE t.id = v.id`;
    }
    return result;
  });

  const moved = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: taskInclude });
  return Response.json({
    task: toTask(moved),
    columns: [...order].map(([id, taskIds]) => ({ id, taskIds })),
  });
});
