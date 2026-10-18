"use client";

import { useParams } from "next/navigation";
import { TaskEditor } from "@/components/board/task-editor";

export default function EditTaskPage() {
  const { tableId, taskId } = useParams<{ tableId: string; taskId: string }>();
  return <TaskEditor mode="edit" tableId={tableId} taskId={taskId} />;
}
