import { setCompletionColumn } from "@/lib/task-completion";
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

  const { isCompletion, ...fields } = data;
  const column = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "tables" WHERE id = ${tableId} FOR NO KEY UPDATE`;
    const last = await tx.column.findFirst({
      where: { tableId }, orderBy: { position: "desc" }, select: { position: true },
    });
    const created = await tx.column.create({
      data: { ...fields, tableId, position: (last?.position ?? -1) + 1 },
    });
    if (isCompletion) await setCompletionColumn(tx, tableId, created.id);
    return created;
  });

  return Response.json({ column: toColumn(column) }, { status: 201 });
});
