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
  await findOwnedColumn(userId, columnId);
  const data = await parseBody(request, taskCreateSchema);
  assertAssignable(userId, data.assigneeId);
  const createdAt = new Date();
  if (!isValidTaskEndDate(data.endDate, createdAt)) {
    throw new HttpError(422, "Datos inválidos", { endDate: TASK_END_DATE_ERROR });
  }

  const { tags, ...fields } = data;
  const last = await db.task.findFirst({
    where: { columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const task = await db.task.create({
    data: {
      ...fields,
      createdAt,
      endDate: fields.endDate ? new Date(fields.endDate) : null,
      tags: { create: tags.map((tag, position) => ({ ...tag, position })) },
      columnId,
      authorId: userId,
      position: (last?.position ?? -1) + 1,
    },
    include: taskInclude,
  });

  return Response.json({ task: toTask(task) }, { status: 201 });
});
