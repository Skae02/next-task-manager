import type { Prisma } from "@/lib/generated/prisma/client";

/** Caller must hold the table row lock before changing its completion column. */
export async function setCompletionColumn(tx: Prisma.TransactionClient, tableId: string, columnId: string | null) {
  const table = await tx.table.findUniqueOrThrow({ where: { id: tableId } });
  if (table.completionColumnId === columnId) return;
  const now = new Date();
  if (table.completionColumnId) await tx.task.updateMany({
    where: { columnId: table.completionColumnId }, data: { completedAt: null, updatedAt: now },
  });
  if (columnId) await tx.task.updateMany({
    where: { columnId }, data: { completedAt: now, updatedAt: now },
  });
  await tx.table.update({ where: { id: tableId }, data: { completionColumnId: columnId } });
}
