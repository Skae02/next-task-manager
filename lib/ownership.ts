import "server-only";
import { db } from "@/lib/db";
import { HttpError, notFound } from "@/lib/api";

// Every lookup is scoped to the owner, so another user's ids behave exactly
// like ids that don't exist (404) and never leak their existence.

export async function findOwnedTable(userId: string, tableId: string) {
  const table = await db.table.findFirst({
    where: { id: tableId, ownerId: userId },
  });
  if (!table) throw notFound("Tabla no encontrada");
  return table;
}

export async function findOwnedColumn(userId: string, columnId: string) {
  const column = await db.column.findFirst({
    where: { id: columnId, table: { ownerId: userId } },
  });
  if (!column) throw notFound("Columna no encontrada");
  return column;
}

export async function findOwnedTask(userId: string, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, column: { table: { ownerId: userId } } },
    include: { column: { select: { tableId: true } } },
  });
  if (!task) throw notFound("Tarea no encontrada");
  return task;
}

/** For now a task can only be assigned to its owner (or nobody). */
export function assertAssignable(userId: string, assigneeId: string | null | undefined) {
  if (assigneeId && assigneeId !== userId) {
    throw new HttpError(422, "Datos inválidos", {
      assigneeId: "Solo puedes asignarte tareas a ti mismo",
    });
  }
}
