import { db } from "@/lib/db";
import { HttpError, handler, parseBody, requireUserId } from "@/lib/api";
import { assertAssignable, findOwnedColumn, findOwnedTask } from "@/lib/ownership";
import { taskUpdateSchema } from "@/lib/validation";
import { taskInclude, toTask } from "@/lib/serializers";

type Ctx = RouteContext<"/api/tasks/[taskId]">;

export const GET = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { taskId } = await params;
  await findOwnedTask(userId, taskId);
  const task = await db.task.findUniqueOrThrow({
    where: { id: taskId },
    include: taskInclude,
  });
  return Response.json({ task: toTask(task) });
});

export const PATCH = handler(async (request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { taskId } = await params;
  const current = await findOwnedTask(userId, taskId);
  const data = await parseBody(request, taskUpdateSchema);
  assertAssignable(userId, data.assigneeId);

  // Moving a task: the target column must be ours and in the same table.
  if (data.columnId && data.columnId !== current.columnId) {
    const target = await findOwnedColumn(userId, data.columnId);
    if (target.tableId !== current.column.tableId) {
      throw new HttpError(422, "Datos inválidos", {
        columnId: "La columna destino debe pertenecer a la misma tabla",
      });
    }
  }

  // Changing the column from the editor sends the task to the end of it.
  // Drag and drop uses PATCH /api/tasks/:taskId/move instead.
  let position: number | undefined;
  if (data.columnId && data.columnId !== current.columnId) {
    const last = await db.task.findFirst({
      where: { columnId: data.columnId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    position = (last?.position ?? -1) + 1;
  }

  const { tags, ...fields } = data;
  const task = await db.task.update({
    where: { id: taskId },
    data: {
      ...fields,
      position,
      ...(tags !== undefined && { tags: { deleteMany: {}, create: tags.map((tag, position) => ({ ...tag, position })) } }),
    },
    include: taskInclude,
  });
  return Response.json({ task: toTask(task) });
});

export const DELETE = handler(async (_request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { taskId } = await params;
  await findOwnedTask(userId, taskId);
  await db.task.delete({ where: { id: taskId } });
  return new Response(null, { status: 204 });
});
