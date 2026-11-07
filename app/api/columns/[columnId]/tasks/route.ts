import { db } from "@/lib/db";
import { HttpError, handler, parseBody, requireUserId } from "@/lib/api";
import { isValidTaskEndDate, TASK_END_DATE_ERROR } from "@/lib/task-dates";
import { assertAssignable, findOwnedColumn } from "@/lib/ownership";
import { taskCreateSchema } from "@/lib/validation";
import { taskInclude, toTask } from "@/lib/serializers";

type Ctx = RouteContext<"/api/columns/[columnId]/tasks">;

export const POST = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { columnId } = await params;
  const column = await findOwnedColumn(userId, columnId);
  const data = await parseBody(request, taskCreateSchema);
  assertAssignable(userId, data.assigneeId);
  const createdAt = new Date();
  if (!isValidTaskEndDate(data.endDate, createdAt)) {
    throw new HttpError(422, "Datos inválidos", { endDate: TASK_END_DATE_ERROR });
  }

  const { tags, ...fields } = data;
  const task = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "tables" WHERE id = ${column.tableId} FOR NO KEY UPDATE`;
    const table = await tx.table.findUniqueOrThrow({ where: { id: column.tableId } });
    const last = await tx.task.findFirst({
      where: { columnId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    return tx.task.create({
      data: {
        ...fields,
        createdAt,
        completedAt: table.completionColumnId === columnId ? new Date() : null,
        endDate: fields.endDate ? new Date(fields.endDate) : null,
        tags: { create: tags.map((tag, position) => ({ ...tag, position })) },
        columnId,
        authorId: userId,
        position: (last?.position ?? -1) + 1,
      },
      include: taskInclude,
    });

  });
  return Response.json({ task: toTask(task) }, { status: 201 });
});
