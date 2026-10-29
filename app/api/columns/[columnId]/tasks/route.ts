import { db } from "@/lib/db";
import { handler, parseBody, requireUserId } from "@/lib/api";
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

  const { tags, ...fields } = data;
  const last = await db.task.findFirst({
    where: { columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const task = await db.task.create({
    data: {
      ...fields,
      tags: { create: tags.map((tag, position) => ({ ...tag, position })) },
      columnId,
      authorId: userId,
      position: (last?.position ?? -1) + 1,
    },
    include: taskInclude,
  });

  return Response.json({ task: toTask(task) }, { status: 201 });
});
